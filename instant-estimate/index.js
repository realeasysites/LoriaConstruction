// Instant Estimate — drop-in module for Real Easy Sites (TBLC template).
//
// In the site's server.js:
//   require('./instant-estimate')(app, {
//     business: { name: 'Loria Construction', phone: '(207) 555-0100', color: '#1f2937' },
//     requireAdmin,          // your existing admin-login middleware (recommended)
//     sendMail,              // optional: your existing mail function ({to,subject,html,text,replyTo})
//     db                     // optional: your existing better-sqlite3 instance
//   });
const path = require('path');
const express = require('express');
const { createStore } = require('./lib/store');
const { createMailer } = require('./lib/mailer');

// Fallback admin guard (HTTP Basic auth) if the site doesn't pass its own.
function basicAuth(req, res, next) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(503).send('Set ADMIN_PASSWORD (or pass requireAdmin) to use the estimates dashboard.');
  const hdr = req.headers.authorization || '';
  const [scheme, b64] = hdr.split(' ');
  if (scheme === 'Basic' && b64) {
    const [, pass] = Buffer.from(b64, 'base64').toString().split(/:(.*)/s);
    if (pass === pw) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Estimates"');
  res.status(401).send('Login required');
}

module.exports = function mountInstantEstimate(app, opts = {}) {
  const siteUrl = (opts.siteUrl || process.env.SITE_URL || '').replace(/\/$/, '');
  const b = opts.business || {};
  const biz = {
    name: b.name || process.env.BUSINESS_NAME || 'Our Team',
    phone: b.phone || process.env.BUSINESS_PHONE || '',
    email: b.email || process.env.BUSINESS_EMAIL || '',
    color: b.color || '#1f2937',
    notifyEmail: b.notifyEmail || process.env.NOTIFY_EMAIL || ''
  };
  const ctx = {
    store: createStore(opts.db),
    mailer: createMailer(opts),
    biz,
    requireAdmin: opts.requireAdmin || basicAuth,
    maxPerHour: opts.maxPerHour,
    urls: {
      page: siteUrl + (opts.pagePath || '/instant-estimate/'),
      admin: siteUrl + '/admin/estimates'
    }
  };

  const json = express.json({ limit: '20kb' });
  app.use('/api/instant-estimate', json);
  app.use('/admin/api', json);
  app.use('/instant-estimate', express.static(path.join(__dirname, 'public')));

  require('./routes/public')(app, ctx);
  require('./routes/admin')(app, ctx);

  if (!ctx.mailer.configured) console.warn('[instant-estimate] SMTP_USER/SMTP_PASS not set — estimates save, but no emails will send.');
  if (!biz.notifyEmail) console.warn('[instant-estimate] NOTIFY_EMAIL not set — contractor will not get lead emails.');
  return ctx;
};
