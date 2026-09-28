// Public (customer-facing) API for Instant Estimate.
const { validateAnswers, calculate } = require('../lib/pricing');
const emails = require('../lib/emails');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['Morning', 'Midday', 'Afternoon', 'Evening', 'Any time'];

// Simple in-memory throttle: max N estimates per IP per hour.
function makeThrottle(max) {
  const hits = new Map();
  return (ip) => {
    const now = Date.now(), hour = 3600e3;
    const arr = (hits.get(ip) || []).filter(t => now - t < hour);
    if (arr.length >= max) { hits.set(ip, arr); return false; }
    arr.push(now); hits.set(ip, arr);
    if (hits.size > 5000) hits.clear();
    return true;
  };
}

module.exports = function publicRoutes(app, ctx) {
  const { store, mailer, biz, urls } = ctx;
  const allow = makeThrottle(ctx.maxPerHour || 8);
  const clip = (s, n) => String(s == null ? '' : s).trim().slice(0, n);

  // Question options (labels only — rates stay server-side).
  app.get('/api/instant-estimate/config', (req, res) => {
    const r = store.getRates();
    res.json({
      business: { name: biz.name, phone: biz.phone },
      finishes: r.finishes.filter(f => f.enabled).map(({ key, label, desc }) => ({ key, label, desc })),
      access: r.access.map(({ key, label }) => ({ key, label })),
      slope: r.slope.map(({ key, label }) => ({ key, label })),
      budgets: r.budgets.map(({ key, label }) => ({ key, label })),
      timelines: r.timelines,
      minSqft: r.minSqft, maxSqft: r.maxSqft,
      disclaimer: r.disclaimer,
      days: DAYS, times: TIMES
    });
  });

  // Submit answers + contact → get the ballpark.
  app.post('/api/instant-estimate', async (req, res) => {
    const b = req.body || {};
    if (b.website) return res.json({ ok: true, low: 0, high: 0 }); // honeypot: bots fill hidden field
    if (!allow(req.ip || 'unknown')) return res.status(429).json({ ok: false, errors: ['Too many estimates from this connection — please call us instead.'] });

    const rates = store.getRates();
    const { ok, errors, clean } = validateAnswers(b, rates);
    const name = clip(b.name, 80), email = clip(b.email, 120).toLowerCase(), phone = clip(b.phone, 30), town = clip(b.town, 80);
    if (!name) errors.push('Please enter your name.');
    if (!EMAIL_RE.test(email)) errors.push('Please enter a valid email so we can send your estimate.');
    if (!ok || errors.length) return res.status(400).json({ ok: false, errors });

    const est = calculate(clean, rates);
    const { id, token } = store.insertEstimate({
      name, email, phone, town, answers: clean, low: est.low, high: est.high, breakdown: est, budgetGap: est.budgetGap
    });

    res.json({ ok: true, token, low: est.low, high: est.high, sqft: clean.sqft, disclaimer: rates.disclaimer, firstName: name.split(' ')[0] });

    // Emails go out after responding so the customer never waits on SMTP.
    const row = { name, email, phone, town };
    const [base, hash] = urls.page.split('#');
    const visitUrl = `${base}${base.includes('?') ? '&' : '?'}ie=${token}${hash ? '#' + hash : ''}`;
    const results = await Promise.allSettled([
      mailer.send(Object.assign({ to: email, replyTo: biz.email || undefined },
        emails.customerEstimate({ biz, rates, est, a: clean, name, visitUrl }))),
      biz.notifyEmail ? mailer.send(Object.assign({ to: biz.notifyEmail, replyTo: email },
        emails.contractorNewEstimate({ biz, rates, row, a: clean, est, adminUrl: urls.admin }))) : Promise.resolve({ skipped: true })
    ]);
    const status = results.map((r, i) => `${i ? 'contractor' : 'customer'}:${r.status === 'fulfilled' ? (r.value && r.value.skipped ? 'skipped' : 'sent') : 'failed'}`).join(' ');
    results.forEach(r => { if (r.status === 'rejected') console.error('[instant-estimate] email failed:', r.reason && r.reason.message); });
    try { store.setMailStatus(id, status); } catch (e) { /* ignore */ }
  });

  // Look up an estimate by its private token (used by the email "request visit" link).
  app.get('/api/instant-estimate/lead/:token', (req, res) => {
    const row = store.getByToken(String(req.params.token || ''));
    if (!row) return res.status(404).json({ ok: false });
    res.json({ ok: true, firstName: row.name.split(' ')[0], low: row.estimate_low, high: row.estimate_high,
      visitRequested: row.tier === 'visit_requested', disclaimer: store.getRates().disclaimer });
  });

  // Customer requests the site visit → hot lead.
  app.post('/api/instant-estimate/lead/:token/visit', async (req, res) => {
    const token = String(req.params.token || '');
    const row = store.getByToken(token);
    if (!row) return res.status(404).json({ ok: false, errors: ['Estimate not found.'] });
    const b = req.body || {};
    const days = (Array.isArray(b.days) ? b.days : []).filter(d => DAYS.includes(d));
    const time = TIMES.includes(b.time) ? b.time : 'Any time';
    const notes = clip(b.notes, 1000);
    const wasRequested = row.tier === 'visit_requested';
    store.requestVisit(token, { days: days.length ? days.join(', ') : 'Any day', time, notes });
    res.json({ ok: true });

    if (wasRequested || !biz.notifyEmail) return; // don't double-alert
    const fresh = store.getByToken(token);
    const rates = store.getRates();
    const a = JSON.parse(fresh.answers_json);
    const est = JSON.parse(fresh.breakdown_json);
    try {
      await mailer.send(Object.assign({ to: biz.notifyEmail, replyTo: fresh.email },
        emails.contractorVisitRequested({ biz, rates, row: fresh, a, est, adminUrl: urls.admin })));
    } catch (e) { console.error('[instant-estimate] visit email failed:', e.message); }
  });
};
