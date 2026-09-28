(function () {
  'use strict';

  var state = { leads: [], counts: {}, statuses: [], filter: '', q: '', open: {} };
  var LABELS = { new: 'New', contacted: 'Contacted', visit_scheduled: 'Visit scheduled', quoted: 'Quoted', won: 'Won', lost: 'Lost' };
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var color = function (s) { return 'var(--s-' + s + ')'; };
  var fmtDate = function (d) {
    if (!d) return 'No date';
    var dt = new Date(d + 'T12:00:00');
    return isNaN(dt) ? d : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };
  var ago = function (ts) {
    var d = new Date(ts.replace(' ', 'T') + 'Z');
    var m = Math.round((Date.now() - d) / 60000);
    if (m < 60) return m + 'm ago';
    if (m < 1440) return Math.round(m / 60) + 'h ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  function api(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) { location.reload(); throw new Error('auth'); }
      return r.json();
    });
  }

  function load() {
    return api('/api/admin/leads').then(function (d) {
      state.leads = d.leads; state.counts = d.counts; state.statuses = d.statuses; state.ie = d.estimates || {};
      var sel = $('#statusFilter');
      if (sel.options.length === 1) {
        d.statuses.forEach(function (s) { sel.insertAdjacentHTML('beforeend', '<option value="' + s + '">' + LABELS[s] + '</option>'); });
      }
      render();
    });
  }

  function render() {
    // Stats
    $('#stats').innerHTML = state.statuses.map(function (s) {
      return '<button class="stat' + (state.filter === s ? ' active' : '') + '" data-stat="' + s + '" style="--c:' + color(s) + '"><b>' + (state.counts[s] || 0) + '</b><span>' + LABELS[s] + '</span></button>';
    }).join('');

    // Leads
    var q = state.q.toLowerCase();
    var list = state.leads.filter(function (l) {
      if (state.filter && l.status !== state.filter) return false;
      if (!q) return true;
      return [l.name, l.phone, l.email, l.town, l.service].join(' ').toLowerCase().indexOf(q) > -1;
    });

    $('#leadList').innerHTML = list.length ? list.map(function (l) {
      var digits = String(l.phone).replace(/[^\d+]/g, '');
      return '<article class="lead' + (state.open[l.id] ? ' open' : '') + '" data-id="' + l.id + '">' +
        '<button class="lead-top" data-toggle="' + l.id + '" aria-expanded="' + !!state.open[l.id] + '">' +
          '<div><div class="lead-name">' + esc(l.name) + '</div>' +
            '<div class="lead-meta">' +
            (l.service ? '<span>🧱 ' + esc(l.service) + '</span>' : '') +
            (l.town ? '<span>📍 ' + esc(l.town) + '</span>' : '') +
            (l.timeline ? '<span>🗓 ' + esc(l.timeline) + '</span>' : '') +
            '<span>Received ' + ago(l.created_at) + '</span></div>' +
          '</div>' +
          '<div class="lead-right"><span class="badge" style="--c:' + color(l.status) + '">' + LABELS[l.status] + '</span></div>' +
        '</button>' +
        '<div class="lead-body">' +
          '<div>' +
            '<h4>Contact</h4>' +
            '<div>' + esc(l.phone) + (l.email ? ' · ' + esc(l.email) : '') + '</div>' +
            '<div class="quick"><a class="call" href="tel:' + esc(digits) + '">Call</a><a href="sms:' + esc(digits) + '">Text</a>' +
              (l.email ? '<a href="mailto:' + esc(l.email) + '?subject=' + encodeURIComponent('Your project with Loria Construction') + '">Email</a>' : '') + '</div>' +
            '<h4>Project</h4><div>' + esc(l.service || '—') + (l.timeline ? ' · ' + esc(l.timeline) : '') + '</div>' +
            (l.message ? '<h4>Message</h4><div class="msg">' + esc(l.message) + '</div>' : '') +
          '</div>' +
          '<div>' +
            '<h4>Status</h4><select data-status="' + l.id + '">' + state.statuses.map(function (s) {
              return '<option value="' + s + '"' + (s === l.status ? ' selected' : '') + '>' + LABELS[s] + '</option>';
            }).join('') + '</select>' +
            '<h4>Private notes</h4><textarea data-notes="' + l.id + '" placeholder="Site visit date, measurements, pattern & color…">' + esc(l.notes || '') + '</textarea>' +
            '<button class="save" data-save="' + l.id + '">Save notes</button><span class="saved" data-saved="' + l.id + '"></span>' +
            '<div class="quick"><button class="del" data-del="' + l.id + '">Delete lead</button></div>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('') : '<p class="empty">No messages here yet. New contact-form messages from the website will show up here.</p>';

    var ie = state.ie || {};
    $('#ieNums').innerHTML =
      '<div><b>' + (ie.total || 0) + '</b><span>Run</span></div>' +
      '<div class="hot"><b>' + (ie.hot || 0) + '</b><span>🔥 Visits</span></div>' +
      '<div class="hot"><b>' + (ie.hotNew || 0) + '</b><span>Not called</span></div>';
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-toggle],[data-stat],[data-save],[data-del],#logout');
    if (!t) return;
    if (t.dataset.toggle) { var id = t.dataset.toggle; state.open[id] = !state.open[id]; render(); }
    else if (t.dataset.stat) { state.filter = state.filter === t.dataset.stat ? '' : t.dataset.stat; $('#statusFilter').value = state.filter; render(); }
    else if (t.dataset.save) {
      var sid = t.dataset.save;
      api('/api/admin/leads/' + sid, { method: 'PATCH', body: JSON.stringify({ notes: document.querySelector('[data-notes="' + sid + '"]').value }) })
        .then(function (r) {
          var i = state.leads.findIndex(function (l) { return String(l.id) === sid; });
          if (i > -1 && r.lead) state.leads[i] = r.lead;
          var s = document.querySelector('[data-saved="' + sid + '"]'); if (s) s.textContent = 'Saved ✓';
        });
    }
    else if (t.dataset.del) {
      if (!confirm('Delete this lead permanently?')) return;
      api('/api/admin/leads/' + t.dataset.del, { method: 'DELETE' }).then(load);
    }
    else if (t.id === 'logout') { api('/api/admin/logout', { method: 'POST' }).then(function () { location.reload(); }); }
  });

  document.addEventListener('change', function (e) {
    if (e.target.dataset.status) {
      api('/api/admin/leads/' + e.target.dataset.status, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) }).then(load);
    }
    if (e.target.id === 'statusFilter') { state.filter = e.target.value; render(); }
  });
  $('#search').addEventListener('input', function (e) { state.q = e.target.value; render(); });

  load();
  setInterval(function () { if (!document.querySelector('.lead.open textarea:focus')) load(); }, 60000);
})();
