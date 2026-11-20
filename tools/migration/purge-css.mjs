// purge-css.mjs — trim each page's carried Divi CSS to the rules its pages use, then minify.
// Usage (from the site folder, after `astro build`): node tools/migration/purge-css.mjs build-css dist public/css
// (from the BLG build)
//   build-css/<name>.css  every CSS rule the live page loaded (tools/carry-pages.py)
//   dist/**/index.html    the built pages; each links /css/<name>.css
//   -> public/css/<name>.css (then rebuild so dist gets them)
// Classes that only appear after a script runs (menu open, toggles, form errors) are safelisted.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PurgeCSS } = require('purgecss');
const { transform } = require('lightningcss');
const [,, RAW, DIST, OUT] = process.argv;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
const byCss = new Map();
for (const f of walk(DIST)) {
  const h = fs.readFileSync(f, 'utf8');
  for (const m of h.matchAll(/href="\/css\/([a-z0-9_-]+)\.css"/gi)) {
    if (!fs.existsSync(path.join(RAW, m[1] + '.css'))) continue;
    if (!byCss.has(m[1])) byCss.set(m[1], []);
    byCss.get(m[1]).push(f);
  }
}
const SAFE = {
  standard: ['opened', 'closed', 'et_pb_toggle_open', 'et_pb_toggle_close', 'et-hover', 'et-show-dropdown', 'current-menu-item', 'current_page_item',
    'current-menu-ancestor', 'gfield_error', 'gfield--hidden-by-logic', 'validation_message', 'gfield_validation_message', 'gform_confirmation_message',
    'gform_validation_errors', 'et_mobile_menu', 'mobile_nav', 'et_pb_scroll_top', 'et-visible', 'et-animated', 'column', 'size-1of1', 'size-1of2', 'size-1of3',
    'et_header_style_left', 'et-fixed-header', 'et_pb_video_overlay', 'et-pb-active-slide', 'et-pb-active-control', 'screen-reader-text'],
  deep: [/^wp-block/, /^has-/, /^align/, /^is-/, /^gfield/, /^ginput/, /^gform/, /^gf_/, /^awsm/],
  greedy: [/et_pb_toggle/, /mobile_menu/],
};
const POST_TAGS = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'figure', 'figcaption', 'iframe', 'video', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'img', 'hr', 'pre', 'code', 'sup', 'sub', 'dl', 'dt', 'dd', 'cite', 'q', 'mark', 'small', 'p', 'a', 'span'];
// h1 -> :is(h1,.jb-h1) and h2 -> :is(h2,.jb-h2) in selectors only (apply-fixes.py swaps heading levels but keeps the look)
function rewriteSelectors(css) {
  let out = '', i = 0;
  const TOK1 = /(^|[\s>+~(])h1(?![\w-])/g, TOK2 = /(^|[\s>+~(])h2(?![\w-])/g;
  const splitTop = (sel) => { const out = []; let depth = 0, cur = ''; for (const ch of sel) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
  const fixSel = (sel) => splitTop(sel).flatMap((one) => {
    const v = [one];
    if (TOK1.test(one)) v.push(one.replace(TOK1, '$1.jb-h1'));
    TOK1.lastIndex = 0;
    if (TOK2.test(one)) v.push(one.replace(TOK2, '$1.jb-h2'));
    TOK2.lastIndex = 0;
    return v;
  }).join(',');
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) { out += css.slice(i); break; }
    const prelude = css.slice(i, open);
    if (/^\s*@/.test(prelude.split(';').pop())) {
      // at-rule: copy prelude; nested rules inside @media/@supports are handled by continuing the loop
      out += prelude + '{'; i = open + 1;
      if (/@(media|supports|container|layer)/.test(prelude)) continue;
      let depth = 1, j = i; while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
      out += css.slice(i, j); i = j; continue;
    }
    const close = css.indexOf('}', open);
    const lead = prelude.match(/^[\s}]*/)[0];
    out += lead + fixSel(prelude.slice(lead.length)) + css.slice(open, close + 1);
    i = close + 1;
  }
  return out;
}
fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [name, files] of byCss) {
  let raw = fs.readFileSync(path.join(RAW, name + '.css'), 'utf8');
  // drop rules the parser cannot read (lightningcss error recovery) before purging: a few plugin rules are invalid CSS
  try { raw = transform({ filename: name + '.css', code: Buffer.from(raw), minify: false, errorRecovery: true }).code.toString(); } catch (e) { console.log('pre-clean failed', name, e.message); }
  const css = rewriteSelectors(raw);
  // classes that only appear inside :not(...) (e.g. Divi 5 ":not(:where(.et_pb_post_filter_item))"): PurgeCSS would drop the
  // whole selector because the negated class is absent from the page, so they are safelisted
  const negated = [...new Set([...css.matchAll(/:not\(([^)]*\)?)\)/g)].flatMap((m) => [...m[1].matchAll(/\.([A-Za-z0-9_-]+)/g)].map((x) => x[1])))];
  // posts/listings: new articles may use elements no current article has
  const isPostish = files.length > 20;
  const content = files.map((f) => ({ raw: fs.readFileSync(f, 'utf8'), extension: 'html' }));
  const res = await new PurgeCSS().purge({ content, css: [{ raw: css }], safelist: { ...SAFE, standard: [...SAFE.standard, ...negated, ...(isPostish ? POST_TAGS : [])] }, fontFace: false, keyframes: true, variables: false });
  let out = res[0].css;
  try { out = transform({ filename: name + '.css', code: Buffer.from(out), minify: true, errorRecovery: true }).code.toString(); } catch (e) { console.log('minify failed', name, e.message); }
  fs.writeFileSync(path.join(OUT, name + '.css'), out);
  total += out.length;
  console.log(`${name}: ${files.length} page(s), ${Math.round(css.length / 1024)} KB -> ${Math.round(out.length / 1024)} KB`);
}
console.log('total', Math.round(total / 1024), 'KB');
