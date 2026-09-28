// Email sending for Instant Estimate.
// Uses the site's existing sendMail function if one is passed in; otherwise
// builds its own nodemailer transport from the same env vars the template uses.
//
//   SMTP_USER / SMTP_PASS      Gmail address + App Password (default: Gmail)
//   SMTP_HOST / SMTP_PORT      optional, for Resend/Postmark/other SMTP
//   MAIL_FROM                  optional "From" (defaults to SMTP_USER)
//   NOTIFY_EMAIL               where the contractor's lead alerts go

function createMailer(opts = {}) {
  if (typeof opts.sendMail === 'function') return { send: opts.sendMail, configured: true };

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return {
      configured: false,
      send: async (msg) => {
        console.warn(`[instant-estimate] SMTP not configured — email to ${msg.to} NOT sent: "${msg.subject}"`);
        return { skipped: true };
      }
    };
  }

  const nodemailer = require('nodemailer');
  const transport = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user, pass }
      })
    : nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });

  const from = process.env.MAIL_FROM || user;
  return {
    configured: true,
    send: (msg) => transport.sendMail(Object.assign({ from }, msg))
  };
}

module.exports = { createMailer };
