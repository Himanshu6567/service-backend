const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_FROM,
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure:
        String(process.env.SMTP_SECURE).toLowerCase() === "true" ||
        smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

async function sendHtmlMail({ to, subject, html }) {
  if (!transporter) {
    throw new Error(
      "Email delivery is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM to Server/.env.",
    );
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

module.exports = { sendHtmlMail, smtpConfigured };
