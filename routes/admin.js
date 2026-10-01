'use strict';

const path = require('path');
const express = require('express');
const { db, stmts, STATUSES } = require('../db');
const { checkPassword, createSession, destroySession, isAuthed, requireAdmin } = require('../lib/auth');
const rateLimit = require('../lib/rateLimit');

const ADMIN_DIR = path.join(__dirname, '..', 'admin');

/* ---------- Pages (/admin) ---------- */
const pages = express.Router();

pages.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(ADMIN_DIR, isAuthed(req) ? 'dashboard.html' : 'login.html'));
});
pages.use('/assets', express.static(path.join(ADMIN_DIR, 'assets')));

/* ---------- API (/api/admin) ---------- */
const api = express.Router();

api.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many attempts. Try again in 15 minutes.' }), (req, res) => {
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set on the server.' });
  if (!checkPassword(req.body && req.body.password)) return res.status(401).json({ error: 'Incorrect password.' });
  createSession(res);
  res.json({ ok: true });
});

api.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

api.use(requireAdmin);

function shape(row) {
  const { ip, ...rest } = row;
  return rest;
}

api.get('/leads', (req, res) => {
  const leads = stmts.listLeads.all().map(shape);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of stmts.statusCounts.all()) counts[r.status] = r.n;
  let ie = {};
  try {
    ie = db.prepare(`SELECT COUNT(*) AS total, SUM(tier = 'visit_requested') AS hot,
      SUM(tier = 'visit_requested' AND status = 'new') AS hotNew FROM ie_estimates`).get();
  } catch (e) { /* Instant Estimate module is off */ }
  res.json({ leads, counts, statuses: STATUSES, estimates: { total: ie.total || 0, hot: ie.hot || 0, hotNew: ie.hotNew || 0 } });
});

api.patch('/leads/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!stmts.getLead.get(id)) return res.status(404).json({ error: 'Lead not found' });
  const { status, notes } = req.body || {};
  if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  stmts.updateLead.run({
    id,
    status: status ?? null,
    notes: typeof notes === 'string' ? notes.slice(0, 4000) : null
  });
  res.json({ ok: true, lead: shape(stmts.getLead.get(id)) });
});

api.delete('/leads/:id', (req, res) => {
  stmts.deleteLead.run(Number(req.params.id));
  res.json({ ok: true });
});

api.get('/leads.csv', (req, res) => {
  const cols = ['id', 'created_at', 'status', 'name', 'phone', 'email', 'town', 'service', 'timeline', 'message', 'notes'];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = stmts.listLeads.all().map((l) => cols.map((c) => cell(l[c])).join(','));
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="loria-contact-leads.csv"');
  res.send([cols.join(','), ...rows].join('\n'));
});

module.exports = { pages, api };
