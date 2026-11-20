// postbuild.mjs — runs after `astro build` (see package.json). Works on dist/ only; public/ stays the readable source.
//  1. Accessibility: Divi's <div id="main-content"> gets role="main" (one main landmark per page).
//  2. Speed: the two small shared stylesheets (site.css, brandt.css) are minified and inlined in each page's <head>,
//     in the same cascade position as the <link> they replace, so they never block rendering.
//  3. Speed: home.css (home page only) is trimmed of selectors that match nothing on the page or in the site scripts.
//  4. Caching: every remaining /css/*.css and /js/*.js reference gets ?v=<content hash>, so _headers can cache them
//     for a year (immutable) and a changed file is fetched fresh.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { transform } from 'lightningcss';
import { PurgeCSS } from 'purgecss';

const DIST = 'dist';
const htmlFiles = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) htmlFiles.push(p); } })(DIST);

const minify = (code, file) => transform({ filename: file, code: Buffer.from(code), minify: true }).code.toString();

// 3. trim home.css against the home page and the scripts that add classes at run time
const homeCss = path.join(DIST, 'css/home.css');
if (fs.existsSync(homeCss)) {
  const before = fs.statSync(homeCss).size;
  const [res] = await new PurgeCSS().purge({
    content: [path.join(DIST, 'index.html'), 'public/js/*.js'],
    css: [homeCss],
    fontFace: false, keyframes: false, variables: false,
    safelist: { standard: [/^et_/, /^et-/, /^jb-/, /^is-/, /open/, /active/, /visible/, /show/, /mobile/, /sticky/, /animat/, /^uai/, /^uw/], greedy: [/et_pb_/, /et-pb-/, /mobile_menu/, /current/] },
  });
  fs.writeFileSync(homeCss, minify(res.css, 'home.css'));
  console.log(`home.css: ${before} -> ${fs.statSync(homeCss).size} bytes`);
}

const inlineCss = {};
for (const n of ['site', 'brandt']) inlineCss[n] = minify(fs.readFileSync(path.join(DIST, `css/${n}.css`), 'utf8'), `${n}.css`).replace(/<\/style/gi, '<\\/style');

const hashCache = {};
function hashOf(url) {
  if (!(url in hashCache)) { const f = path.join(DIST, url); hashCache[url] = fs.existsSync(f) ? crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 10) : null; }
  return hashCache[url];
}

let pages = 0;
for (const f of htmlFiles) {
  let s = fs.readFileSync(f, 'utf8'); const orig = s;
  if (!/<main[\s>]|role="main"/.test(s)) s = s.replace('<div id="main-content">', '<div id="main-content" role="main">');
  for (const n of Object.keys(inlineCss)) s = s.replace(`<link rel="stylesheet" href="/css/${n}.css">`, `<style>${inlineCss[n]}</style>`);
  s = s.replace(/(href|src)="(\/(?:css|js)\/[^"?]+\.(?:css|js))"/g, (m, a, u) => { const h = hashOf(u); return h ? `${a}="${u}?v=${h}"` : m; });
  if (s !== orig) { fs.writeFileSync(f, s); pages++; }
}
console.log(`postbuild: ${pages} pages updated`);
