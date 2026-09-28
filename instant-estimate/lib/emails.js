// Email templates. All user input is HTML-escaped.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const money = (n) => '$' + Number(n).toLocaleString('en-US');

function labelOf(list, key) { const o = list.find(x => x.key === key); return o ? o.label : '—'; }

function summaryRows(a, rates) {
  const rows = [
    ['Project', a.projectType === 'replace' ? 'Replace an existing patio' : 'New patio'],
    ['Size', `${a.sqft.toLocaleString()} sq ft` + (a.length ? ` (${a.length}′ × ${a.width}′)` : '')],
    ['Finish', labelOf(rates.finishes, a.finish)],
    ['Access', labelOf(rates.access, a.access)],
    ['Ground', labelOf(rates.slope, a.slope)]
  ];
  const extras = [];
  if (a.steps) extras.push(`${a.steps} step${a.steps > 1 ? 's' : ''}`);
  if (a.seatWallFt) extras.push(`${a.seatWallFt} ft seat wall`);
  if (a.firePit) extras.push('fire pit pad');
  rows.push(['Extras', extras.length ? extras.join(', ') : 'None']);
  return rows;
}

function table(rows) {
  return `<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px">` +
    rows.map(([k, v]) => `<tr><td style="color:#666;border-bottom:1px solid #eee;width:38%">${esc(k)}</td>` +
      `<td style="border-bottom:1px solid #eee"><strong>${esc(v)}</strong></td></tr>`).join('') + `</table>`;
}

function wrap(biz, inner) {
  const color = biz.color || '#1f2937';
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#222">
  <div style="background:${esc(color)};color:#fff;padding:18px 22px;font-size:20px;font-weight:bold">${esc(biz.name)}</div>
  <div style="padding:22px;border:1px solid #e5e5e5;border-top:none">${inner}</div></div>`;
}

// ---------- To the customer ----------
function customerEstimate({ biz, rates, est, a, name, visitUrl }) {
  const subject = `Your patio ballpark estimate from ${biz.name}`;
  const html = wrap(biz, `
    <p>Hi ${esc(name.split(' ')[0])},</p>
    <p>Thanks for using our Instant Estimate. Based on what you told us, here's your ballpark:</p>
    <div style="background:#f6f6f4;border-radius:8px;padding:18px;text-align:center;margin:18px 0">
      <div style="font-size:13px;color:#666;text-transform:uppercase;letter-spacing:1px">Ballpark range</div>
      <div style="font-size:30px;font-weight:bold;margin-top:6px">${money(est.low)} – ${money(est.high)}</div>
    </div>
    ${table(summaryRows(a, rates))}
    <p style="font-size:13px;color:#666;margin-top:16px">${esc(rates.disclaimer)}</p>
    <p style="margin:24px 0;text-align:center">
      <a href="${esc(visitUrl)}" style="background:${esc(biz.color || '#1f2937')};color:#fff;padding:13px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Request my free site visit</a>
    </p>
    <p>Questions? Call us${biz.phone ? ` at <a href="tel:${esc(biz.phone.replace(/[^\d+]/g, ''))}">${esc(biz.phone)}</a>` : ''} or just reply to this email.</p>
    <p>— ${esc(biz.name)}</p>`);
  const text = `Hi ${name},\n\nYour ballpark range: ${money(est.low)} – ${money(est.high)}\n\n${rates.disclaimer}\n\nRequest your free site visit: ${visitUrl}\n${biz.phone ? 'Call: ' + biz.phone + '\n' : ''}\n— ${biz.name}`;
  return { subject, html, text };
}

// ---------- To the contractor ----------
function leadDetails({ rates, row, a, est }) {
  const budget = rates.budgets.find(b => b.key === a.budget);
  const timeline = rates.timelines.find(t => t.key === a.timeline);
  const contact = [
    ['Name', row.name], ['Phone', row.phone || '—'], ['Email', row.email], ['Town', row.town || '—'],
    ['Budget', budget ? budget.label : 'Not given'], ['Timeline', timeline ? timeline.label : 'Not given']
  ];
  const breakdown = `<table cellpadding="5" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px">` +
    est.lines.map(l => `<tr><td style="border-bottom:1px solid #eee">${esc(l.label)}</td><td align="right" style="border-bottom:1px solid #eee">${money(l.amount)}</td></tr>`).join('') +
    `<tr><td><strong>Calculated</strong></td><td align="right"><strong>${money(est.midpoint)}</strong></td></tr></table>`;
  return `
    <h3 style="margin:18px 0 6px">Contact</h3>${table(contact)}
    <h3 style="margin:18px 0 6px">Project</h3>${table(summaryRows(a, rates))}
    <h3 style="margin:18px 0 6px">How the number was built (internal only)</h3>${breakdown}`;
}

function contractorNewEstimate({ biz, rates, row, a, est, adminUrl }) {
  const gap = est.budgetGap ? ' ⚠️ Budget gap' : '';
  const subject = `Price viewed: ${row.name} — ${money(est.low)}–${money(est.high)}${gap}`;
  const html = wrap(biz, `
    <p style="font-size:15px"><strong>New Instant Estimate — price viewed.</strong> They have <em>not</em> asked for a site visit yet.</p>
    <p style="font-size:22px;font-weight:bold;margin:8px 0">${money(est.low)} – ${money(est.high)}</p>
    ${est.budgetGap ? `<p style="background:#fff4e5;border-left:4px solid #f59e0b;padding:10px">⚠️ <strong>Budget gap:</strong> their stated budget is below the low end of this range.</p>` : ''}
    ${leadDetails({ rates, row, a, est })}
    <p style="margin-top:20px"><a href="${esc(adminUrl)}">Open the estimates dashboard →</a></p>`);
  return { subject, html, text: `New Instant Estimate (price viewed): ${row.name}, ${row.phone || ''}, ${row.email}\n${money(est.low)} – ${money(est.high)}\n${adminUrl}` };
}

function contractorVisitRequested({ biz, rates, row, a, est, adminUrl }) {
  const subject = `🔥 Site visit requested: ${row.name} — ${money(est.low)}–${money(est.high)}`;
  const html = wrap(biz, `
    <p style="font-size:16px"><strong>🔥 Hot lead — they saw the price and still want you out there.</strong></p>
    <p style="font-size:22px;font-weight:bold;margin:8px 0">${money(est.low)} – ${money(est.high)}</p>
    ${table([['Best days', row.visit_days || 'Any'], ['Best time', row.visit_time || 'Any'], ['Notes', row.visit_notes || '—']])}
    ${est.budgetGap ? `<p style="background:#fff4e5;border-left:4px solid #f59e0b;padding:10px">⚠️ <strong>Budget gap:</strong> their stated budget is below the low end of this range.</p>` : ''}
    ${leadDetails({ rates, row, a, est })}
    <p style="margin-top:20px"><a href="${esc(adminUrl)}">Open the estimates dashboard →</a></p>`);
  return { subject, html, text: `SITE VISIT REQUESTED: ${row.name}, ${row.phone || ''}, ${row.email}\nDays: ${row.visit_days} / Time: ${row.visit_time}\n${money(est.low)} – ${money(est.high)}\n${adminUrl}` };
}

module.exports = { customerEstimate, contractorNewEstimate, contractorVisitRequested, esc };
