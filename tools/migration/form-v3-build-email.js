// Static Site Form Handler v3 — Build Email
// Body (from each site's Worker /api/form): { site, host, form, page, rows: [{ s: section, l: label, v: value }],
//   files: [{ name, type, label, data(base64) }], email, country, time, test }
// Also accepts the v2 shape { fields: { key: value } } so v2 sites can move over unchanged.
// SITES: one line per site. "to" may be overridden per form name with forms: { 'Form Name': 'a@x.com, b@y.com' }.
// Test or preview submissions (test:true, *.pages.dev, *.workers.dev, localhost) go ONLY to TEST_TO with [TEST].
// Spam screen as in the contact handler: held copies go only to SPAM_TO, never the client.
const b = ($input.first().json.body) || {};
const SITES = {
  'brandonlegalgroup.com': {
    label: 'Brandon Legal Group', bcc: 'jeff@studiohof.com',
    to: 'sean.storch@brandonlegalgroup.com, service@brandonlegalgroup.com',
    // recipients copied from each Gravity Forms / WP Job Openings notification on the live WordPress site (2026-10-26)
    forms: {
      'General Intake': 'sean.storch@brandonlegalgroup.com, service@brandonlegalgroup.com, marketing@brandonlegalgroup.com',
      'Family Law Intake': 'sean.storch@brandonlegalgroup.com, service@brandonlegalgroup.com, marketing@brandonlegalgroup.com',
      'Consultation Request': 'barbara.payne@brandonlegalgroup.com, sean.storch@brandonlegalgroup.com, service@brandonlegalgroup.com, blginquiries@hofinternetmarketing.com',
      'Message (Mediation page)': 'sean.storch@brandonlegalgroup.com, service@brandonlegalgroup.com, blginquiries@hofinternetmarketing.com',
      'Job Application': 'sean@brandonlegalgroup.com, marketing@brandonlegalgroup.com',
      'Review submitted on the website': 'service@brandonlegalgroup.com, marketing@brandonlegalgroup.com',
    },
  },
  // Brandon Divorce Help (brandondivorcehelp.com, Brandon Legal Group help site, Astro 2026-11): Privacy Center requests only.
  'brandondivorcehelp.com': { label: 'Brandon Divorce Help', bcc: 'jeff@studiohof.com', to: 'service@brandonlegalgroup.com' },
  'bethathand.com': {
    // For The Family (bethathand.com, Astro since 2026-10-30): Contact (Home and Contact pages) and Parental Mentoring Enrollment
    label: 'For The Family', bcc: 'jeff@studiohof.com',
    to: 'KindnessOfSpirit@gmail.com',
  },
  // HOF brands (Astro since 2026-10-31). Jeff 2026-11-01: every form goes to hello@<domain>; each is a Mailcow alias to jeff@jurisbranded.com (checked 2026-11-01).
  'legalbrandbuilders.com': { label: 'Legal Brand Builders', to: 'hello@legalbrandbuilders.com' },
  'locallegalmarketing.com': { label: 'Local Legal Marketing', to: 'hello@locallegalmarketing.com' },
  'studiohof.com': { label: 'StudioHOF', to: 'hello@studiohof.com' },
  'bethe20.com': { label: 'Be The 20', to: 'hello@bethe20.com' },
};
const TEST_TO = 'jeff@studiohof.com';
const SPAM_TO = 'jeff@studiohof.com';
const MAX_BYTES = 20 * 1024 * 1024;
const esc = (s) => String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
const site = String(b.site || '').toLowerCase().replace(/^www\./, '');
const host = String(b.host || '').toLowerCase();
const cfg = SITES[site];
let rows = Array.isArray(b.rows) ? b.rows : [];
if (!rows.length && b.fields && typeof b.fields === 'object') rows = Object.keys(b.fields).map((k) => ({ s: '', l: k.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()), v: b.fields[k] }));
rows = rows.map((r) => ({ s: String(r.s || ''), l: String(r.l || ''), v: String(r.v == null ? '' : r.v).trim() })).filter((r) => r.v);
const form = String(b.form || 'Website form').slice(0, 120);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
const email = isEmail(b.email) ? String(b.email).trim() : ((rows.find((r) => /e-?mail/i.test(r.l) && isEmail(r.v)) || {}).v || '');
const nameRow = rows.find((r) => /^(full )?name$|^your name$/i.test(r.l)) || {};
const first = (rows.find((r) => /first/i.test(r.l)) || {}).v || '', last = (rows.find((r) => /last/i.test(r.l)) || {}).v || '';
const name = String(nameRow.v || [first, last].join(' ')).replace(/\n/g, ' ').replace(/First:\s*|Last:\s*/g, '').trim();
const phone = (rows.find((r) => /phone/i.test(r.l)) || {}).v || '';
const preview = /\.(pages|workers)\.dev$/.test(host) || /^(localhost|127\.0\.0\.1)/.test(host);
const isTest = b.test === true || b.test === 'true' || preview;
const files = Array.isArray(b.files) ? b.files.slice(0, 5) : [];
const bytes = files.reduce((n, f) => n + Math.floor(String(f.data || '').length * 0.75), 0);
const valid = !!cfg && rows.length > 0 && rows.length <= 400 && bytes <= MAX_BYTES;

