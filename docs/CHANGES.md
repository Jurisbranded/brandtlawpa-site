# brandtlawpa.com: differences from the live WordPress site

Built 2026-11-20 directly from production (read-only harvest). Same Divi layout, colors, images and addresses; the
changes below are the only differences. Decisions: Project doc `brandt/BRANDT-site-standard.md`.

## Firm name and address (Jeff, 2026-11-20)

- One name everywhere: **Brandt Law, P.A.** (Sunbiz P25000013145, active). "Allison J. Brandt, P.A." (dissolved
  2025-04-25), "Allison J Brandt PA" (site title, titles), "Alison J Brandt PA" (copyright, misspelled) and
  "Allison Brandt, PA" are replaced. Allison J. Brandt stays as the named attorney; the heading over her photo on the
  home page now reads "Allison J. Brandt"; "left large legal practices to launch Brandt Law, P.A." reads "to launch her
  own firm".
- No street address and no P.O. Box: "Office: Lithia, Florida" next to the firm name (home, contact, footer), per
  Florida Bar Rule 4-7.12(a)(2) (city of a bona fide office). The "Get Directions" link to a map of the P.O. Box removed.
  Schema: service-area LegalService, addressLocality Lithia, no street.

## GDPR / privacy

- The 13 WordPress GDPR plugin pages and the cookie popup are replaced by the JB Privacy Center (CGH2 model): Privacy
  Policy, Cookie Policy, Opt-Out Preferences, Terms and Conditions, Disclaimer, and in-page request forms (Forget Me,
  Request My Data, Correct My Data, Unsubscribe, Privacy Question, DMCA). Old plugin addresses 301 to their new home.
