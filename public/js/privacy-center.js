/* privacy-center.js — JB Privacy Center (modelled on the CGH Collections Privacy Center, cghcollections.com/privacy-center/).
   Shared by the HOF brand sites (LBB, LLM, SHOF, B20) and brandondivorcehelp.com. Source: /home/claude/ops/privacy-center/privacy-center.js
   1. Request buttons (Forget Me, Request My Data, Correct My Data, Unsubscribe, DMCA Notice, privacy question) open one
      short form in a dialog. /privacy-center/#forget-me (etc.) opens it straight away.
      Sent to /api/form as form "Privacy request" (same JSON as every site form: rows, ts, honeypot "website",
      Cloudflare Turnstile token), so the n8n v3 handler routes it like any other form. No email address in the page.
   2. Opt-out page: "Turn off Google Analytics in this browser" (localStorage jb-analytics-optout=1). site.js does not load
      the Google tag when that is set, or when the browser sends Global Privacy Control / Do Not Track. */
(function () {
  'use strict';
  var d = document, w = window;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* ---------- Google Analytics opt-out (opt-out page) ---------- */
  var KEY = 'jb-analytics-optout';
  var signal = !!(navigator.globalPrivacyControl || navigator.doNotTrack === '1' || w.doNotTrack === '1');
  function optedOut() { try { return w.localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function setOpt(v) { try { if (v) w.localStorage.setItem(KEY, '1'); else w.localStorage.removeItem(KEY); } catch (e) {} }
  $$('[data-pc-ga]').forEach(function (box) {
    var id = box.getAttribute('data-pc-ga'), btn = box.querySelector('button'), st = box.querySelector('[data-pc-ga-status]');
    function paint() {
      var off = optedOut() || signal;
      if (off && id) w['ga-disable-' + id] = true;
      st.textContent = signal ? 'Your browser sends a Global Privacy Control or Do Not Track signal, so Google Analytics is already off for you on this site.'
        : off ? 'Google Analytics is off in this browser.' : 'Google Analytics is on in this browser.';
      btn.textContent = off ? 'Turn Google Analytics back on' : 'Turn off Google Analytics in this browser';
      btn.hidden = signal;
    }
    btn.addEventListener('click', function () { var was = optedOut(); setOpt(!was); if (was && id) w['ga-disable-' + id] = false; paint(); });
    paint();
  });

  /* ---------- request form ---------- */
  var root = d.querySelector('.jb-pc-dsar');
  if (!root) return;
  // the dialog lives at the end of <body>, out of the Divi containers (their stacking contexts put the fixed header on top)
  var host = d.createElement('div'); host.className = 'jb-pc jb-pc-host'; d.body.appendChild(host);
  host.appendChild(root.querySelector('.jb-pc-overlay'));
  var ov = host.querySelector('.jb-pc-overlay'), form = host.querySelector('form'), title = host.querySelector('.jb-pc-title'),
    intro = host.querySelector('.jb-pc-intro'), msg = host.querySelector('.jb-pc-msg'), sel = form.querySelector('[name=request]'),
    std = host.querySelector('[data-pc-std]'), dmca = host.querySelector('[data-pc-dmca]'), submit = form.querySelector('[type=submit]');
  var INTRO_STD = 'Send us your request and we’ll action it. We only use these details to process and respond to your request.';
  var INTRO_DMCA = 'Report material you believe infringes your copyright. A complete notice identifies the work, points us to where it appears on our site, and includes the two sworn statements below.';
  var opened = 0, lastFocus = null;
  function labelOf(key) { var b = root.querySelector('[data-pc-open="' + key + '"]'); var o = sel.querySelector('option[value="' + key + '"]'); return (b && b.getAttribute('data-label')) || (o && o.textContent) || 'Request'; }
  function mode() {
    var key = sel.value, isD = key === 'contact-dmca';
    title.textContent = labelOf(key); intro.textContent = isD ? INTRO_DMCA : INTRO_STD;
    std.hidden = isD; dmca.hidden = !isD;
  }
  function open(key) {
    if (!sel.querySelector('option[value="' + key + '"]')) key = 'contact-dpo';
    sel.value = key; mode(); msg.textContent = ''; msg.className = 'jb-pc-msg';
    lastFocus = d.activeElement; ov.hidden = false; opened = opened || Date.now();
    var n = form.querySelector('[name=name]'); if (n) n.focus();
    loadTs().catch(function () {});
  }
  function close() { ov.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $$('[data-pc-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); open(b.getAttribute('data-pc-open')); }); });
  host.querySelector('.jb-pc-close').addEventListener('click', close);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden) close(); });
  sel.addEventListener('change', mode);
  var h = (location.hash || '').replace('#', '');
  if (h && sel.querySelector('option[value="' + h + '"]')) open(h);
  w.addEventListener('hashchange', function () { var k = location.hash.replace('#', ''); if (sel.querySelector('option[value="' + k + '"]')) open(k); });

  // Cloudflare Turnstile: the site's own loader when site.js exposes it (one script per page), else load it here.
  var SITEKEY = d.body.getAttribute('data-ts-key') || '', tsP = null, tsId = null;
  function loadTs() {
    if (!SITEKEY) return Promise.resolve(null);
    var own = w.JB_loadTurnstile || w.B20_loadTurnstile;
    if (own) return own();
    if (w.turnstile) return Promise.resolve(w.turnstile);
    return tsP || (tsP = new Promise(function (res, rej) {
      w.__jbPcTs = function () { res(w.turnstile); };
      var s = d.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__jbPcTs'; s.async = true;
      s.onerror = function () { tsP = null; rej(new Error('load')); }; d.head.appendChild(s);
    }));
  }
  function token() {
    if (!SITEKEY) return Promise.resolve('');
    return loadTs().then(function (ts) {
      return new Promise(function (res, rej) {
        var box = form.querySelector('[data-turnstile]');
        var timer = setTimeout(function () { rej(new Error('timeout')); }, 15000);
        if (tsId != null) { try { ts.remove(tsId); } catch (e) {} }
        tsId = ts.render(box, { sitekey: SITEKEY, size: 'invisible', execution: 'execute', appearance: 'interaction-only',
          callback: function (t) { clearTimeout(timer); res(t); }, 'error-callback': function () { clearTimeout(timer); rej(new Error('challenge')); return true; } });
        ts.execute(tsId);
      });
    });
  }
  function val(n) { var el = form.querySelector('[name=' + n + ']'); return el ? String(el.value || '').trim() : ''; }
  function checked(n) { var el = form.querySelector('[name=' + n + ']'); return !!(el && el.checked); }
  function say(t, cls) { msg.textContent = t; msg.className = 'jb-pc-msg' + (cls ? ' ' + cls : ''); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = sel.value, label = labelOf(key), isD = key === 'contact-dmca';
    if (!val('name') || !val('email')) return say('Please enter your name and email.', 'err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email'))) return say('Please enter a valid email address.', 'err');
    var rows = [{ s: '', l: 'Request', v: label }, { s: '', l: 'Name', v: val('name') }, { s: '', l: 'Email', v: val('email') }];
    if (isD) {
      if (!val('role') || !val('work') || !val('infringing_url') || !val('dmca_details') || !val('signature')) return say('Please complete all fields of the notice.', 'err');
      if (!checked('attest_goodfaith') || !checked('attest_accuracy')) return say('Both sworn statements must be checked for a valid DMCA notice.', 'err');
      var r = form.querySelector('[name=role]');
      rows.push({ s: 'DMCA notice', l: 'You are', v: r.options[r.selectedIndex].text },
        { s: 'DMCA notice', l: 'The work being infringed', v: val('work') },
        { s: 'DMCA notice', l: 'Where it appears on our site', v: val('infringing_url') },
        { s: 'DMCA notice', l: 'Details of the claim', v: val('dmca_details') },
        { s: 'DMCA notice', l: 'Good-faith statement', v: 'Yes: I have a good-faith belief that the use described is not authorized by the copyright owner, its agent, or the law.' },
        { s: 'DMCA notice', l: 'Accuracy statement', v: 'Yes: this notice is accurate, and under penalty of perjury I am the copyright owner or authorized to act on the owner’s behalf.' },
        { s: 'DMCA notice', l: 'Electronic signature', v: val('signature') });
    } else {
      [['phone', 'Phone'], ['address', 'Address'], ['details', 'Details']].forEach(function (p) { if (val(p[0])) rows.push({ s: '', l: p[1], v: val(p[0]) }); });
    }
    submit.disabled = true; say('Sending…');
    token().then(function (t) {
      return fetch('/api/form', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ form: 'Privacy request', page: location.pathname, ts: String(opened || Date.now()), website: val('website'), rows: rows, files: [], 'cf-turnstile-response': t }) });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, err: j.error }; }); })
      .then(function (res) {
        if (res.ok) {
          say(isD ? 'Thank you — your DMCA notice has been received. We’ll review it promptly.' : 'Thank you — your ' + label + ' request has been sent.', 'ok');
          $$('input:not([type=checkbox]), textarea', form).forEach(function (i) { i.value = ''; });
          $$('input[type=checkbox]', form).forEach(function (c) { c.checked = false; });
          var role = form.querySelector('[name=role]'); if (role) role.selectedIndex = 0;
          setTimeout(close, 2600);
        } else say(res.err || 'Something went wrong. Please try again.', 'err');
      })
      .catch(function (err) {
        var m = err && err.message;
        say(m === 'timeout' ? 'The security check took too long. Please try again.' : m === 'challenge' ? 'We could not confirm you are a person. Please reload the page and try again.' : 'Network error. Please try again.', 'err');
      })
      .then(function () { submit.disabled = false; });
  });
})();
