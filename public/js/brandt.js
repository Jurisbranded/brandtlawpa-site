/* brandtlawpa.com additions (no jQuery, no Divi scripts):
   - Book an Appointment popup (#appointment): opens from any link to #appointment, traps focus, Esc / backdrop / × close
   - required checkbox group in the appointment form (at least one contact method)
   - Divi number counters: the figures are written in (the live site animated them with Divi's script)
   - FAQ accordion (WPT FAQ markup): keyboard-operable buttons with aria-expanded
   - Blog search (/search/): searches the posts index in the browser
   - call clicks and form sends as Google Analytics events (when GA is loaded) */
(function () {
  'use strict';
  var d = document, w = window;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var ev = function (name, params) { try { if (w.gtag) w.gtag('event', name, params || {}); } catch (e) {} };

  /* ---------- appointment popup ---------- */
  var pop = d.getElementById('appointment');
  if (pop) {
    d.body.appendChild(pop);   // out of the footer, so it is never clipped
    var lastFocus = null;
    var focusables = function () { return $$('a[href], button:not([disabled]), input:not([type=hidden]):not([tabindex="-1"]), textarea, select', pop).filter(function (x) { return x.offsetParent !== null; }); };
    var open = function (e) {
      if (e) e.preventDefault();
      lastFocus = d.activeElement;
      pop.hidden = false; d.documentElement.classList.add('jb-popup-open');
      var f = pop.querySelector('input:not([type=hidden])'); if (f) setTimeout(function () { f.focus(); }, 30);
      ev('open_appointment_form');
    };
    var close = function () {
      pop.hidden = true; d.documentElement.classList.remove('jb-popup-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    d.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href="#appointment"]');
      if (a) { open(e); return; }
      if (e.target === pop || (e.target.closest && e.target.closest('.jb-popup__close'))) close();
    });
    d.addEventListener('keydown', function (e) {
      if (pop.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    if (location.hash === '#appointment') open();
  }

  /* ---------- required checkbox groups ---------- */
  $$('[data-required-group]').forEach(function (fs) {
    var boxes = $$('input[type=checkbox]', fs);
    var check = function () {
      var any = boxes.some(function (b) { return b.checked; });
      boxes[0].setCustomValidity(any ? '' : 'Please choose at least one contact method.');
    };
    boxes.forEach(function (b) { b.addEventListener('change', check); });
    check();
  });

  /* ---------- form sends and call clicks as GA events ---------- */
  d.addEventListener('submit', function (e) { var f = e.target; if (f && f.hasAttribute && f.hasAttribute('data-api')) ev('form_submit', { form_name: f.getAttribute('data-form-name') || 'form' }); }, true);
  d.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href^="tel:"]'); if (a) ev('click_to_call', { link_url: a.getAttribute('href') }); });

  /* ---------- Divi number counters ---------- */
  $$('.et_pb_number_counter[data-number-value]').forEach(function (c) {
    var v = Number(c.getAttribute('data-number-value')) || 0;
    var sep = c.getAttribute('data-number-separator') || ',';
    var out = c.querySelector('.percent-value');
    if (out) out.textContent = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  });

  /* ---------- FAQ accordion (WPT FAQ) ---------- */
  $$('.wpt-faq-item').forEach(function (it, i) {
    var q = it.querySelector('.wpt-faq-question'), a = it.querySelector('.wpt-faq-answer');
    if (!q || !a) return;
    a.id = a.id || 'faq-answer-' + i;
    q.setAttribute('role', 'button'); q.setAttribute('tabindex', '0'); q.setAttribute('aria-controls', a.id);
    var set = function (open) {
      it.setAttribute('data-wpt-faq-state', open ? 'open' : 'close'); q.setAttribute('aria-expanded', open ? 'true' : 'false');
      a.hidden = !open;
    };
    set(it.getAttribute('data-wpt-faq-initial-state') === 'open' || location.hash === '#' + it.id);
    var toggle = function () {
      var open = it.getAttribute('data-wpt-faq-state') !== 'open';
      if (open) $$('.wpt-faq-item[data-wpt-faq-state="open"]').forEach(function (o) { if (o !== it) { o.setAttribute('data-wpt-faq-state', 'close'); var oq = o.querySelector('.wpt-faq-question'), oa = o.querySelector('.wpt-faq-answer'); if (oq) oq.setAttribute('aria-expanded', 'false'); if (oa) oa.hidden = true; } });
      set(open);
    };
    q.addEventListener('click', toggle);
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  /* ---------- blog search (/search/) ---------- */
  var box = d.getElementById('jb-search-results');
  if (box) {
    var q = (new URLSearchParams(location.search).get('q') || '').trim();
    var input = d.getElementById('jb-search-q'); if (input) input.value = q;
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    if (!q) { box.innerHTML = '<p>Type a word or phrase above to search the blog.</p>'; return; }
    fetch('/search-index.json').then(function (r) { return r.json(); }).then(function (posts) {
      var words = q.toLowerCase().split(/\s+/).filter(Boolean);
      var hits = posts.map(function (p) {
        var hay = (p.t + ' ' + p.x).toLowerCase(), title = p.t.toLowerCase(), score = 0;
        for (var i = 0; i < words.length; i++) { if (hay.indexOf(words[i]) === -1) return null; score += title.indexOf(words[i]) !== -1 ? 3 : 1; }
        return { p: p, s: score };
      }).filter(Boolean).sort(function (a, b) { return b.s - a.s; });
      box.innerHTML = '<p role="status">' + hits.length + ' article' + (hits.length === 1 ? '' : 's') + ' found for “' + esc(q) + '”.</p>' +
        hits.map(function (h) { return '<article class="et_pb_post"><h2 class="entry-title"><a href="' + h.p.u + '">' + esc(h.p.t) + '</a></h2><p class="post-meta">' + esc(h.p.d) + '</p><p>' + esc(h.p.e) + '</p></article>'; }).join('');
    }).catch(function () { box.innerHTML = '<p>Search is not available right now. Please browse the <a href="/blog/">blog</a>.</p>'; });
  }
})();
