// make-redirects.mjs — run AFTER astro build. Writes dist/_redirects (adapted from the BLG build).
// Every page, post and archive is built at its OLD URL, so rules only cover addresses without a page of their own:
// the hand-mapped ones in src/site.config.mjs, old /<slug>/ post addresses (WordPress answered them with the dated
// post), feeds, date archives and WordPress internals. Refuses targets that were not built.
// Cloudflare Pages: exact path match, first match wins, 2000 static + 100 dynamic rules.
import fs from 'node:fs';
import path from 'node:path';
import { PAGE_REDIRECTS, SPLAT_REDIRECTS, BLOG_PATH } from '../src/site.config.mjs';

const DIST = 'dist';
const built = (p) => fs.existsSync(path.join(DIST, p, 'index.html')) || (/\.[a-z0-9]+$/.test(p) && fs.existsSync(path.join(DIST, p)));
const rules = new Map();
// variants: the address as WordPress printed it, plus the spelling without the trailing slash (not for feeds:
// WordPress only ever linked them with the slash, and the 2,000-rule limit is close)
const add = (from, to, exact = false) => {
  if (!/^https:\/\//.test(to) && !built(to)) throw new Error(`redirect target not built: ${from} -> ${to}`);   // https:// = another site (BLG)
  if (built(from) && !/\.[a-z0-9]+$/.test(from)) return;   // a built page owns this address
  const bare = from.replace(/\/$/, '');
  for (const v of new Set(exact ? [from] : [from, bare])) if (v && v !== to && !rules.has(v)) rules.set(v, to);
};
for (const [from, to] of Object.entries(PAGE_REDIRECTS)) add(from, to);
const posts = JSON.parse(fs.readFileSync('src/data/posts.json', 'utf8'));
const cats = JSON.parse(fs.readFileSync('src/data/categories.json', 'utf8'));
const tags = Object.values(JSON.parse(fs.readFileSync('src/data/tags.json', 'utf8')));
for (const p of posts) {
  add(`${p.path}feed/`, '/rss.xml', true);
  // the older /YYYY/MM/<slug>/ permalink (still linked from some posts and other sites) -> the post
  const [y, m] = p.date.slice(0, 7).split('-');
  add(`/${y}/${m}/${p.slug}/`, p.path);
}
for (const c of cats) add(`/category/${c.slug}/feed/`, '/rss.xml', true);
for (const t of tags) add(`/tag/${t.slug}/feed/`, '/rss.xml', true);
// categories without published posts (built only when they have posts)
for (const c of cats) if (!built(`/category/${c.slug}/`)) add(`/category/${c.slug}/`, BLOG_PATH);
const lines = [...rules].map(([a, b]) => `${a} ${b} 301`);
// media: old /wp-content/uploads/ URLs are answered by dist/_worker.js (301 to the WebP, map in src/data/images.json)
lines.push('/index.php / 301', '/index.php/ / 301', '/wp-includes/* / 301', '/wp-content/themes/* / 301', '/wp-content/plugins/* / 301', '/wp-content/cache/* / 301', '/wp-content/et-cache/* / 301');
for (const [a, b] of SPLAT_REDIRECTS) { if (!b.includes(':') && !built(b)) throw new Error(`redirect target not built: ${a} -> ${b}`); lines.push(`${a} ${b} 301`); }
lines.push('/index.php/* /:splat 301');   // LAST: catch-all
if (lines.length > 2000) throw new Error(`too many redirect rules: ${lines.length}`);
fs.writeFileSync(path.join(DIST, '_redirects'), lines.join('\n') + '\n');
console.log(`_redirects: ${lines.length} rules`);
const big = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? big(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size > 25 * 1024 * 1024 ? [path.join(dir, e.name)] : []);
const over = big(DIST);
if (over.length) throw new Error('files over 25 MB in dist: ' + over.join(', '));
