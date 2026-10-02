(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- year ---------- */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- mobile menu ---------- */
  var toggle = $('#menuToggle'), nav = $('#nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) setMenu(false); });
  }

  /* ---------- gallery: job-type tabs (home + /gallery) and lightbox ---------- */
  var grid = $('#galleryGrid');
  var DATA = window.LORIA_GALLERY || [];
  var LABELS = { all: 'All', patio: 'Patios', walk: 'Walkways & Stoops', pool: 'Pool Decks', drive: 'Driveways, Steps & Slabs', stone: 'Stone & Masonry', tile: 'Tile & Showers', detail: 'Medallions & Detail', commercial: 'Commercial', crew: 'The Crew at Work' };
  var isHome = grid && grid.hasAttribute('data-home');
  var curatedHTML = grid ? grid.innerHTML : '';
  var homeFilters = $('#homeFilters');

  function tile(d, wide) {
    var a = document.createElement('a');
    a.className = 'g-item' + (wide ? ' wide' : '');
    a.setAttribute('data-cat', d.cat); a.href = d.src;
    var img = document.createElement('img'); img.src = d.sm; img.alt = d.alt || d.cap; img.loading = 'lazy';
    if (d.w) { img.width = d.w; img.height = d.h; }
    var sp = document.createElement('span'); sp.textContent = d.cap;
    a.appendChild(img); a.appendChild(sp); return a;
  }

  if (isHome && homeFilters && DATA.length) {
    var counts = { all: DATA.length };
    DATA.forEach(function (d) { counts[d.cat] = (counts[d.cat] || 0) + 1; });
    Object.keys(LABELS).forEach(function (k, i) {
      if (!counts[k]) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip' + (i === 0 ? ' is-on' : ''); b.setAttribute('data-filter', k);
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.textContent = LABELS[k]; homeFilters.appendChild(b);
    });
  }

  function setChip(chip) {
    $$('.chip[data-filter]').forEach(function (c) { var on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on ? 'true' : 'false'); });
  }
  function filterTo(f) {
    if (!grid) return;
    if (isHome) {
      if (f === 'all') { grid.innerHTML = curatedHTML; return; }
      var list = DATA.filter(function (d) { return d.cat === f; });
      grid.innerHTML = '';
      // uniform tiles: one landscape feature (4 cells) + 7 singles + the "view all" tile = 12 cells, a clean fit at 4, 3 or 2 columns
      var lead = list.filter(function (d) { return d.w >= d.h; })[0] || list[0];
      grid.appendChild(tile(lead, true));
      list.filter(function (d) { return d !== lead; }).slice(0, 7).forEach(function (d) { grid.appendChild(tile(d, false)); });
      var more = document.createElement('a');
      more.className = 'g-item g-more'; more.href = '/gallery#' + f;
      more.innerHTML = '<b></b><em>View all in the gallery →</em>';
      more.querySelector('b').textContent = list.length + ' ' + LABELS[f];
      grid.appendChild(more);
    } else {
      $$('.g-item', grid).forEach(function (it) { it.classList.toggle('is-hidden', f !== 'all' && it.getAttribute('data-cat') !== f); });
    }
  }
  document.addEventListener('click', function (e) {
    var chip = e.target.closest && e.target.closest('.chip[data-filter]');
    if (!chip) return;
    setChip(chip); filterTo(chip.getAttribute('data-filter'));
  });

  if (window.LORIA_GALLERY) $$('.js-gcount').forEach(function (el) { el.textContent = window.LORIA_GALLERY.length; });
  if (location.hash) { var hc = $('.chip[data-filter="' + location.hash.slice(1) + '"]'); if (hc) hc.click(); }

  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), idx = 0, lastFocus = null;
  function visible() { return grid ? $$('.g-item:not(.g-more)', grid).filter(function (i) { return i.offsetParent !== null; }) : []; }
  function show(i) {
    var list = visible(); if (!list.length) return;
    idx = (i + list.length) % list.length;
    var a = list[idx];
    lbImg.src = a.getAttribute('href');
    lbImg.alt = a.querySelector('img').alt;
    lbCap.textContent = a.querySelector('span') ? a.querySelector('span').textContent : '';
  }
  function openLb(i) { lastFocus = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; $('.lb-close', lb).focus(); }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ''; lbImg.removeAttribute('src'); if (lastFocus) lastFocus.focus(); }
  if (grid && lb) grid.addEventListener('click', function (e) {
    var a = e.target.closest('.g-item'); if (!a || a.classList.contains('g-more')) return;
    e.preventDefault(); openLb(visible().indexOf(a));
  });
  if (lb) {
    $('.lb-close', lb).addEventListener('click', closeLb);
    $('.lb-prev', lb).addEventListener('click', function () { show(idx - 1); });
    $('.lb-next', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx == null) return; var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null;
    });
  }

  /* ---------- Quick-answer helper (no AI: every answer is Loria's own wording) ---------- */
  (function () {
    var home = location.pathname === '/' || location.pathname === '/index.html';
    var to = function (hash) { return (home ? '' : '/') + hash; };
    var A = {
      call: { label: 'Call (585) 727-8149', href: 'tel:+15857278149' },
      msg: { label: 'Message on Facebook', href: 'https://m.me/loriaconstruction585', ext: true },
      est: { label: 'Get my instant estimate', href: to('#estimate'), primary: true },
      form: { label: 'Send a message', href: to('#contact') },
      colors: { label: 'See the color chart', href: to('#faq-colors'), primary: true },
      area: { label: 'See the towns we serve', href: to('#area') },
      build: { label: 'Watch how we build it', href: to('#build'), primary: true },
      work: { label: 'See our work', href: '/gallery', primary: true }
    };
    var QA = [
      { q: 'Is the estimate free?', a: 'Yes, it\'s free. We come out in person so every measurement is right, and we can answer your questions on the spot.', act: ['est', 'call'] },
      { q: 'What will my project cost?', a: 'Every job is different, so your real price comes from the free on-site visit. Want a ballpark first? The Instant Estimate takes about a minute.', act: ['est', 'call'] },
      { q: 'What colors can I pick?', a: 'Lots. Integral colors are mixed right into the concrete, and release agents add an accent color in the stamped texture for a natural-stone look.', act: ['colors'] },
      { q: 'Do you work in my town?', a: 'We typically work within about 30 miles of Rochester, NY, and travel further for larger jobs.', act: ['area', 'call'] },
      { q: 'Are you insured?', a: 'Yes, fully insured. We keep proof of insurance on site while we work and can email it to you too.', act: ['call'] },
      { q: 'What do you build?', a: 'Stamped and decorative concrete, patios, pool decks, walkways, steps, driveways, pole barn and garage floors, brick, block, stone veneer, foundations, retaining walls and tile.', act: ['work'] },
      { q: 'How do you build a patio?', a: 'We dig out and haul away the old surface, lay a crushed-stone base, set a 2′ × 2′ rebar grid, and pour 4"+ of 4,000 PSI concrete. Then it\'s finished by hand.', act: ['build'] },
      { q: 'Talk to a person', a: 'We\'re available Monday to Saturday, 8am to 5pm. Call for the fastest answer, or send a message anytime.', act: ['call', 'msg', 'form'] }
    ];

    var wrap = document.createElement('div'); wrap.className = 'qa';
    wrap.innerHTML =
      '<div class="qa-panel" id="qaPanel" role="dialog" aria-label="Quick answers" hidden>' +
        '<div class="qa-head"><div><b>Quick answers</b><small>Loria Construction</small></div>' +
        '<button type="button" class="qa-x" aria-label="Close">×</button></div>' +
        '<div class="qa-log" aria-live="polite"><p class="qa-bot">Hi! Pick a question below. For anything else, give us a call.</p></div>' +
        '<div class="qa-chips"></div>' +
      '</div>' +
      '<button type="button" class="qa-btn" aria-expanded="false" aria-controls="qaPanel">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 9.5h8M8 12.5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<span>Questions?</span></button>';
    document.body.appendChild(wrap);
    var panel = $('.qa-panel', wrap), btn = $('.qa-btn', wrap), log = $('.qa-log', wrap), chips = $('.qa-chips', wrap);

    QA.forEach(function (item, i) {
      var c = document.createElement('button'); c.type = 'button'; c.className = 'qa-chip'; c.textContent = item.q;
      c.addEventListener('click', function () { answer(i); });
      chips.appendChild(c);
    });

    function answer(i) {
      var item = QA[i];
      var q = document.createElement('p'); q.className = 'qa-me'; q.textContent = item.q;
      var a = document.createElement('div'); a.className = 'qa-bot';
      var t = document.createElement('p'); t.textContent = item.a; a.appendChild(t);
      var acts = document.createElement('div'); acts.className = 'qa-acts';
      item.act.forEach(function (k) {
        var d = A[k], l = document.createElement('a');
        l.href = d.href; l.textContent = d.label; l.className = 'qa-act' + (d.primary ? ' is-primary' : '');
        if (d.ext) { l.target = '_blank'; l.rel = 'noopener'; }
        if (d.href.charAt(0) === '#' ) l.addEventListener('click', function () { close(); openTarget(d.href); });
        acts.appendChild(l);
      });
      a.appendChild(acts);
      log.appendChild(q); log.appendChild(a);
      log.scrollTop = log.scrollHeight;
    }
    function openTarget(hash) { var el = document.querySelector(hash); if (el && el.tagName === 'DETAILS') el.open = true; }
    function open() { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); wrap.classList.add('is-open'); $('.qa-chip', wrap).focus(); }
    function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); wrap.classList.remove('is-open'); }
    btn.addEventListener('click', function () { if (panel.hidden) open(); else { close(); btn.focus(); } });
    $('.qa-x', wrap).addEventListener('click', function () { close(); btn.focus(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    if (location.hash === '#faq-colors') openTarget('#faq-colors');
  })();

  /* ---------- "How we build it" video: play in view, sound toggle ---------- */
  var bv = $('#buildVideo'), bs = $('#buildSound');
  if (bv) {
    var tryPlay = function () { var p = bv.play(); if (p && p.catch) p.catch(function () {}); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { if (bv.preload === 'none') { bv.preload = 'auto'; } if (!reduceMotion()) tryPlay(); }
        else bv.pause();
      }, { threshold: 0.35 }).observe(bv);
    }
    if (bs) bs.addEventListener('click', function () {
      bv.muted = !bv.muted; tryPlay();
      bs.setAttribute('aria-pressed', bv.muted ? 'false' : 'true');
      bs.querySelector('span').textContent = bv.muted ? 'Sound on' : 'Sound off';
    });
    bv.addEventListener('click', function () { if (bv.paused) tryPlay(); else bv.pause(); });
  }
  function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------- Hero: video reel + gentle parallax ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  var hv = $('#heroVideos');
  if (hv && !reduce && !saveData) {
    var clips = []; try { clips = JSON.parse(hv.getAttribute('data-clips') || '[]'); } catch (e) {}
    if (clips.length) {
      var small = window.innerWidth < 700, cur = 0, players = [];
      var srcOf = function (c) { return (small && c.sm) ? c.sm : c.src; };
      var make = function () {
        var v = document.createElement('video');
        v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        if (clips.length === 1) v.loop = true;
        hv.appendChild(v); return v;
      };
      players = [make(), make()];
      var active = 0;
      var playClip = function (i) {
        var v = players[active], other = players[1 - active];
        v.src = srcOf(clips[i]);
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        v.oncanplay = function () { v.classList.add('is-on'); other.classList.remove('is-on'); v.oncanplay = null; };
        // preload the next clip in the other player
        if (clips.length > 1) { var n = (i + 1) % clips.length; setTimeout(function () { other.src = srcOf(clips[n]); other.load(); }, 1500); }
        v.onended = function () { active = 1 - active; cur = (cur + 1) % clips.length; playClip(cur); };
      };
      playClip(0);
      // pause when the hero is off screen (saves battery/data)
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) {
        players.forEach(function (v) { if (!v.src) return; if (en[0].isIntersecting) { if (v.classList.contains('is-on')) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } } else v.pause(); });
      }).observe(hv);
    }
  }
  var hm = $('#heroMedia');
  if (hm && !reduce) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { var y = Math.min(window.scrollY, window.innerHeight); hm.style.transform = 'translate3d(0,' + (y * 0.25) + 'px,0)'; ticking = false; });
    }, { passive: true });
  }

  /* ---------- CreteQuote frame: grow to fit the form (same-origin page) ---------- */
  var cq = $('#creteQuote');
  if (cq) {
    var fit = function () {
      try {
        var d = cq.contentDocument; if (!d || !d.body) return;
        var h = Math.max(d.body.scrollHeight, d.documentElement.scrollHeight);
        if (h > 200) cq.style.height = (h + 24) + 'px';
      } catch (e) { /* keep the CSS height */ }
    };
    cq.addEventListener('load', function () {
      fit();
      try {
        if ('ResizeObserver' in window) new ResizeObserver(fit).observe(cq.contentDocument.body);
        cq.contentDocument.addEventListener('click', function () { setTimeout(fit, 250); setTimeout(fit, 900); });
      } catch (e) {}
      setInterval(fit, 1500);
    });
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = $$('.section-head, .svc, .g-item, .process li, .review, .stamped-media, .stamped-copy, .about-copy, .about-media, .fb-card, .ig-col, .faq details, .contact-form');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  /* ---------- Facebook + Instagram embeds (load only when near view) ---------- */
  var social = $('#social'), socialLoaded = false;
  function loadSocial() {
    if (socialLoaded) return; socialLoaded = true;
    var fb = $('.fb-embed');
    if (fb) {
      var w = Math.min(500, Math.max(280, Math.round(fb.clientWidth)));
      var h = window.innerWidth < 700 ? 520 : 620;
      var src = fb.getAttribute('data-fb-src').replace(/width=\d+/, 'width=' + w).replace(/height=\d+/, 'height=' + h);
      var ifr = document.createElement('iframe');
      ifr.src = src; ifr.title = 'Loria Construction on Facebook'; ifr.loading = 'lazy';
      ifr.setAttribute('allow', 'encrypted-media; clipboard-write'); ifr.setAttribute('scrolling', 'no');
      ifr.style.height = h + 'px';
      fb.innerHTML = ''; fb.appendChild(ifr);
    }
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.instagram.com/embed.js';
    s.onload = function () { if (window.instgrm) window.instgrm.Embeds.process(); };
    document.body.appendChild(s);
  }
  if (social) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en, obs) { if (en[0].isIntersecting) { loadSocial(); obs.disconnect(); } }, { rootMargin: '600px 0px' }).observe(social);
    } else { loadSocial(); }
  }

  /* ---------- contact form ---------- */
  var form = $('#contactForm'), msg = $('#formMsg');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $$('.invalid', form).forEach(function (el) { el.classList.remove('invalid'); });
      var data = {};
      $$('input, select, textarea', form).forEach(function (el) { data[el.name] = el.value; });
      var errs = [];
      if ((data.name || '').trim().length < 2) { errs.push('name'); }
      if ((data.phone || '').replace(/\D/g, '').length < 10) { errs.push('phone'); }
      if (errs.length) {
        errs.forEach(function (n) { form.elements[n].classList.add('invalid'); });
        msg.className = 'form-msg err'; msg.textContent = 'Please add your name and a phone number we can reach you at.';
        form.elements[errs[0]].focus(); return;
      }
      var btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) {
            Object.keys((res.j && res.j.fields) || {}).forEach(function (n) { if (form.elements[n]) form.elements[n].classList.add('invalid'); });
            throw new Error((res.j && res.j.error) || 'Something went wrong.');
          }
          form.reset();
          msg.className = 'form-msg ok';
          msg.textContent = 'Thanks! Your message is in. We’ll get right back to you. Need us sooner? Call (585) 727-8149.';
        })
        .catch(function (err) { msg.className = 'form-msg err'; msg.textContent = err.message + ' You can also call (585) 727-8149.'; })
        .then(function () { btn.disabled = false; btn.textContent = 'Send message'; });
    });
  }
})();
