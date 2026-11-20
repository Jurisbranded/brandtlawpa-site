// Posts index for the in-browser blog search (/search/): title, address, date, excerpt and the article text.
import { POSTS, strip, fmtDate, gridExcerpt } from '../lib/content.mjs';
export function GET() {
  const rows = POSTS.map((p) => ({ t: p.title, u: p.path, d: fmtDate(p.date), e: gridExcerpt(p), x: strip(p.html).slice(0, 6000) }));
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}
