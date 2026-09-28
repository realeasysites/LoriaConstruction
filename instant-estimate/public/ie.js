/* Instant Estimate — customer widget.
   Embed anywhere:
     <link rel="stylesheet" href="/instant-estimate/ie.css">
     <div id="instant-estimate"></div>
     <script src="/instant-estimate/ie.js" defer></script>
*/
(function () {
  'use strict';
  var root = document.getElementById('instant-estimate');
  if (!root) return;
  var API = root.getAttribute('data-api') || '/api/instant-estimate';

  var cfg = null;
  var state = {
    projectType: null, sizeMode: 'dims', length: '', width: '', sqft: '',
    finish: null, access: null, slope: null, steps: 0, seatWallFt: 0, firePit: false,
    budget: null, timeline: null, name: '', email: '', phone: '', town: '', website: '',
    result: null, token: null, visitDays: [], visitTime: 'Any time', visitNotes: ''
  };
  var step = 0;
  var STEPS = ['project', 'size', 'finish', 'site', 'extras', 'plans', 'contact', 'result', 'visit', 'done'];
  var PROGRESS_STEPS = 7; // project..contact

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function money(n) { return '$' + Number(n).toLocaleString('en-US'); }
  function sqft() {
    if (state.sizeMode === 'dims') {
      var l = parseFloat(state.length), w = parseFloat(state.width);
      return l > 0 && w > 0 ? Math.round(l * w) : 0;
    }
    return Math.round(parseFloat(state.sqft)) || 0;
  }

  function go(n) { step = n; render(); var top = root.getBoundingClientRect().top + window.scrollY - 80; if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' }); }
  function next() { go(step + 1); }
  function back() { go(step - 1); }

  // ---------- building blocks ----------
  function card(opt, selected, onPick) {
    return h('button', { type: 'button', class: 'ie-card' + (selected ? ' is-on' : ''), 'aria-pressed': selected ? 'true' : 'false', onclick: onPick }, [
      h('span', { class: 'ie-card-title', text: opt.label }),
      opt.desc ? h('span', { class: 'ie-card-desc', text: opt.desc }) : null
    ]);
  }
  function radioList(name, options, current, onPick) {
    return h('div', { class: 'ie-radios', role: 'radiogroup' }, options.map(function (o) {
      var id = 'ie-' + name + '-' + o.key;
      return h('label', { class: 'ie-radio' + (current === o.key ? ' is-on' : ''), for: id }, [
        h('input', { type: 'radio', id: id, name: name, value: o.key, checked: current === o.key, onchange: function () { onPick(o.key); } }),
        h('span', { text: o.label })
      ]);
    }));
  }
  function nav(opts) {
    opts = opts || {};
    return h('div', { class: 'ie-nav' }, [
      step > 0 ? h('button', { type: 'button', class: 'ie-btn ie-btn-ghost', onclick: back, text: '← Back' }) : h('span'),
      opts.hideNext ? null : h('button', { type: opts.submit ? 'submit' : 'button', class: 'ie-btn', disabled: opts.disabled, onclick: opts.submit ? null : (opts.onNext || next), text: opts.label || 'Next →' })
    ]);
  }
  function field(label, input, hint) {
    return h('label', { class: 'ie-field' }, [h('span', { class: 'ie-label', text: label }), input, hint ? h('span', { class: 'ie-hint', text: hint }) : null]);
  }
  function input(key, attrs) {
    var el = h('input', Object.assign({ id: 'ie-in-' + key, name: key }, attrs));
    el.value = state[key];
    el.addEventListener('input', function () { state[key] = el.value; if (attrs && attrs['data-live']) render(true); });
    return el;
  }
  function errorBox(msgs) {
    return msgs && msgs.length ? h('div', { class: 'ie-error', role: 'alert' }, msgs.map(function (m) { return h('div', { text: m }); })) : null;
  }

  // ---------- steps ----------
  var errors = [];
  var views = {
    project: function () {
      return [
        h('h3', { class: 'ie-q', text: 'What are we building?' }),
        h('div', { class: 'ie-cards ie-cards-2' }, [
          card({ label: 'A brand-new patio', desc: 'Grass, dirt, or gravel there now.' }, state.projectType === 'new', function () { state.projectType = 'new'; next(); }),
          card({ label: 'Replace an existing patio', desc: 'Old concrete, pavers, or a slab to remove.' }, state.projectType === 'replace', function () { state.projectType = 'replace'; next(); })
        ]),
        nav({ hideNext: true })
      ];
    },

    size: function (live) {
      var s = sqft();
      var presets = [['Small', 10, 12], ['Medium', 12, 16], ['Large', 16, 20], ['Extra large', 20, 30]];
      var tabs = h('div', { class: 'ie-tabs' }, [
        h('button', { type: 'button', class: 'ie-tab' + (state.sizeMode === 'dims' ? ' is-on' : ''), onclick: function () { state.sizeMode = 'dims'; render(); }, text: 'Length × width' }),
        h('button', { type: 'button', class: 'ie-tab' + (state.sizeMode === 'sqft' ? ' is-on' : ''), onclick: function () { state.sizeMode = 'sqft'; render(); }, text: 'I know the sq ft' })
      ]);
      var inputs = state.sizeMode === 'dims'
        ? h('div', { class: 'ie-row' }, [
            field('Length (ft)', input('length', { type: 'number', inputmode: 'decimal', min: '1', step: '0.5', placeholder: 'e.g. 16', 'data-live': 1 })),
            h('span', { class: 'ie-x', text: '×' }),
            field('Width (ft)', input('width', { type: 'number', inputmode: 'decimal', min: '1', step: '0.5', placeholder: 'e.g. 20', 'data-live': 1 }))
          ])
        : field('Square feet', input('sqft', { type: 'number', inputmode: 'numeric', min: '1', placeholder: 'e.g. 320', 'data-live': 1 }));
      var tooSmall = s > 0 && s < cfg.minSqft, tooBig = s > cfg.maxSqft;
      return [
        h('h3', { class: 'ie-q', text: 'About how big?' }),
        h('p', { class: 'ie-sub', text: 'Rough is fine — we measure exactly at the site visit.' }),
        h('div', { class: 'ie-chips' }, presets.map(function (p) {
          var on = state.sizeMode === 'dims' && +state.length === p[1] && +state.width === p[2];
          return h('button', { type: 'button', class: 'ie-chip' + (on ? ' is-on' : ''), onclick: function () { state.sizeMode = 'dims'; state.length = String(p[1]); state.width = String(p[2]); render(); } },
            [h('strong', { text: p[0] }), ' ' + p[1] + '′×' + p[2] + '′']);
        })),
        tabs, inputs,
        h('div', { class: 'ie-sqft', 'aria-live': 'polite' }, s ? [h('strong', { text: s.toLocaleString() }), ' sq ft'] : ['Enter a size to continue']),
        tooSmall ? h('div', { class: 'ie-note', text: 'Under ' + cfg.minSqft + ' sq ft? Give us a call — small jobs are best priced by phone.' }) : null,
        tooBig ? h('div', { class: 'ie-note', text: 'Over ' + cfg.maxSqft.toLocaleString() + ' sq ft needs a custom quote — please call us.' }) : null,
        nav({ disabled: !s || tooSmall || tooBig })
      ];
    },

    finish: function () {
      return [
        h('h3', { class: 'ie-q', text: 'Which finish are you leaning toward?' }),
        h('div', { class: 'ie-cards ie-cards-2' }, cfg.finishes.map(function (f) {
          return card(f, state.finish === f.key, function () { state.finish = f.key; next(); });
        })),
        nav({ disabled: !state.finish })
      ];
    },

    site: function () {
      if (!state.access) state.access = cfg.access[0].key;
      if (!state.slope) state.slope = cfg.slope[0].key;
      return [
        h('h3', { class: 'ie-q', text: 'Tell us about the site' }),
        h('div', { class: 'ie-label', text: 'How easy is it to get a concrete truck close?' }),
        radioList('access', cfg.access, state.access, function (k) { state.access = k; render(); }),
        h('div', { class: 'ie-label ie-mt', text: 'How is the ground?' }),
        radioList('slope', cfg.slope, state.slope, function (k) { state.slope = k; render(); }),
        nav()
      ];
    },

    extras: function () {
      function stepper(key, label, unit, max, inc) {
        return h('div', { class: 'ie-stepper' }, [
          h('span', { class: 'ie-stepper-label', text: label }),
          h('div', { class: 'ie-stepper-ctrl' }, [
            h('button', { type: 'button', 'aria-label': 'Less ' + label, onclick: function () { state[key] = Math.max(0, state[key] - inc); render(); }, text: '−' }),
            h('span', { class: 'ie-stepper-val', text: state[key] + (unit ? ' ' + unit : '') }),
            h('button', { type: 'button', 'aria-label': 'More ' + label, onclick: function () { state[key] = Math.min(max, state[key] + inc); render(); }, text: '+' })
          ])
        ]);
      }
      return [
        h('h3', { class: 'ie-q', text: 'Any extras?' }),
        h('p', { class: 'ie-sub', text: 'Skip this if you just want the patio.' }),
        stepper('steps', 'Concrete steps', '', 20, 1),
        stepper('seatWallFt', 'Seat wall', 'ft', 200, 5),
        h('label', { class: 'ie-toggle' + (state.firePit ? ' is-on' : '') }, [
          h('input', { type: 'checkbox', checked: state.firePit, onchange: function (e) { state.firePit = e.target.checked; render(); } }),
          h('span', { text: 'Fire pit pad' })
        ]),
        nav()
      ];
    },

    plans: function () {
      return [
        h('h3', { class: 'ie-q', text: 'A little about your plans' }),
        h('div', { class: 'ie-label', text: 'What were you hoping to spend? (optional)' }),
        radioList('budget', cfg.budgets, state.budget, function (k) { state.budget = k; render(); }),
        h('div', { class: 'ie-label ie-mt', text: 'When are you hoping to start? (optional)' }),
        radioList('timeline', cfg.timelines, state.timeline, function (k) { state.timeline = k; render(); }),
        nav()
      ];
    },

    contact: function () {
      var form = h('form', { class: 'ie-form', novalidate: true, onsubmit: submitEstimate }, [
        h('h3', { class: 'ie-q', text: 'Where should we send your estimate?' }),
        h('p', { class: 'ie-sub', text: 'Your ballpark shows on the next screen, and we\'ll email you a copy.' }),
        field('Your name', input('name', { type: 'text', autocomplete: 'name', required: true })),
        field('Email', input('email', { type: 'email', autocomplete: 'email', required: true })),
        h('div', { class: 'ie-row' }, [
          field('Phone (optional)', input('phone', { type: 'tel', autocomplete: 'tel' })),
          field('Town', input('town', { type: 'text', autocomplete: 'address-level2' }))
        ]),
        // honeypot — hidden from people, bots fill it
        h('div', { class: 'ie-hp', 'aria-hidden': 'true' }, [input('website', { type: 'text', tabindex: '-1', autocomplete: 'off' })]),
        errorBox(errors),
        nav({ submit: true, label: busy ? 'Calculating…' : 'See my ballpark →', disabled: busy })
      ]);
      return [form];
    },

    result: function () {
      var r = state.result;
      return [
        h('div', { class: 'ie-result' }, [
          h('div', { class: 'ie-result-kicker', text: (r.firstName ? r.firstName + ', your' : 'Your') + ' ballpark range' }),
          h('div', { class: 'ie-result-range' }, [h('span', { text: money(r.low) }), ' – ', h('span', { text: money(r.high) })]),
          r.sqft ? h('div', { class: 'ie-result-sub', text: 'for about ' + r.sqft.toLocaleString() + ' sq ft' }) : null
        ]),
        h('p', { class: 'ie-disclaimer', text: r.disclaimer }),
        h('div', { class: 'ie-cta' }, [
          h('button', { type: 'button', class: 'ie-btn ie-btn-lg', onclick: function () { go(STEPS.indexOf('visit')); }, text: 'Request my free site visit' }),
          h('button', { type: 'button', class: 'ie-btn ie-btn-ghost', onclick: function () { state.declined = true; go(STEPS.indexOf('done')); }, text: 'Not right now' })
        ]),
        cfg.business.phone ? h('p', { class: 'ie-small' }, ['Rather talk it through? Call ', h('a', { href: 'tel:' + cfg.business.phone.replace(/[^\d+]/g, ''), text: cfg.business.phone })]) : null
      ];
    },

    visit: function () {
      var form = h('form', { class: 'ie-form', novalidate: true, onsubmit: submitVisit }, [
        h('h3', { class: 'ie-q', text: 'When works for a site visit?' }),
        h('p', { class: 'ie-sub', text: 'It\'s free and usually takes 20–30 minutes. We\'ll reach out to confirm a time.' }),
        h('div', { class: 'ie-label', text: 'Best days (pick any)' }),
        h('div', { class: 'ie-chips' }, cfg.days.map(function (d) {
          var on = state.visitDays.indexOf(d) > -1;
          return h('button', { type: 'button', class: 'ie-chip' + (on ? ' is-on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: function () {
            if (on) state.visitDays.splice(state.visitDays.indexOf(d), 1); else state.visitDays.push(d); render();
          }, text: d });
        })),
        h('div', { class: 'ie-label ie-mt', text: 'Best time of day' }),
        radioList('vtime', cfg.times.map(function (t) { return { key: t, label: t }; }), state.visitTime, function (k) { state.visitTime = k; render(); }),
        field('Anything we should know? (optional)', (function () {
          var t = h('textarea', { rows: '3', placeholder: 'Gate code, dog in the yard, best number to call…' });
          t.value = state.visitNotes; t.addEventListener('input', function () { state.visitNotes = t.value; }); return t;
        })()),
        errorBox(errors),
        h('div', { class: 'ie-nav' }, [
          h('button', { type: 'button', class: 'ie-btn ie-btn-ghost', onclick: function () { go(STEPS.indexOf('result')); }, text: '← Back' }),
          h('button', { type: 'submit', class: 'ie-btn', disabled: busy, text: busy ? 'Sending…' : 'Request site visit' })
        ])
      ]);
      return [form];
    },

    done: function () {
      var phone = cfg.business.phone;
      if (state.declined) {
        return [h('div', { class: 'ie-done' }, [
          h('h3', { class: 'ie-q', text: 'No problem — your estimate is in your inbox.' }),
          h('p', { text: 'When you\'re ready, use the link in that email to request your free site visit.' }),
          h('button', { type: 'button', class: 'ie-btn', onclick: function () { state.declined = false; go(STEPS.indexOf('visit')); }, text: 'Actually, let\'s book the visit' })
        ])];
      }
      return [h('div', { class: 'ie-done' }, [
        h('div', { class: 'ie-check', 'aria-hidden': 'true', text: '✓' }),
        h('h3', { class: 'ie-q', text: 'You\'re on the list!' }),
        h('p', { text: (cfg.business.name || 'We') + ' will reach out shortly to confirm your site visit.' }),
        phone ? h('p', {}, ['Need us sooner? Call ', h('a', { href: 'tel:' + phone.replace(/[^\d+]/g, ''), text: phone })]) : null
      ])];
    }
  };

  // ---------- API ----------
  var busy = false;
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, errors: ['Something went wrong. Please call us.'] }; }); });
  }

  function submitEstimate(e) {
    e.preventDefault();
    errors = [];
    if (!state.name.trim()) errors.push('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(state.email.trim())) errors.push('Please enter a valid email.');
    if (errors.length) return render();
    busy = true; render();
    var body = {
      projectType: state.projectType, sqft: sqft(), finish: state.finish, access: state.access, slope: state.slope,
      steps: state.steps, seatWallFt: state.seatWallFt, firePit: state.firePit, budget: state.budget, timeline: state.timeline,
      name: state.name, email: state.email, phone: state.phone, town: state.town, website: state.website
    };
    if (state.sizeMode === 'dims') { body.length = state.length; body.width = state.width; }
    post(API, body).then(function (res) {
      busy = false;
      if (!res.ok) { errors = res.errors || ['Something went wrong.']; return render(); }
      state.result = res; state.token = res.token;
      go(STEPS.indexOf('result'));
    }).catch(function () { busy = false; errors = ['Connection problem — please try again.']; render(); });
  }

  function submitVisit(e) {
    e.preventDefault();
    errors = []; busy = true; render();
    post(API + '/lead/' + encodeURIComponent(state.token) + '/visit', { days: state.visitDays, time: state.visitTime, notes: state.visitNotes })
      .then(function (res) {
        busy = false;
        if (!res.ok) { errors = res.errors || ['Something went wrong.']; return render(); }
        state.declined = false;
        go(STEPS.indexOf('done'));
      }).catch(function () { busy = false; errors = ['Connection problem — please try again.']; render(); });
  }

  // ---------- render ----------
  function render(keepFocus) {
    var activeId = keepFocus && document.activeElement && document.activeElement.id;
    var name = STEPS[step];
    var body = h('div', { class: 'ie-body ie-step-' + name }, views[name]());
    var pct = Math.min(100, Math.round((Math.min(step, PROGRESS_STEPS) / PROGRESS_STEPS) * 100));
    var header = step < PROGRESS_STEPS
      ? h('div', { class: 'ie-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) },
          [h('div', { class: 'ie-progress-bar', style: 'width:' + Math.max(pct, 6) + '%' })])
      : null;
    var stepLabel = step < PROGRESS_STEPS ? h('div', { class: 'ie-steplabel', text: 'Step ' + (step + 1) + ' of ' + PROGRESS_STEPS }) : null;
    root.innerHTML = '';
    root.className = 'ie-root';
    if (header) root.appendChild(header);
    if (stepLabel) root.appendChild(stepLabel);
    root.appendChild(body);
    // keep cursor in the size inputs while typing
    if (activeId) {
      var el = document.getElementById(activeId);
      if (el) { el.focus(); var v = el.value; el.value = ''; el.value = v; }
    }
  }

  // ---------- boot ----------
  root.className = 'ie-root';
  root.textContent = 'Loading estimate tool…';
  fetch(API + '/config').then(function (r) { return r.json(); }).then(function (c) {
    cfg = c;
    var m = /[?&]ie=([a-f0-9]{16,64})/.exec(window.location.search);
    if (!m) return render();
    // Returning from the email link → jump to the visit request.
    return fetch(API + '/lead/' + m[1]).then(function (r) { return r.json(); }).then(function (lead) {
      if (!lead.ok) return render();
      state.token = m[1];
      state.result = { low: lead.low, high: lead.high, firstName: lead.firstName, disclaimer: lead.disclaimer };
      step = STEPS.indexOf(lead.visitRequested ? 'done' : 'result');
      render();
      setTimeout(function () { root.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
    });
  }).catch(function () {
    root.textContent = 'The estimate tool is unavailable right now — please call us.';
  });
})();
