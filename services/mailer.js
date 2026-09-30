const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure =
  String(process.env.SMTP_SECURE).toLowerCase() === "true" || smtpPort === 465;
const smtpConfigured = Boolean(
  process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM,
);
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoFromEmail = process.env.BREVO_FROM_EMAIL;
const brevoFromName = process.env.BREVO_FROM_NAME || "UrbanAssist";
const brevoConfigured = Boolean(brevoApiKey && brevoFromEmail);
const mailProvider = brevoApiKey ? "brevo" : smtpConfigured ? "smtp" : "unconfigured";
const mailConfigured = mailProvider === "brevo" ? brevoConfigured : smtpConfigured;

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    })
  : null;

function getMailConfiguration() {
  return {
    provider: mailProvider,
    mailConfigured,
    smtpConfigured,
    smtpHost: process.env.SMTP_HOST || null,
    smtpPort,
    smtpSecure,
    smtpFromConfigured: Boolean(process.env.SMTP_FROM),
    brevoApiKeyConfigured: Boolean(brevoApiKey),
    brevoFromConfigured: Boolean(brevoFromEmail),
    nodeEnv: process.env.NODE_ENV || "development",
    renderFlag: process.env.RENDER || null,
    renderServiceIdConfigured: Boolean(process.env.RENDER_SERVICE_ID),
  };
}

function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");
  return domain ? `${name.slice(0, 1)}***@${domain}` : "<invalid-email>";
}

console.info("[mailer] configuration", JSON.stringify(getMailConfiguration()));
if (
  process.env.NODE_ENV === "production" &&
  mailProvider === "smtp" &&
  [25, 465, 587].includes(smtpPort)
) {
  console.warn(
    `[mailer] SMTP is set to port ${smtpPort}. Render Free blocks outbound SMTP on ports 25, 465, and 587; configure BREVO_API_KEY to use the HTTPS mail API instead.`,
  );
}

async function sendWithBrevo({ to, subject, html, startedAt, recipient }) {
  if (!brevoConfigured) {
    throw new Error(
      "Brevo is selected but not configured. Set BREVO_API_KEY and BREVO_FROM_EMAIL (a verified Brevo sender).",
    );
  }

  console.info(
    "[mailer] Brevo delivery started",
    JSON.stringify({ recipient, subject }),
  );

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: { name: brevoFromName, email: brevoFromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        result.message || `Brevo API returned HTTP ${response.status}`,
      );
      error.status = response.status;
      error.code = result.code;
      throw error;
    }

    console.info(
      "[mailer] Brevo delivery accepted",
      JSON.stringify({
        recipient,
        messageId: result.messageId || null,
        durationMs: Date.now() - startedAt,
      }),
    );
    return result;
  } catch (error) {
    console.error(
      "[mailer] Brevo delivery failed",
      JSON.stringify({
        recipient,
        status: error.status,
        code: error.code,
        error: error.message,
        durationMs: Date.now() - startedAt,
      }),
    );
    throw error;
  }
}

async function sendWithSmtp({ to, subject, html, startedAt, recipient }) {
  if (!transporter) {
    throw new Error(
      "Email is not configured. Set BREVO_API_KEY and BREVO_FROM_EMAIL, or configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.",
    );
  }

  console.info(
    "[mailer] SMTP delivery started",
    JSON.stringify({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      recipient,
      subject,
    }),
  );

  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });
    console.info(
      "[mailer] SMTP delivery accepted",
      JSON.stringify({
        recipient,
        messageId: result.messageId,
        acceptedCount: result.accepted?.length || 0,
        rejectedCount: result.rejected?.length || 0,
        durationMs: Date.now() - startedAt,
      }),
    );
    return result;
  } catch (error) {
    console.error(
      "[mailer] SMTP delivery failed",
      JSON.stringify({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        recipient,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        error: error.message,
        durationMs: Date.now() - startedAt,
      }),
    );
    throw error;
  }
}

async function sendHtmlMail({ to, subject, html }) {
  const startedAt = Date.now();
  const recipient = maskEmail(to);

  if (!mailConfigured) {
    const error = new Error(
      "Email is not configured. Set BREVO_API_KEY and BREVO_FROM_EMAIL, or configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.",
    );
    console.error(
      "[mailer] delivery unavailable",
      JSON.stringify({ recipient, provider: mailProvider, error: error.message }),
    );
    throw error;
  }

  if (mailProvider === "brevo") {
    return sendWithBrevo({ to, subject, html, startedAt, recipient });
  }
  return sendWithSmtp({ to, subject, html, startedAt, recipient });
}

module.exports = { sendHtmlMail, mailConfigured, smtpConfigured, getMailConfiguration };