// ---- spam screen ----
const all = rows.map((r) => r.v).join('\n');
const reasons = [];
if (/<\s*a\s|href\s*=|\[url|\[link=/i.test(all)) reasons.push('contains HTML/BBCode links');
const urls = (all.match(/(https?:\/\/|www\.)\S+/gi) || []).length;
if (urls >= 3) reasons.push(urls + ' web addresses');
if (/\b(viagra|cialis|casino|betting|porn|escort|forex|crypto ?currency|bitcoin|payday loan|backlinks?|seo services|guest post)\b/i.test(all)) reasons.push('spam keywords');
if (/вЂ|Ð[\x80-\xBF]|Ã[\x80-\xBF]/.test(all)) reasons.push('garbled text encoding');
if (/[Ѐ-ӿ一-鿿]/.test(name)) reasons.push('non-Latin name');
const isSpam = valid && reasons.length > 0;

const label = cfg ? cfg.label : site;
let html = '';
if (isSpam) html += '<p style="background:#fff3cd;border:1px solid #e0c36a;padding:8px"><b>Held as spam — not sent to the client.</b> Reasons: ' + esc(reasons.join('; ')) + '.</p>';
html += '<h2 style="font:20px Arial,sans-serif">' + esc(label) + ' website: ' + esc(form) + '</h2><table style="border-collapse:collapse;font:15px Arial,sans-serif">';
let sec = null;
for (const r of rows) {
  if (r.s && r.s !== sec) { sec = r.s; html += '<tr><td colspan="2" style="padding:14px 0 4px;font-weight:bold;font-size:16px;border-bottom:1px solid #ccc">' + esc(sec) + '</td></tr>'; }
  html += '<tr><td style="padding:4px 14px 4px 0;vertical-align:top;font-weight:bold;max-width:280px">' + esc(r.l) + '</td><td style="padding:4px 0;vertical-align:top">' + esc(r.v).split('\n').join('<br>') + '</td></tr>';
}
html += '</table>';
if (files.length) html += '<p><b>Attached:</b> ' + files.map((f) => esc(f.name) + (f.label ? ' (' + esc(f.label) + ')' : '')).join(', ') + '</p>';
html += '<hr><p><small>Page: ' + esc(b.page || '') + '<br>Sent ' + esc(b.time || new Date().toISOString()) + ' from ' + esc(host || site) + ' &middot; ' + esc(b.country || '') + (email ? '. Reply to this email to answer ' + esc(name || email) + ' directly.' : '. No email address was given.') + '</small></p>';

let toEmail = isTest ? TEST_TO : (cfg ? ((cfg.forms && cfg.forms[form]) || cfg.to) : '');
let bccEmail = (!isTest && cfg && cfg.bcc && cfg.bcc !== toEmail) ? cfg.bcc : '';
let subject = (isTest ? '[TEST] ' : '') + '[' + label + '] ' + form + ' from ' + (name || email || 'a visitor') + (phone ? ' (' + phone.replace(/\n/g, ' ') + ')' : '');
if (isSpam) { toEmail = SPAM_TO; bccEmail = ''; subject = '[HELD AS SPAM] ' + subject; }

const binary = {};
const names = [];
files.forEach((f, i) => {
  const k = 'attachment_' + i;
  binary[k] = { data: String(f.data || ''), mimeType: String(f.type || 'application/octet-stream'), fileName: String(f.name || ('file-' + i)).replace(/[^A-Za-z0-9._ ()-]/g, '_') };
  names.push(k);
});
const log = { site, form, host, page: String(b.page || '').slice(0, 300), name, phone: String(phone).slice(0, 60), email,
  message: rows.filter((r) => /message|comment|tell us|describe|case/i.test(r.l)).map((r) => r.v).join('\n').slice(0, 5000),
  all_fields: JSON.stringify(rows.map((r) => [r.s, r.l, r.v])).slice(0, 20000) + (files.length ? ' FILES: ' + files.map((f) => f.name).join(', ') : ''),
  sent_to: valid ? toEmail : '', status: valid ? (isSpam ? 'held-spam' : 'emailed') : 'rejected', test: !!isTest, country: String(b.country || '') };
const out = { json: { verdict: valid ? 'send' : 'reject', site, host, form, toEmail, bccEmail, log, fromEmail: label + ' website <n8n@jurisbranded.com>', replyTo: email || TEST_TO, subject, html, attachmentNames: names.join(',') } };
if (names.length && valid) out.binary = binary;
return [out];
