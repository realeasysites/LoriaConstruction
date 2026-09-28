// Pure pricing engine — no database, no Express. Easy to test on its own.
//
//   job      = (sqft × finish rate) + (sqft × demo rate if replacing)
//            + steps + seat wall + fire pit pad
//   job      = job × access multiplier × slope multiplier
//   job      = max(job, minimum job)
//   range    = job − rangeLowPct%  …  job + rangeHighPct%   (rounded to $100)

function roundDown100(n) { return Math.floor(n / 100) * 100; }
function roundUp100(n)   { return Math.ceil(n / 100) * 100; }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : NaN; }

/**
 * Validate raw answers from the form. Returns { ok, errors, clean }.
 */
function validateAnswers(raw, rates) {
  const errors = [];
  const a = raw || {};
  const clean = {};

  clean.projectType = a.projectType === 'replace' ? 'replace' : 'new';

  let sqft = num(a.sqft);
  if (!(sqft > 0) && num(a.length) > 0 && num(a.width) > 0) sqft = num(a.length) * num(a.width);
  sqft = Math.round(sqft);
  if (!(sqft > 0)) errors.push('Please enter your patio size.');
  else if (sqft < rates.minSqft) errors.push(`Patios under ${rates.minSqft} sq ft are best handled by phone — give us a call.`);
  else if (sqft > rates.maxSqft) errors.push(`Projects over ${rates.maxSqft.toLocaleString()} sq ft need a custom quote — please call us.`);
  clean.sqft = sqft;
  if (num(a.length) > 0 && num(a.width) > 0) { clean.length = num(a.length); clean.width = num(a.width); }

  const finish = rates.finishes.find(f => f.key === a.finish && f.enabled);
  if (!finish) errors.push('Please choose a finish.');
  clean.finish = finish ? finish.key : null;

  clean.access = rates.access.some(x => x.key === a.access) ? a.access : rates.access[0].key;
  clean.slope  = rates.slope.some(x => x.key === a.slope)   ? a.slope  : rates.slope[0].key;

  const steps = Math.max(0, Math.min(20, Math.floor(num(a.steps) || 0)));
  const seatWallFt = Math.max(0, Math.min(200, Math.floor(num(a.seatWallFt) || 0)));
  clean.steps = steps;
  clean.seatWallFt = seatWallFt;
  clean.firePit = a.firePit === true || a.firePit === 'true' || a.firePit === 'on';

  clean.budget = rates.budgets.some(b => b.key === a.budget) ? a.budget : null;
  clean.timeline = rates.timelines.some(t => t.key === a.timeline) ? a.timeline : null;

  return { ok: errors.length === 0, errors, clean };
}

/**
 * Calculate an estimate from CLEAN answers. Returns the range plus an
 * internal line-item breakdown (the breakdown goes to the contractor only).
 */
