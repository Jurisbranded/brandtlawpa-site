// shots.mjs BASE OUTDIR WIDTH path1 path2 ... — full-page screenshots (scrolls first so lazy images load)
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs';
const [,, base, out, width, ...paths] = process.argv;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +width, height: 900 }, deviceScaleFactor: 1, isMobile: +width < 600, hasTouch: +width < 600 });
for (const p of paths) {
  const pg = await ctx.newPage();
  await pg.goto(base + p, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(1200);
  const n = (p.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home') + `-${width}.png`;
  await pg.screenshot({ path: `${out}/${n}`, fullPage: true });
  console.log(n);
  await pg.close();
}
await b.close();
