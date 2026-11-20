/* site.js — what the live site needed jQuery and the Divi scripts for, in one small file (adapted from the BLG build).
   Phone menu, toggles/accordions, Divi video overlays, the blog grid's column flow, YouTube click-to-play, mail buttons,
   forms (any form[data-api] posts to /api/form with Turnstile), and the Google tag, which loads last. */
(function () {
  'use strict';
  var d = document, w = window;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* ---------- phone/tablet menu (Divi .mobile_nav) ---------- */
  $$('.mobile_nav .mobile_menu_bar').forEach(function (bar) {
    var nav = bar.closest('.mobile_nav'), ul = nav.querySelector('.et_mobile_menu');
    bar.setAttribute('role', 'button'); bar.setAttribute('tabindex', '0'); bar.setAttribute('aria-label', 'Menu'); bar.setAttribute('aria-expanded', 'false');
    var toggle = function (e) {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      var open = !nav.classList.contains('opened');
      nav.classList.toggle('opened', open); nav.classList.toggle('closed', !open);
      if (ul) ul.style.display = open ? 'block' : 'none';
      bar.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    bar.addEventListener('click', toggle); bar.addEventListener('keydown', toggle);
    var sel = nav.querySelector('.select_page'); if (sel) sel.addEventListener('click', toggle);
  });
  $$('#top-menu li.menu-item-has-children > a').forEach(function (a) {
    a.addEventListener('focus', function () { a.parentNode.classList.add('et-hover', 'et-show-dropdown'); });
    a.parentNode.addEventListener('focusout', function (e) { if (!a.parentNode.contains(e.relatedTarget)) a.parentNode.classList.remove('et-hover', 'et-show-dropdown'); });
  });

  /* ---------- toggles and accordions (Divi .et_pb_toggle) ---------- */
  $$('.et_pb_toggle').forEach(function (t) {
    var title = t.querySelector('.et_pb_toggle_title'), body = t.querySelector('.et_pb_toggle_content');
    if (!title || !body) return;
    title.setAttribute('role', 'button'); title.setAttribute('tabindex', '0');
    var setOpen = function (el, open) {
      el.classList.toggle('et_pb_toggle_open', open); el.classList.toggle('et_pb_toggle_close', !open);
      var b = el.querySelector('.et_pb_toggle_content'); if (b) b.style.display = open ? 'block' : 'none';
      var tt = el.querySelector('.et_pb_toggle_title'); if (tt) tt.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    setOpen(t, t.classList.contains('et_pb_toggle_open'));
    var go = function (e) {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      var open = !t.classList.contains('et_pb_toggle_open');
      var acc = t.closest('.et_pb_accordion');
      if (acc && !open) return;   // Divi accordions keep one item open
      if (acc) $$('.et_pb_toggle', acc).forEach(function (o) { if (o !== t) setOpen(o, false); });
      setOpen(t, open);
    };
    title.addEventListener('click', go); title.addEventListener('keydown', go);
  });

  /* ---------- Divi video module: the image overlay hides the player until clicked ---------- */
  $$('.et_pb_video_overlay').forEach(function (o) {
    o.addEventListener('click', function () {
      var box = o.closest('.et_pb_video'), f = box && box.querySelector('iframe, .yt-facade button, video');
      o.style.display = 'none';
      if (f && f.tagName === 'BUTTON') f.click();
      else if (f && f.tagName === 'IFRAME' && !/autoplay=1/.test(f.src)) f.src += (f.src.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1';
      else if (f && f.play) f.play();
    });
  });

  /* ---------- Divi blog grid (Salvattore): items flow into as many columns as the CSS asks for ---------- */
  $$('.et_pb_salvattore_content').forEach(function (grid) {
    var items = $$('article', grid).sort(function (a, b) {
      var n = function (x) { var m = x.className.match(/et_pb_blog_item_\d+_(\d+)/); return m ? +m[1] : 0; }; return n(a) - n(b);
    });
    var last = '';
    function flow() {
      var c = (getComputedStyle(grid, '::before').content || '').replace(/["']/g, '');
      var m = c.match(/^(\d+)\s+(.*)$/); if (!m || c === last) return; last = c;
      var n = +m[1], cls = m[2].split('.').filter(Boolean);
      grid.innerHTML = '';
      var cols = [];
      for (var i = 0; i < n; i++) { var col = d.createElement('div'); col.className = cls.join(' '); cols.push(col); grid.appendChild(col); }
      items.forEach(function (it, k) { cols[k % n].appendChild(it); });
    }
    flow(); w.addEventListener('resize', flow);
  });

  /* ---------- Divi slider (home post slider): arrows and dots, as the Divi script did (no autoplay on the live site) ---------- */
  $$('.et_pb_slider').forEach(function (sl) {
    var slides = $$('.et_pb_slide', sl), dots = $$('.et-pb-controllers a', sl), cur = 0;
    if (slides.length < 2) return;
    function show(n) {
      cur = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('et-pb-active-slide', i === cur); s.style.display = i === cur ? 'block' : 'none'; s.setAttribute('aria-hidden', i === cur ? 'false' : 'true'); });
      dots.forEach(function (a, i) { a.classList.toggle('et-pb-active-control', i === cur); a.setAttribute('aria-current', i === cur ? 'true' : 'false'); });
    }
    dots.forEach(function (a, i) { a.setAttribute('aria-label', 'Show slide ' + (i + 1)); a.addEventListener('click', function (e) { e.preventDefault(); show(i); }); });
    var prev = sl.querySelector('.et-pb-arrow-prev'), next = sl.querySelector('.et-pb-arrow-next');
    if (prev) prev.addEventListener('click', function (e) { e.preventDefault(); show(cur - 1); });
    if (next) next.addEventListener('click', function (e) { e.preventDefault(); show(cur + 1); });
    // every slide as tall as the tallest one, as Divi's script did (et_fix_slider_height), so the slider never jumps
    function fit() {
      var conts = slides.map(function (s) { return s.querySelector('.et_pb_container'); }).filter(Boolean), max = 0;
      conts.forEach(function (c) { c.style.height = ''; });
      slides.forEach(function (s) { var d = s.style.display; s.style.display = 'block'; var c = s.querySelector('.et_pb_container'); if (c) max = Math.max(max, c.offsetHeight); s.style.display = d; });
      conts.forEach(function (c) { c.style.height = max + 'px'; });
    }
    show(0); fit();
    w.addEventListener('resize', fit); if (d.fonts && d.fonts.ready) d.fonts.ready.then(fit);
  });

  /* ---------- email links: address kept out of the page, mailto built on click ---------- */
  $$('[data-mail]').forEach(function (a) { a.setAttribute('aria-label', 'Send an email to Brandt Law, P.A.'); });
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-mail]');
    if (a) { e.preventDefault(); try { location.href = 'mailto:' + atob(a.getAttribute('data-mail')); } catch (x) {} }
  });

  /* ---------- YouTube: thumbnail until clicked ---------- */
  $$('.yt-facade').forEach(function (f) {
    f.addEventListener('click', function () {
      var id = f.getAttribute('data-yt');
      f.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" title="Video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>';
    }, { once: true });
  });

  /* ---------- forms: any form[data-api] -> /api/form (Turnstile invisible, honeypot, timing) ---------- */
  var SITEKEY = d.body.getAttribute('data-ts-key') || '', tsLoading = null;
  function loadTurnstile() {
    if (!SITEKEY) return Promise.resolve(null);
    return tsLoading || (tsLoading = new Promise(function (res, rej) {
      w.__tsReady = function () { res(w.turnstile); };
      var s = d.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__tsReady'; s.async = true;
      s.onerror = function () { tsLoading = null; rej(new Error('load')); }; d.head.appendChild(s);
    }));
  }
  w.JB_loadTurnstile = loadTurnstile;   // shared with privacy-center.js (one Turnstile script per page)
  function tsToken(form) {
    if (!SITEKEY) return Promise.resolve('');
    return loadTurnstile().then(function (ts) {
      return new Promise(function (res, rej) {
        var box = form.querySelector('[data-turnstile]');
        if (!box) { box = d.createElement('div'); box.setAttribute('data-turnstile', ''); form.appendChild(box); }
        var timer = setTimeout(function () { rej(new Error('timeout')); }, 15000);
        if (form.__tsId != null) { try { ts.reset(form.__tsId); } catch (e) {} }
        form.__tsId = ts.render(box, { sitekey: SITEKEY, size: 'invisible', execution: 'execute', appearance: 'interaction-only',
          callback: function (t) { clearTimeout(timer); res(t); }, 'error-callback': function () { clearTimeout(timer); rej(new Error('challenge')); return true; } });
        ts.execute(form.__tsId);
      });
    });
  }
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim() : ''; };
  function say(form, msg, cls) {
    var box = form.querySelector('.jb-form-msg');
    if (!box) { box = d.createElement('div'); box.className = 'jb-form-msg'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); form.appendChild(box); }
    box.textContent = msg; box.className = 'jb-form-msg' + (cls ? ' jb-form-msg--' + cls : '');
  }
  function setupForm(form) {
    form.setAttribute('novalidate', '');
    var ts = d.createElement('input'); ts.type = 'hidden'; ts.name = 'ts'; ts.value = String(Date.now()); form.appendChild(ts);
    var hp = d.createElement('div'); hp.setAttribute('aria-hidden', 'true'); hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';
    hp.innerHTML = '<label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>'; form.appendChild(hp);
    ['focusin', 'pointerdown'].forEach(function (ev) { form.addEventListener(ev, function () { loadTurnstile().catch(function () {}); }, { once: true, passive: true }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var rows = [];
      $$('input[name]:not([type=hidden]):not([name=website]), select[name], textarea[name]', form).forEach(function (el) {
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
        var v = String(el.value || '').trim(); if (!v) return;
        var lab = form.querySelector('label[for="' + el.id + '"]');
        if (el.type === 'checkbox' || el.type === 'radio') { var fs = el.closest('fieldset'); var lg = fs && fs.querySelector('legend'); lab = lg; v = txt(el.closest('label')) || v; }
        rows.push({ s: '', l: txt(lab).replace(/\s*\((required[^)]*)\)\s*$/i, '') || el.name, v: v });
      });
      var btn = form.querySelector('[type=submit]'); if (btn) btn.disabled = true;
      say(form, 'Sending…');
      tsToken(form).then(function (token) {
        return fetch('/api/form', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ form: form.getAttribute('data-form-name') || 'Website form', page: location.pathname, ts: ts.value, website: form.querySelector('[name=website]').value, rows: rows, files: [], 'cf-turnstile-response': token }) });
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, err: j.error }; }); })
        .then(function (res) {
          if (res.ok) {
            say(form, form.getAttribute('data-success') || 'Thank you. Your message has been sent.', 'ok');
            form.reset();
            w.gtag('event', 'generate_lead', { form: 'contact', form_name: form.getAttribute('data-form-name') || 'Website form' });
          } else { say(form, res.err || 'Sorry, that did not go through. Please try again, or call us.', 'err'); }
          if (btn) btn.disabled = false;
        })
        .catch(function () { say(form, 'Sorry, that did not go through. Please try again, or call us.', 'err'); if (btn) btn.disabled = false; });
    });
  }
  $$('form[data-api]').forEach(setupForm);

  /* ---------- Google tag: loads last (first scroll/tap/touch/key, or 4 s after load), real domain only ---------- */
  var GA = w.JB_GA4, gaDone = false;
  function loadGA() {
    try { if (navigator.globalPrivacyControl || navigator.doNotTrack === '1' || window.localStorage.getItem('jb-analytics-optout') === '1') return; } catch (e) {}   // Privacy Center opt-out, GPC / Do Not Track
    if (gaDone || !GA || !/(^|\.)brandtlawpa\.com$/.test(location.hostname)) return; gaDone = true;
    var s = d.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA; d.head.appendChild(s);
  }
  ['scroll', 'pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { w.addEventListener(ev, loadGA, { once: true, passive: true }); });
  if (d.readyState === 'complete') setTimeout(loadGA, 4000); else w.addEventListener('load', function () { setTimeout(loadGA, 4000); });
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (a) w.gtag('event', 'call_click', { link_url: a.getAttribute('href') });
  });
})();