function calculate(ans, rates) {
  const finish = rates.finishes.find(f => f.key === ans.finish);
  const access = rates.access.find(x => x.key === ans.access) || rates.access[0];
  const slope  = rates.slope.find(x => x.key === ans.slope)   || rates.slope[0];
  const lines = [];

  const concrete = ans.sqft * finish.rate;
  lines.push({ label: `${finish.label}: ${ans.sqft} sq ft × $${finish.rate}`, amount: concrete });

  if (ans.projectType === 'replace') {
    const demo = ans.sqft * rates.demoRate;
    lines.push({ label: `Remove existing: ${ans.sqft} sq ft × $${rates.demoRate}`, amount: demo });
  }
  if (ans.steps > 0) lines.push({ label: `Steps: ${ans.steps} × $${rates.stepRate}`, amount: ans.steps * rates.stepRate });
  if (ans.seatWallFt > 0) lines.push({ label: `Seat wall: ${ans.seatWallFt} ft × $${rates.seatWallRate}`, amount: ans.seatWallFt * rates.seatWallRate });
  if (ans.firePit) lines.push({ label: 'Fire pit pad', amount: rates.firePitPad });

  const base = lines.reduce((s, l) => s + l.amount, 0);
  const mult = access.mult * slope.mult;
  let job = base * mult;
  if (mult !== 1) lines.push({ label: `Site adjustment: access ×${access.mult}, slope ×${slope.mult}`, amount: job - base });

  let minimumApplied = false;
  if (job < rates.minimumJob) {
    lines.push({ label: `Minimum job charge ($${rates.minimumJob.toLocaleString()})`, amount: rates.minimumJob - job });
    job = rates.minimumJob;
    minimumApplied = true;
  }

  let low  = roundDown100(job * (1 - rates.rangeLowPct / 100));
  let high = roundUp100(job * (1 + rates.rangeHighPct / 100));
  if (low < rates.minimumJob) low = rates.minimumJob;
  if (high < low) high = low;

  // Budget gap: customer's stated budget ceiling is below our LOW number.
  let budgetGap = false;
  const b = rates.budgets.find(x => x.key === ans.budget);
  if (b && b.high != null && Number.isFinite(b.high) && b.high < low) budgetGap = true;

  return {
    low, high,
    midpoint: Math.round(job),
    perSqftLow: Math.round(low / ans.sqft),
    perSqftHigh: Math.round(high / ans.sqft),
    minimumApplied,
    budgetGap,
    lines: lines.map(l => ({ label: l.label, amount: Math.round(l.amount) }))
  };
}

/**
 * Validate an admin pricing update. Returns { ok, errors, rates }.
 */
function validateRates(input, current) {
  const errors = [];
  const r = JSON.parse(JSON.stringify(current));
  const money = (v, name, max = 100000) => {
    const n = num(v);
    if (!(n >= 0) || n > max) { errors.push(`${name} must be a number between 0 and ${max}.`); return null; }
    return n;
  };
  const multv = (v, name) => {
    const n = num(v);
    if (!(n >= 0.5 && n <= 3)) { errors.push(`${name} multiplier must be between 0.5 and 3.`); return null; }
    return n;
  };

  if (Array.isArray(input.finishes)) {
    input.finishes.forEach(f => {
      const t = r.finishes.find(x => x.key === f.key);
      if (!t) return;
      if (typeof f.label === 'string' && f.label.trim()) t.label = f.label.trim().slice(0, 60);
      if (typeof f.desc === 'string') t.desc = f.desc.trim().slice(0, 140);
      const v = money(f.rate, `${t.label} rate`, 500); if (v != null) t.rate = v;
      t.enabled = f.enabled !== false;
    });
    if (!r.finishes.some(f => f.enabled)) errors.push('At least one finish must be enabled.');
  }
  ['access', 'slope'].forEach(group => {
    if (Array.isArray(input[group])) input[group].forEach(o => {
      const t = r[group].find(x => x.key === o.key); if (!t) return;
      const v = multv(o.mult, t.label); if (v != null) t.mult = v;
    });
  });
  [['demoRate', 'Demo rate', 100], ['stepRate', 'Step price', 10000], ['seatWallRate', 'Seat wall rate', 2000],
   ['firePitPad', 'Fire pit pad price', 20000], ['minimumJob', 'Minimum job', 100000]].forEach(([k, name, max]) => {
    if (input[k] !== undefined) { const v = money(input[k], name, max); if (v != null) r[k] = v; }
  });
  ['rangeLowPct', 'rangeHighPct'].forEach(k => {
    if (input[k] !== undefined) {
      const n = num(input[k]);
      if (!(n >= 0 && n <= 50)) errors.push('Range percentages must be between 0 and 50.'); else r[k] = n;
    }
  });
  if (typeof input.disclaimer === 'string' && input.disclaimer.trim()) r.disclaimer = input.disclaimer.trim().slice(0, 600);

  return { ok: errors.length === 0, errors, rates: r };
}

module.exports = { validateAnswers, calculate, validateRates };
