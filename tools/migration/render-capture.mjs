// Render each live page in Chromium (desktop 1440), scroll to trigger lazy loading, then save:
//   rendered/<name>.html      final DOM (after Divi scripts)
//   rendered/<name>.css.json  stylesheet hrefs + inline style texts in document order
//   cssfiles/<md5(href)>.css  every same-site/external stylesheet body (fetched once, cached across pages)
// Politeness: same-host static assets are cached in memory across pages (each fetched once), 2.5 s pause between pages.
// Usage: node render-capture.mjs urls.txt HARVEST
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs'; import crypto from 'crypto';
const [,, list, harv] = process.argv;
const out = `${harv}/rendered`; fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(`${harv}/cssfiles`, { recursive: true });
const urls = fs.readFileSync(list, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
const cache = new Map();
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
await ctx.route('**/*', async (route) => {
  const req = route.request(); const u = req.url();
  if (req.method() !== 'GET' || !/\.(css|js|woff2?|ttf|png|jpe?g|gif|svg|webp)(\?|$)/i.test(u)) return route.continue();
  if (cache.has(u)) { const c = cache.get(u); return route.fulfill({ status: c.status, headers: c.headers, body: c.body }); }
  try {
    const resp = await route.fetch(); const body = await resp.body();
    const c = { status: resp.status(), headers: resp.headers(), body }; cache.set(u, c);
    if (/\.css(\?|$)/i.test(u)) fs.writeFileSync(`${harv}/cssfiles/${md5(u.split('?')[0])}.css`, body);
    return route.fulfill({ response: resp, body });
  } catch (e) { return route.abort(); }
});
const nameOf = (u) => { const x = new URL(u); return (x.pathname.replace(/^\/|\/$/g, '').replace(/\//g, '__')) || 'home'; };
for (const u of urls) {
  const name = nameOf(u);
  if (fs.existsSync(`${out}/${name}.html`) && !process.env.FORCE) { console.log('have', name); continue; }
  const page = await ctx.newPage();
  try {
    const r = await page.goto(u, { waitUntil: 'networkidle', timeout: 90000 });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(1500);
    const css = await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet], style')].map(n => n.tagName === 'LINK' ? { href: n.href, media: n.media || '' } : { text: n.textContent, id: n.id || '', media: n.media || '' }));
    fs.writeFileSync(`${out}/${name}.html`, await page.content());
    fs.writeFileSync(`${out}/${name}.css.json`, JSON.stringify(css));
    fs.writeFileSync(`${out}/${name}.status`, String(r ? r.status() : 0) + ' ' + page.url());
    console.log('ok', name, r && r.status(), css.length);
  } catch (e) { console.log('ERR', u, e.message); }
  await page.close();
  await new Promise(r => setTimeout(r, 2500));
}
await browser.close();