- The live Privacy Policy (2013 template: wrong domain allisonjbrandtpa.com, "payments page", "claims you wish us to
  pursue") and Terms (5,285 words, US and EU copies printed twice) are replaced by the JB versions with this firm's facts.
- The Disclaimer is the live text word for word; only the dissolved firm name is corrected.

## ADA / accessibility

- New Accessibility Policy page (the footer link pointed at the home page). WCAG 2.1 AA target; UserWay stays on top.
- Skip link, visible keyboard focus, one H1 per page, logo alt text = firm name (was "HOA Attorney").
- Contrast: white text on orange buttons and the orange header phone number use darker oranges (#b84a00 / #c24e00)
  that pass contrast; the brand orange stays everywhere else.
- FAQ accordion: questions are keyboard buttons with aria-expanded (was mouse-only script).
- Forms: every field has a visible label (the contact page form used hidden labels), required fields marked in words.

## Email and forms

- No email address printed anywhere: "Email Us" buttons.
- The Book an Appointment popup (Gravity Forms + reCAPTCHA) and the contact page form are rebuilt with the same fields,
  posting to `/api/form` (Cloudflare Turnstile, honeypot, timing) -> n8n form handler v3 -> allison@brandtlawpa.com.
  "Vitual Meeting" fixed; "Physical Meeting at our Office" reads "Meeting in person" (no public office).
- Mail records (Microsoft 365 MX, SPF) are not touched by the move.

## Conversion standard

- Side "Book an Appointment" tab on every page (opens the form); on phones a pinned Call / Book row.
- Click-to-call links in tel:+1 form; call clicks and form sends recorded as Google Analytics events.
- Sticky menu bar (Divi's sticky script is not carried; CSS does it).

## Content fixes

- Home: "Florida Homeowners' Association Act (Chapter 718)" -> Chapter 720; COVID-19 items removed from the issue list
  (the Services page had already removed them); the counters show the current figures with their source (Foundation for
  Community Association Research, 2025 Statistical Review: 50,600 associations, 10,882,000 residents, 4,473,000 homes;
  live showed 2020 figures with no source).
- Footer hours: "Tueday", "Thurday", second "Saturday" -> Sunday. Typos "Condominum", "Assocations", "Association
  Association", "professsional".
- Contact page: stray "}" removed; LinkedIn link was an admin URL.
- Broken links: home "Board Regulations and Rules" -> the post; FAQ "Florida Fair Housing Act" -> the statute.
- Posts: two were pasted from ChatGPT with its page wrappers (now plain article markup); an internal .txt draft linked
  from the insurance post is unlinked (text kept); extra H1s in three posts -> H2.
- Bylines: the live posts printed the agency user "Jeff". Posts now show "Brandt Law, P.A." until Allison has reviewed
  them.
- Posts brought to current Florida law: see `brandt/BRANDT-truth-check.md` (Truth Gate on Qwen4-Max, then Allison).
- "Uncategorized" post moved to General; /category/uncategorized/ redirects to the blog. Tag archives redirect to the blog.

## Not carried

- WordPress search (static site): the sidebar Search box searches the posts in the browser at /search/.
- Plugins: CleanTalk, Wordfence, OMGF, Nelio Content, Performance Lab, Site Kit (its Google tag GT-M3LB4G5 is kept,
  loading last), Gravity Forms, reCAPTCHA, WordPress GDPR, Popups for Divi.

## Speed (lab, Lighthouse 12, phone)

| | Live WordPress | New build (local preview) |
|---|---|---|
| Performance score | 47 | 94 |
| Largest paint | 6.6 s | 3.1 s |
| Blocking time | 780 ms | 20 ms |
| Layout shift | 0.016 | 0 |

The three large home backgrounds were re-encoded (621/340/210 KB -> 488/261/146 KB) with 828 px phone copies (116/71/48 KB).
Re-measure on the real domain after go-live (pagespeed.web.dev).

## Home page circle counters (2026-11-20)

- The three "Florida figures" counters were carried as plain numbers (the Divi canvas script did not come across).
  `public/js/site.js` now draws them like the live Divi module: an orange ring fills while the number counts up when
  the section scrolls into view, figures shown with commas and sized to fit inside the ring (all three the same size).
  With reduced motion, or without JavaScript, the final figures show straight away.

## Second pass (Jeff, 2026-11-20 afternoon)

- **One topic list for Home and Services.** `src/data/topics.json` is the single list (alphabetical); `tools/topics.py`
  writes it into Home (3 columns) and Services (4 columns), with column sizes from measured line heights
  (`src/data/topics-layout.json`) so the columns end level. COVID-19 items dropped; "Evictions" kept (was on Services
  only); the separate "Debt Collection" item dropped (covered by Assessments and Debt Collection Practices). Fixed links:
  ADA/FHA -> /ada-fair-housing/ (it pointed at the 55+ page), Gaming and Virtual Meetings -> their existing posts.
  `regenerate.sh` now runs `topics.py` after `apply-fixes.py`.
- **Contact menu** has one entry under it: Privacy Center (the Privacy Center page links the policies). `apply-fixes.py`
  header() updated to match (its old pattern never matched the carried markup).
- **Services hero** rebuilt: one photo (AI-generated, a fictional Florida community entrance,
  `/img/2026/11/florida-community-entrance-*.webp`) with a dark wash, white headline, and the "Most Common Types of HOA
  Disputes" text in a white card with a Book an Appointment button. Replaces the two marble sections. Copy tidied
  ("over things like CC&R violations ...").
- **Home counters**: source line now sits under the three rings (grid row on desktop); rings start together.
- **Home headline on phones/tablets**: sub-heading was 65px / 48px in Divi; now 26px / 21px.
- **New post (Allison's request, 2026-11-20)**: "Electric Vehicles and Saltwater Flooding: What Condominium Associations
  May or May Not Do", written by her office (Manuel), published with the byline Allison J. Brandt (`author` field in
  posts.json; BlogPosting author = her Person). Text verbatim from her Word file except a ChatGPT tracking tag removed
  from the NHTSA link. Persechino v. Station Square (2d DCA, Aug 14 2026, 2D2025-2610) checked: real and described correctly.
- **Post banners rebranded** (48 of the standard 640x480 Canva banners): old "Allison J. Brandt, PA" logo,
  allisonjbrandtpa.com and (813) 527-0922 replaced with the new Brandt Law, PA logo, brandtlawpa.com and
  (813) 474-9323, taken from the approved Canva master (design DAHbfMfqH88). The other 20 (940x675 orange, the "Top 10
  for 2023" navy series, Don't Negotiate Blindly, Medical Marijuana, Aging Infrastructure) were patched in place: old
  logo, site and phone removed and the new logo, brandtlawpa.com and (813) 474-9323 drawn in. The 2023 New Year and
  Christmas images carry no firm branding and are unchanged.
