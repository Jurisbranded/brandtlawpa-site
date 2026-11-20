// Data access for the site (src/data/*.json, written by the tools in /tools at migration time).
//
// Posts come from two places (same contract as the CDB site, so the n8n Article Producer v10 and the
// Article Store work unchanged):
//   1. src/data/posts.json      the import from WordPress (21 posts kept, frozen at cutover)
//   2. src/data/posts/*.json    one file per new article, written by the n8n Article Producer
// A file in the folder wins over an imported post with the same slug.
//
// Scheduling: a post dated in the future (site time, America/New_York) is left out of the build, so it
// appears on the first build on or after its date (the site is rebuilt every morning after 7 AM).
// Only status 'publish' (or no status, as in the import) is built on the live site. Preview builds
// (SHOW_FUTURE=1, or a Cloudflare Pages build of any branch other than main) show everything.
import imported from '../data/posts.json';
import categories from '../data/categories.json';
import tags from '../data/tags.json';
import { BLOG_PER_PAGE, CAT_PER_PAGE, HOME_PER_PAGE, SITE } from '../site.config.mjs';
import { SEO } from '../seo.mjs';

const fileModules = import.meta.glob('../data/posts/*.json', { eager: true, import: 'default' });

function siteNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}
const previewBranch = process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main';
const showFuture = previewBranch || ['1', 'true', 'yes'].includes(String(process.env.SHOW_FUTURE || '').toLowerCase());
const NOW = siteNow();

export const TAGS = { ...tags };
function normTags(list) {
  return (list || []).map((t) => {
    if (t && typeof t === 'object') {
      const key = `n:${t.slug}`;
      if (!TAGS[key]) TAGS[key] = { slug: t.slug, name: t.name || t.slug };
      return key;
    }
    return String(t);
  });
}
function check(p, file) {
  for (const k of ['slug', 'path', 'title', 'date', 'html']) if (!p[k]) throw new Error(`${file}: missing "${k}"`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(p.date)) throw new Error(`${file}: date must be site-local YYYY-MM-DDTHH:MM:SS, got ${p.date}`);
}

const bySlug = new Map();
for (const p of imported) bySlug.set(p.slug, { ...p, tags: normTags(p.tags) });
for (const [file, raw] of Object.entries(fileModules)) {
  check(raw, file);
  bySlug.set(raw.slug, { modified: raw.date, categories: [], excerpt: '', robots: '', featured: null, ...raw, id: raw.id ?? `n:${raw.slug}`, tags: normTags(raw.tags) });
}
export const POSTS = [...bySlug.values()]
  .filter((p) => showFuture || (p.date <= NOW && (!p.status || p.status === 'publish')))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

// ---- categories: /category/<parent>/<slug>/ as on the live site (Divorce is a child of Family Law) ----
const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
export function catPath(c) {
  const parts = [];
  for (let x = c, guard = 0; x && guard < 6; x = catById[x.parent], guard++) parts.unshift(x.slug);
  return '/category/' + parts.join('/') + '/';
}
for (const c of categories) { c.path = catPath(c); c.posts = []; }
for (const p of POSTS) for (const id of p.categories) {
  // WordPress archives include posts of child categories too
  for (let c = catById[id], g = 0; c && g < 6; c = catById[c.parent], g++) if (!c.posts.includes(p)) c.posts.push(p);
}
export const CATEGORIES = categories.filter((c) => c.posts.length);
export const catsOf = (p) => p.categories.map((id) => catById[id]).filter(Boolean);
export const tagsOf = (p) => p.tags.map((id) => TAGS[id]).filter(Boolean);
// tag archives are not built (thin; /tag/* redirects to the blog). Tags stay as CSS classes on the post markup.
export { BLOG_PER_PAGE, CAT_PER_PAGE, HOME_PER_PAGE };

// ---- text helpers ----
export function strip(h) {
  return String(h || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;|&#8217;/gi, "'")
    .replace(/&#8220;|&#8221;/g, '"').replace(/&#8211;/g, '–').replace(/&#8212;/g, '—').replace(/\s+/g, ' ').trim();
}
export function clip(s, n = 158) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1); return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:–—-]$/, '') + '…';
}
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Divi archive excerpt: the first ~270 characters of the article text, then "..."
export function archiveExcerpt(p) {
  const t = strip(p.html);
  if (t.length <= 270) return t;
  const cut = t.slice(0, 270); return cut.slice(0, cut.lastIndexOf(' ')) + '...';
}
// Titles and descriptions: written per page and post in src/seo.mjs (the live site had no descriptions at all);
// the live title pattern "<title> | Brandt Law, P.A." otherwise.
const cleanT = (t) => String(t || '').replace(/\s+[-–|]\s+(Allison J\.? Brandt,? P\.?A\.?|Brandt Law, P\.A\.)\s*$/i, '').replace(/\s+/g, ' ').trim();
export const postTitle = (p) => {
  if (SEO[p.path] && SEO[p.path].title) return SEO[p.path].title;
  const t = cleanT(p.seoTitle) || p.title, full = `${t} | ${SITE.name}`;
  return full.length <= 60 ? full : (t.length <= 60 ? t : clip(t, 60));
};
export const postDescription = (p) => (SEO[p.path] && SEO[p.path].description) || clip([p.description, p.excerpt, strip(p.html)].find((x) => x && x.length >= 110) || strip(p.html));
// "Mar 25, 2024" from the site-local date string (no time zone arithmetic, so the day never shifts)
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (iso) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return `${MON[m - 1]} ${d}, ${y}`; };
export const isoLocal = (iso) => (/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}-04:00`);

// Question/answer pairs from a post's visible FAQ section (h2 mentioning FAQ / frequently asked questions,
// then h3 questions). Used for FAQPage schema, which must only describe what is visible on the page.
export function faqOf(html) {
  const s = String(html || '');
  const heads = [...s.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => ({ at: m.index, end: m.index + m[0].length, text: strip(m[1]).toLowerCase() }));
  const i = heads.findIndex((h) => h.text.includes('frequently asked questions') || /\bfaqs?\b/.test(h.text));
  if (i === -1) return [];
  const section = s.slice(heads[i].end, i + 1 < heads.length ? heads[i + 1].at : s.length);
  const out = [];
  for (const part of section.split(/<h3[^>]*>/i).slice(1)) {
    const qe = part.search(/<\/h3>/i);
    if (qe === -1) continue;
    const q = strip(part.slice(0, qe)), a = strip(part.slice(qe + 5));
    if (q && a) out.push({ q, a: clip(a, 1000) });
  }
  return out;
}
export const hasOwnJsonLd = (html) => /application\/ld\+json/i.test(String(html || ''));

// Divi grid/archive excerpt (truncate_post 270): the article text cut at 270 characters, back to a word, then "..."
// (the live grids' own excerpts are used where they were captured: tools/migration/import-posts.py -> p.gridExcerpt)
export const gridExcerpt = (p) => p.gridExcerpt || p.excerpt || archiveExcerpt(p);
