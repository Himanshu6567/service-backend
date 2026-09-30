const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("../Models/UserModel");
const ServiceProvider = require("../Models/ServiceProviderModel");
const SignupOtp = require("../Models/SignupOtpModel");
const { sendHtmlMail } = require("../services/mailer");

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

async function sendOtpEmail(email, otp) {
  await sendHtmlMail({
    to: email,
    subject: "Your UrbanAssist verification code",
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#17211d"><h2>Verify your UrbanAssist account</h2><p>Use this one-time code to finish signing up:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#123f35">${otp}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
  });
}

const handleSendSignupOtp = async (req, res) => {
  try {
    const {
      name,
      email: submittedEmail,
      mobile,
      password,
      role,
    } = req.body || {};
    const email = String(submittedEmail || "")
      .trim()
      .toLowerCase();
    if (!name?.trim() || !email || !mobile || !password || !role) {
      return res.status(400).json({ msg: "Signup details are incomplete" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ msg: "Enter a valid email address" });
    }
    if (!/^(user|serviceProvider)$/.test(role)) {
      return res.status(400).json({ msg: "Choose a valid account type" });
    }
    if (String(password).length < 8) {
      return res
        .status(400)
        .json({ msg: "Password must be at least 8 characters" });
    }
    if (!process.env.jwt_secretKay) {
      return res.status(503).json({ msg: "OTP security is not configured" });
    }

    const existingAccount = await Promise.all([
      User.exists({ email }),
      ServiceProvider.exists({ email }),
    ]);
    if (existingAccount.some(Boolean)) {
      return res
        .status(409)
        .json({ msg: "An account with this email already exists" });
    }

    const previous = await SignupOtp.findOne({ email });
    if (
      previous &&
      Date.now() - previous.lastSentAt.getTime() < OTP_RESEND_WAIT_MS
    ) {
      return res
        .status(429)
        .json({ msg: "Wait one minute before requesting another code" });
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

    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      await SignupOtp.deleteOne({ email });
      console.error("Signup OTP email failed:", emailError.message);
      return res.status(503).json({ msg: emailError.message });
    }

    return res
      .status(200)
      .json({ msg: "Verification code sent", expiresIn: 600 });
  } catch (error) {
    console.error("Unable to send signup OTP", error);
    return res.status(500).json({ msg: "Unable to send verification code" });
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
    console.error("Unable to verify signup OTP", error);
    return res.status(500).json({ msg: "Unable to verify code" });
  }
};

module.exports = { handleSendSignupOtp, handleVerifySignupOtp };
