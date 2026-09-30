const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("../Models/UserModel");
const ServiceProvider = require("../Models/ServiceProviderModel");
const SignupOtp = require("../Models/SignupOtpModel");
const { sendHtmlMail, getMailConfiguration } = require("../services/mailer");

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const OTP_RESEND_WAIT_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function hashOtp(email, otp) {
  return crypto
    .createHmac("sha256", process.env.jwt_secretKay)
    .update(`${email}:${otp}`)
    .digest("hex");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");
  return domain ? `${name.slice(0, 1)}***@${domain}` : "<invalid-email>";
}

function logOtp(event, details = {}) {
  console.info(`[otp] ${event}`, JSON.stringify(details));
}

async function createSignupOtpChallenge(req) {
  const { name, email: submittedEmail, mobile, password, role } = req.body || {};
  const email = String(submittedEmail || "")
    .trim()
    .toLowerCase();
  const emailForLog = maskEmail(email);
  const requestId = req.get("x-request-id") || "not-provided";

  if (!name?.trim() || !email || !mobile || !password || !role) {
    return { status: 400, body: { msg: "Signup details are incomplete" } };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 400, body: { msg: "Enter a valid email address" } };
  }
  if (!/^(user|serviceProvider)$/.test(role)) {
    return { status: 400, body: { msg: "Choose a valid account type" } };
  }
  if (String(password).length < 8) {
    return {
      status: 400,
      body: { msg: "Password must be at least 8 characters" },
    };
  }
  if (!process.env.jwt_secretKay) {
    return { status: 503, body: { msg: "OTP security is not configured" } };
  }

  logOtp("checking_existing_account", { requestId, email: emailForLog });
  const accountCheckStartedAt = Date.now();
  const existingAccount = await Promise.all([
    User.exists({ email }),
    ServiceProvider.exists({ email }),
  ]);
  logOtp("existing_account_check_complete", {
    requestId,
    accountExists: existingAccount.some(Boolean),
    durationMs: Date.now() - accountCheckStartedAt,
  });
  if (existingAccount.some(Boolean)) {
    return {
      status: 409,
      body: { msg: "An account with this email already exists" },
    };
  }

  const challengeLookupStartedAt = Date.now();
  const previous = await SignupOtp.findOne({ email });
  logOtp("challenge_lookup_complete", {
    requestId,
    challengeExists: Boolean(previous),
    durationMs: Date.now() - challengeLookupStartedAt,
  });
  if (previous && Date.now() - previous.lastSentAt.getTime() < OTP_RESEND_WAIT_MS) {
    return {
      status: 429,
      body: { msg: "Wait one minute before requesting another code" },
    };
  }

  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  await SignupOtp.findOneAndUpdate(
    { email },
    {
      email,
      role,
      name: name.trim(),
      mobile: String(mobile).trim(),
      passwordHash,
      otpHash: hashOtp(email, otp),
      expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
      lastSentAt: now,
      attempts: 0,
      verifiedAt: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  logOtp("challenge_saved", { requestId, email: emailForLog });
  return { status: 200, email, otp, expiresIn: 600 };
}

async function sendOtpEmail(email, otp) {
  await sendHtmlMail({
    to: email,
    subject: "Your UrbanAssist verification code",
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#17211d"><h2>Verify your UrbanAssist account</h2><p>Use this one-time code to finish signing up:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#123f35">${otp}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
  });
}

const handleSendSignupOtp = async (req, res) => {
  const startedAt = Date.now();
  const requestId = req.get("x-request-id") || "not-provided";
  let emailForLog = maskEmail(req.body?.email);
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    emailForLog = maskEmail(email);
    logOtp("request_received", {
      requestId,
      email: emailForLog,
      role: req.body?.role,
      mail: getMailConfiguration(),
    });
    const challenge = await createSignupOtpChallenge(req);
    if (challenge.status !== 200) {
      logOtp("request_rejected", {
        requestId,
        reason: challenge.body.msg,
      });
      return res.status(challenge.status).json(challenge.body);
    }

    try {
      await sendOtpEmail(challenge.email, challenge.otp);
    } catch (emailError) {
      await SignupOtp.deleteOne({ email: challenge.email });
      console.error(
        "[otp] delivery_failed",
        JSON.stringify({
          requestId,
          email: emailForLog,
          code: emailError.code,
          status: emailError.status,
          error: emailError.message,
          durationMs: Date.now() - startedAt,
        }),
      );
      return res.status(503).json({
        msg: "The verification email could not be delivered. Please try again later.",
        requestId,
      });
    }

    logOtp("request_succeeded", {
      requestId,
      email: emailForLog,
      durationMs: Date.now() - startedAt,
    });
    return res
      .status(200)
      .json({ msg: "Verification code sent", expiresIn: challenge.expiresIn });
  } catch (error) {
    console.error(
      "[otp] request_failed",
      JSON.stringify({
        requestId,
        email: emailForLog,
        name: error.name,
        code: error.code,
        error: error.message,
        stack: error.stack,
        durationMs: Date.now() - startedAt,
      }),
    );
    return res.status(500).json({
      msg: "Unable to send verification code. Please try again later.",
      requestId,
    });
  }
};

const handleVerifySignupOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const otp = String(req.body?.otp || "").trim();
    if (!email || !/^\d{6}$/.test(otp)) {
      return res
        .status(400)
        .json({ msg: "Enter the six-digit verification code" });
    }

    const challenge = await SignupOtp.findOne({ email });
    if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
      if (challenge) await SignupOtp.deleteOne({ _id: challenge._id });
      return res.status(400).json({ msg: "Code expired. Request a new code" });
    }
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      await SignupOtp.deleteOne({ _id: challenge._id });
      return res
        .status(429)
        .json({ msg: "Too many attempts. Request a new code" });
    }

    const matches = safeEqual(hashOtp(email, otp), challenge.otpHash);
    if (!matches) {
      challenge.attempts += 1;
      await challenge.save();
      return res.status(400).json({ msg: "Incorrect verification code" });
    }

    if (challenge.role === "user") {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        await SignupOtp.deleteOne({ _id: challenge._id });
        return res
          .status(409)
          .json({ msg: "An account with this email already exists" });
      }
      const user = await User.create({
        name: challenge.name,
        email,
        mobile: challenge.mobile,
        password: challenge.passwordHash,
        role: "user",
      });
      await SignupOtp.deleteOne({ _id: challenge._id });
      return res
        .status(201)
        .json({
          msg: "Email verified and account created",
          id: user._id,
          role: "user",
        });
    }

    challenge.verifiedAt = new Date();
    challenge.attempts = 0;
    await challenge.save();
    return res
      .status(200)
      .json({ msg: "Email verified", role: "serviceProvider" });
  } catch (error) {
    console.error("Unable to verify signup OTP");
    return res.status(500).json({ msg: "Unable to verify code" });
  }
};

module.exports = {
  handleSendSignupOtp,
  handleVerifySignupOtp,
};
