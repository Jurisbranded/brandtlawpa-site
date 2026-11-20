# brandtlawpa.com

Astro static site for Brandt Law, P.A. (Allison J. Brandt, Florida condominium and homeowners association attorney),
migrated from WordPress/Divi in November 2026 (direct from production, same layout and addresses, with Jeff's
2026-11-20 fixes). Same stack and tools as Jurisbranded/brandondivorcehelp-site and brandonlegalgroup-site.
Built and hosted by Cloudflare Pages; source of truth is this repo. Decisions: Project doc `brandt/BRANDT-site-standard.md`.

## How it is put together

| Part | Where | Notes |
|---|---|---|
| Pages | `src/data/carried/<name>.html` | The live Divi pages (home, About, Services, Contact, FAQ, Blog), carried with their own markup. Edit these files directly. |
| Privacy Center | `src/data/carried/privacy-center*.html` | JB format (as on the HOF sites), written by `tools/migration/write-privacy.py`. Request form: `public/js/privacy-center.js` -> `/api/form`. |
| Header / footer | `src/data/carried/_header.html`, `_footer.html` | Divi Theme Builder header (phone, hours, booking button, menu) and footer (with the Book an Appointment popup form). |
| Page CSS | `public/css/<name>.css` | Each page's own Divi CSS, trimmed to the rules it uses (`tools/migration/purge-css.mjs`). Posts share `post.css`. |
| Additions | `public/css/site.css`, `public/js/site.js` | Self-hosted fonts, home slider, phone menu, grid columns, mail buttons, forms, Google tag (loads last). |
| Posts (21) | `src/data/posts.json` | Frozen WordPress import (2011–2013). The 5 off-topic posts were deleted (301 to the blog). |
| Titles / descriptions | `src/seo.mjs` | Written for every page and post (the live site had none). |
| Schema | `src/lib/schema.mjs` | Every page: Brandt Law, P.A. (`https://www.brandtlawpa.com/#legalservice`, service-area, Lithia FL, no street) publishes the WebSite; Person (Allison J. Brandt), BlogPosting, FAQPage (/faq/), Service (/services/), ContactPage, BreadcrumbList. |
| Site facts | `src/site.config.mjs` | Name, phone, office city, Google tag, Turnstile key, redirects, list sizes. |
| Forms | `functions/api/form.js` | Posts to the n8n "Static Site Form Handler v3" (needs the `brandtlawpa.com` line: `tools/migration/form-v3-build-email.js`). |
| Old URLs | `tools/make-redirects.mjs`, `tools/make-worker.mjs` | `_redirects` for pages, feeds, tags, dated permalinks; old `/wp-content/uploads/` image URLs -> WebP in the Worker. |

## Pages project settings (never in this repo)

- `N8N_FORM_URL`: production webhook of n8n workflow `1xn3ses4GGAacwD3`.
- `TURNSTILE_SECRET`: secret of the Turnstile widget whose site key goes in `src/site.config.mjs`.
- `FORM_TEST_MODE=1` on preview only: skips Turnstile on preview hosts.

## Commands

```
npm ci
npm run build        # astro build, then _redirects and the _worker.js bundle
npm run preview      # wrangler pages dev dist (honours _redirects, _headers and the worker)
python3 tools/verify-site.py http://localhost:8788 <harvest folder>
```

Re-carrying from a harvest (migration time only): `tools/migration/regenerate.sh`. Change list: `docs/CHANGES.md`.
