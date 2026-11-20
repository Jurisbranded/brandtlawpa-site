// POST /api/form — forms on brandtlawpa.com (the BLG pattern): the Book an Appointment form (footer popup) and the
// Privacy Center request form (public/js/privacy-center.js). Any form[data-api] posts here.
// No imports: tools/make-worker.mjs inlines this file into dist/_worker.js.
//
// Browser sends JSON: { form, page, ts, website, rows: [{ s: section, l: label, v: value }], files: [{ name, type, label, data(base64) }],
//                       'cf-turnstile-response' }
// Checks, in order:
//   1. honeypot "website" filled, or sent under 3 s after the page loaded -> fake success, nothing forwarded
//   2. Cloudflare Turnstile token verified with env.TURNSTILE_SECRET (skipped only on preview hosts while FORM_TEST_MODE=1)
//   3. limits: 400 rows, 10,000 characters per answer, 5 files, 20 MB of files in total, allowed file types
//   4. forwarded to env.N8N_FORM_URL (fallback env.N8N_WEBHOOK_URL, the name the Oct-9 setup used) = n8n
//      "[CLIENT] Static Site Form Handler v3 (sections + attachments)" (wf 1xn3ses4GGAacwD3); success ONLY when n8n answers {"ok":true}
// Pages project settings (never in this repo): N8N_FORM_URL, TURNSTILE_SECRET, optional FORM_TEST_MODE=1.
const SITE = 'brandtlawpa.com';
const MAX_ROWS = 400, MAX_VAL = 10000, MAX_FILES = 5, MAX_BYTES = 20 * 1024 * 1024;
const FILE_OK = /\.(pdf|docx?|xlsx?|csv|txt|rtf|jpe?g|png|gif|heic|webp|tiff?)$/i;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const isPreview = (host) => /\.(pages|workers)\.dev$/.test(host) || /^(localhost|127\.0\.0\.1)/.test(host);

async function turnstileOk(env, token, ip) {
  if (!token) return false;
  const body = new URLSearchParams({ secret: String(env.TURNSTILE_SECRET).trim(), response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const j = await r.json().catch(() => null);
    return Boolean(j && j.success === true);
  } catch { return false; }
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'The form could not be read. Please try again.' }, 400); }
  if (!b || typeof b !== 'object') return json({ ok: false, error: 'The form could not be read.' }, 400);
  const host = new URL(request.url).hostname;
  const ts = Number(b.ts);
  if (String(b.website || '').trim() || (ts && Date.now() - ts < 3000)) return json({ ok: true });   // bots: pretend it worked

  const HOOK = env.N8N_FORM_URL || env.N8N_WEBHOOK_URL;
  if (!HOOK) return json({ ok: false, error: 'The form is not connected yet. Please call us at (813) 474-9323.' }, 503);
  const testMode = Boolean(env.FORM_TEST_MODE) && isPreview(host);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!testMode) {
    if (!env.TURNSTILE_SECRET) return json({ ok: false, error: 'The form is not connected yet. Please call us at (813) 474-9323.' }, 503);
    if (!(await turnstileOk(env, b['cf-turnstile-response'], ip))) return json({ ok: false, error: 'We could not confirm you are a person. Please reload the page and try again.' }, 403);
  }

  const rows = Array.isArray(b.rows) ? b.rows : [];
  if (!rows.length) return json({ ok: false, error: 'The form was empty.' }, 400);
  if (rows.length > MAX_ROWS) return json({ ok: false, error: 'Too many answers.' }, 400);
  const clean = [];
  for (const r of rows) {
    const v = String((r && r.v) ?? '').replace(/\u0000/g, '').trim();
    if (!v) continue;
    if (v.length > MAX_VAL) return json({ ok: false, error: 'One of the answers is too long.' }, 400);
    clean.push({ s: String(r.s || '').slice(0, 200), l: String(r.l || '').slice(0, 300), v });
  }
  const files = Array.isArray(b.files) ? b.files : [];
  if (files.length > MAX_FILES) return json({ ok: false, error: `Please attach no more than ${MAX_FILES} files.` }, 400);
  let bytes = 0;
  const outFiles = [];
  for (const f of files) {
    const name = String(f.name || 'file').replace(/[^A-Za-z0-9._ ()-]/g, '_').slice(0, 120);
    if (!FILE_OK.test(name)) return json({ ok: false, error: `Files of this type cannot be sent: ${name}` }, 400);
    const data = String(f.data || '');
    bytes += Math.floor(data.length * 0.75);
    outFiles.push({ name, type: String(f.type || '').slice(0, 100), label: String(f.label || '').slice(0, 200), data });
  }
  if (bytes > MAX_BYTES) return json({ ok: false, error: 'The attached files are too large to send through the website (20 MB in total). Please call us instead.' }, 400);
  const email = (clean.find((r) => /e-?mail/i.test(r.l) && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.v)) || {}).v || '';

  const payload = {
    site: SITE, host, form: String(b.form || 'Website form').slice(0, 120), page: String(b.page || '').slice(0, 300),
    rows: clean, files: outFiles, email,
    ip, country: (request.cf && request.cf.country) || request.headers.get('CF-IPCountry') || '',
    userAgent: (request.headers.get('User-Agent') || '').slice(0, 300), time: new Date().toISOString(),
    test: testMode || isPreview(host),
  };
  try {
    const r = await fetch(HOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => null);
    if (r.ok && j && j.ok === true) return json({ ok: true });
  } catch { /* fall through */ }
  return json({ ok: false, error: 'Sorry, that did not go through. Please try again, or call us at (813) 474-9323.' }, 502);
}

export async function onRequestGet() {
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
}
