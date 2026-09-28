// SQLite storage for estimates + pricing settings (better-sqlite3).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const DEFAULTS = require('./defaults');

const STATUSES = ['new', 'contacted', 'visit_scheduled', 'won', 'lost'];

function createStore(db) {
  if (!db) {
    const Database = require('better-sqlite3');
    const dir = path.join(__dirname, '..', 'db');
    fs.mkdirSync(dir, { recursive: true });
    db = new Database(process.env.IE_DB_PATH || path.join(dir, 'instant-estimate.sqlite'));
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS ie_estimates (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      token         TEXT UNIQUE NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      name          TEXT NOT NULL,
      email         TEXT NOT NULL,
      phone         TEXT,
      town          TEXT,
      answers_json  TEXT NOT NULL,
      estimate_low  INTEGER NOT NULL,
      estimate_high INTEGER NOT NULL,
      breakdown_json TEXT NOT NULL,
      budget_gap    INTEGER NOT NULL DEFAULT 0,
      tier          TEXT NOT NULL DEFAULT 'price_only',
      visit_days    TEXT,
      visit_time    TEXT,
      visit_notes   TEXT,
      visit_requested_at TEXT,
      status        TEXT NOT NULL DEFAULT 'new',
      admin_notes   TEXT,
      mail_status   TEXT
    );
    CREATE TABLE IF NOT EXISTS ie_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Merge saved settings onto defaults by key, so new default options
  // added in future versions still show up.
  function mergeByKey(defArr, savedArr) {
    if (!Array.isArray(savedArr)) return JSON.parse(JSON.stringify(defArr));
    return defArr.map(d => Object.assign({}, d, savedArr.find(s => s.key === d.key) || {}));
  }

  function getRates() {
    const row = db.prepare('SELECT value FROM ie_settings WHERE key = ?').get('rates');
    const saved = row ? JSON.parse(row.value) : {};
    const r = Object.assign({}, DEFAULTS, saved);
    r.finishes = mergeByKey(DEFAULTS.finishes, saved.finishes);
    r.access = mergeByKey(DEFAULTS.access, saved.access);
    r.slope = mergeByKey(DEFAULTS.slope, saved.slope);
    r.budgets = DEFAULTS.budgets;       // fixed lists, not editable
    r.timelines = DEFAULTS.timelines;
    r.customized = !!row;
    return r;
  }

  function saveRates(rates) {
    const { budgets, timelines, customized, ...rest } = rates;
    db.prepare(`INSERT INTO ie_settings (key, value) VALUES ('rates', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(JSON.stringify(rest));
  }

  function resetRates() {
    db.prepare("DELETE FROM ie_settings WHERE key = 'rates'").run();
  }

  function insertEstimate(e) {
    const token = crypto.randomBytes(18).toString('hex');
    const info = db.prepare(`
      INSERT INTO ie_estimates (token, name, email, phone, town, answers_json, estimate_low, estimate_high, breakdown_json, budget_gap)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      token, e.name, e.email, e.phone || null, e.town || null,
      JSON.stringify(e.answers), e.low, e.high, JSON.stringify(e.breakdown), e.budgetGap ? 1 : 0);
    return { id: Number(info.lastInsertRowid), token };
  }

  function getByToken(token) {
    return db.prepare('SELECT * FROM ie_estimates WHERE token = ?').get(token);
  }

  function requestVisit(token, v) {
    return db.prepare(`
      UPDATE ie_estimates SET tier = 'visit_requested', visit_days = ?, visit_time = ?, visit_notes = ?,
             visit_requested_at = datetime('now')
      WHERE token = ?`).run(v.days, v.time, v.notes || null, token).changes;
  }

  function setMailStatus(id, s) {
    db.prepare('UPDATE ie_estimates SET mail_status = ? WHERE id = ?').run(s, id);
  }

  function list({ tier } = {}) {
    const rows = tier
      ? db.prepare('SELECT * FROM ie_estimates WHERE tier = ? ORDER BY id DESC').all(tier)
      : db.prepare('SELECT * FROM ie_estimates ORDER BY id DESC').all();
    return rows.map(r => {
      const { token, answers_json, breakdown_json, ...rest } = r;
      return Object.assign(rest, { answers: JSON.parse(answers_json), breakdown: JSON.parse(breakdown_json) });
    });
  }

  function update(id, { status, admin_notes }) {
    if (status !== undefined && !STATUSES.includes(status)) return 0;
    const cur = db.prepare('SELECT * FROM ie_estimates WHERE id = ?').get(id);
    if (!cur) return 0;
    return db.prepare('UPDATE ie_estimates SET status = ?, admin_notes = ? WHERE id = ?')
      .run(status !== undefined ? status : cur.status,
           admin_notes !== undefined ? String(admin_notes).slice(0, 2000) : cur.admin_notes, id).changes;
  }

  function remove(id) {
    return db.prepare('DELETE FROM ie_estimates WHERE id = ?').run(id).changes;
  }

  return { getRates, saveRates, resetRates, insertEstimate, getByToken, requestVisit, setMailStatus, list, update, remove, STATUSES };
}

module.exports = { createStore, STATUSES };
