'use strict';

const nodemailer = require('nodemailer');

let transport = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Shared send function. Also handed to the Instant Estimate module so the
 * whole site uses ONE SMTP setup. Resolves { skipped: true } when SMTP isn't configured.
 */
async function sendMail(msg) {
  if (!transport) {
    console.log(`[mailer] SMTP not configured — not sent: "${msg.subject}" → ${msg.to}`);
    return { skipped: true };
  }
  return transport.sendMail(Object.assign({ from: process.env.MAIL_FROM || process.env.SMTP_USER }, msg));
}

/** Email the owner about a new contact-form message. Never throws. */
async function notifyNewLead(lead) {
  const to = process.env.NOTIFY_EMAIL;
  const subject = `New website message: ${lead.name}${lead.service ? ' — ' + lead.service : ''}${lead.town ? ' (' + lead.town + ')' : ''}`;
  const row = (k, v) => `<tr><td style="color:#666;width:32%"><b>${k}</b></td><td>${v}</td></tr>`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px">
      <div style="background:#0f2a4a;color:#fff;padding:16px 20px;font-weight:bold;font-size:18px">Loria Construction · New message</div>
      <div style="padding:18px 20px;border:1px solid #e5e5e5;border-top:0">
        <table cellpadding="6" style="border-collapse:collapse;width:100%">
          ${row('Name', esc(lead.name))}
          ${row('Phone', `<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>`)}
          ${row('Email', lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : '—')}
          ${row('Town', esc(lead.town || '—'))}
          ${row('Project', esc(lead.service || '—'))}
          ${row('Timeline', esc(lead.timeline || '—'))}
        </table>
        ${lead.message ? `<h3 style="margin:18px 0 6px">Message</h3><p style="white-space:pre-wrap">${esc(lead.message)}</p>` : ''}
        ${process.env.SITE_URL ? `<p style="margin-top:22px"><a href="${esc(process.env.SITE_URL)}/admin">Open lead dashboard →</a></p>` : ''}
      </div>
    </div>`;

  if (!to) { console.log(`[mailer] NOTIFY_EMAIL not set — lead #${lead.id} saved to dashboard only.`); return; }
  try {
    await sendMail({ to, replyTo: lead.email || undefined, subject, html });
  } catch (err) {
    console.error('[mailer] Failed to send lead notification:', err.message);
  }
}

module.exports = { notifyNewLead, sendMail };
