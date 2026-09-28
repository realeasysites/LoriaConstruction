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

  /* ---------- gallery filters ---------- */
  var items = $$('.g-item'), grid = $('#galleryGrid'), showAll = $('#showAll'), SHOW = 12;
  items.forEach(function (it, i) { if (i >= SHOW) it.classList.add('is-extra'); });
  if (showAll) {
    showAll.textContent = 'See all ' + items.length + ' projects';
    showAll.addEventListener('click', function () { grid.classList.add('show-all'); showAll.parentNode.hidden = true; });
  }
  $$('.chip[data-filter]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      $$('.chip[data-filter]').forEach(function (c) { var on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on ? 'true' : 'false'); });
      items.forEach(function (it) { it.classList.toggle('is-hidden', f !== 'all' && it.getAttribute('data-cat') !== f); });
      if (f !== 'all') grid.classList.add('show-all');
      if (showAll) showAll.parentNode.hidden = grid.classList.contains('show-all');
    });
  });

  $$('[data-jump-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      var chip = $('.chip[data-filter="' + b.getAttribute('data-jump-filter') + '"]');
      if (chip) chip.click();
      $('#gallery').scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- lightbox ---------- */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), idx = 0, lastFocus = null;
  function visible() { return items.filter(function (i) { return i.offsetParent !== null; }); }
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
  items.forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); openLb(visible().indexOf(a)); });
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
