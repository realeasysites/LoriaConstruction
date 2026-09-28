// Admin pages + API for Instant Estimate (protected by ctx.requireAdmin).
const path = require('path');
const { validateAnswers, calculate, validateRates } = require('../lib/pricing');

module.exports = function adminRoutes(app, ctx) {
  const { store, requireAdmin } = ctx;
  const views = path.join(__dirname, '..', 'views');

  app.get('/admin/estimates', requireAdmin, (req, res) => res.sendFile(path.join(views, 'estimates.html')));
  app.get('/admin/estimate-pricing', requireAdmin, (req, res) => res.sendFile(path.join(views, 'pricing.html')));

  app.get('/admin/api/estimates', requireAdmin, (req, res) => {
    const tier = ['price_only', 'visit_requested'].includes(req.query.tier) ? req.query.tier : undefined;
    res.json({ ok: true, estimates: store.list({ tier }), statuses: store.STATUSES });
  });

  app.post('/admin/api/estimates/:id', requireAdmin, (req, res) => {
    const changed = store.update(Number(req.params.id), req.body || {});
    res.status(changed ? 200 : 400).json({ ok: !!changed });
  });

  app.post('/admin/api/estimates/:id/delete', requireAdmin, (req, res) => {
    res.json({ ok: !!store.remove(Number(req.params.id)) });
  });

  app.get('/admin/api/estimate-rates', requireAdmin, (req, res) => res.json({ ok: true, rates: store.getRates() }));

  app.post('/admin/api/estimate-rates', requireAdmin, (req, res) => {
    const { ok, errors, rates } = validateRates(req.body || {}, store.getRates());
    if (!ok) return res.status(400).json({ ok: false, errors });
    store.saveRates(rates);
    res.json({ ok: true, rates: store.getRates() });
  });

  app.post('/admin/api/estimate-rates/reset', requireAdmin, (req, res) => {
    store.resetRates();
    res.json({ ok: true, rates: store.getRates() });
  });

  // Try a sample job against the rates currently on screen (unsaved).
  app.post('/admin/api/estimate-preview', requireAdmin, (req, res) => {
    const b = req.body || {};
    const { ok: rOk, errors: rErr, rates } = validateRates(b.rates || {}, store.getRates());
    if (!rOk) return res.status(400).json({ ok: false, errors: rErr });
    const { ok, errors, clean } = validateAnswers(b.answers || {}, rates);
    if (!ok) return res.status(400).json({ ok: false, errors });
    res.json({ ok: true, estimate: calculate(clean, rates) });
  });
};
