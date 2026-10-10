'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');

const { db } = require('./db');
const { sendMail } = require('./lib/mailer');
const { requireAdminPage, requireAdmin, isAuthed } = require('./lib/auth');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const mountInstantEstimate = require('./instant-estimate');
const mountSiteAnalytics = require('./site-analytics');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Online estimates run through CreteQuote (embedded via public/crete-quote.html).
// The built-in Instant Estimate module is kept but switched off. To use it instead,
// set INSTANT_ESTIMATE=on and put <div id="instant-estimate"></div> + ie.js back on the page.
if (process.env.INSTANT_ESTIMATE === 'on') {
  mountInstantEstimate(app, {
    business: { name: 'Loria Construction', phone: '(585) 727-8149', email: 'loriaconstruction585@gmail.com', color: '#0f2a4a' },
    db,
    sendMail,
    requireAdmin: requireAdminPage,
    pagePath: '/#estimate'
  });
}

// Website traffic: page views, visitors, sources and call/text taps, shown on the /admin dashboard.
mountSiteAnalytics(app, { db, isAuthed, requireAdmin, timezone: 'America/New_York' });

app.use('/api/admin', adminRoutes.api);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes.pages);

// Pages always revalidate so edits show right away; assets cache for 7 days
// (they're versioned with ?v=... in the HTML, so bump that when a file changes).
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'], maxAge: '7d', index: 'index.html',
  setHeaders: (res, filePath) => { if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); }
}));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(PORT, () => console.log(`Loria Construction site running on http://localhost:${PORT}`));
