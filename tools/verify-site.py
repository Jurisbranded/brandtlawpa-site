#!/usr/bin/env python3
"""verify-site.py BASE HARVEST — checks a served build (adapted from the BLG tool). Exit 1 on any failure.
 1. every live URL (pages, posts, categories, tags, feeds, sitemaps, and every image the site used) reaches a 200 in ONE hop
 2. every built page: exactly one <title>, one meta description, one canonical; no email address printed;
    no link or image left pointing at /wp-content/ (old site or same host)
 3. every internal link and asset resolves (200, or one redirect to a 200)
Exactly one H1 per page is REQUIRED. Every page needs a 100-160 character description and JSON-LD naming Brandt Law, P.A.;
none of the fixed items (dissolved firm name, P.O. Box, typos, agency byline) may come back (brandt/BRANDT-site-standard.md).
Known exceptions: tools/known-broken.txt."""
import sys, re, json, os
from urllib.parse import urljoin, urlparse, unquote
from concurrent.futures import ThreadPoolExecutor
import requests
from bs4 import BeautifulSoup

base, harvest = sys.argv[1].rstrip('/'), sys.argv[2]
local = 'localhost' in base or '127.0.0.1' in base
S = requests.Session(); S.headers['User-Agent'] = 'verify-site/1'; S.trust_env = not local
fails, warns = [], []
known = set()
kb = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'known-broken.txt')
if os.path.exists(kb):
    known = {l.split('\t')[0].strip() for l in open(kb) if l.strip() and not l.startswith('#')}

def get(path, **kw):
    for i in range(3):
        try: return S.get(base + path, timeout=60, **kw)
        except Exception as e: err = e
    raise err

def one_hop(path):
    r = get(path, allow_redirects=False)
    if r.status_code == 200: return path, True, '200'
    if r.status_code in (301, 302, 307, 308):
        loc = r.headers.get('Location', '')
        r2 = S.get(urljoin(base + path, loc), allow_redirects=False, timeout=60)
        return path, r2.status_code == 200, f'{r.status_code} -> {loc} -> {r2.status_code}'
    return path, False, str(r.status_code)

old = set()
for f in ('rest-posts.json', 'rest-pages.json', 'rest-categories.json'):
    for x in json.load(open(os.path.join(harvest, f))): old.add(urlparse(x['link']).path)
for t in json.load(open(os.path.join(harvest, 'rest-tags.json'))):
    if t['count']: old.add(urlparse(t['link']).path)
for p in json.load(open(os.path.join(harvest, 'rest-posts.json'))):
    old.add(urlparse(p['link']).path + 'feed/'); old.add('/' + p['slug'] + '/')
old |= {'/feed/', '/comments/feed/', '/sitemaps.xml', '/sitemap_index.xml', '/blog/page/2/', '/category/general/page/2/',
        '/author/jeff/', '/tag/hoa/', '/privacy-center/forget-me/', '/privacy-center/request-data/', '/privacy-center/contact-dpo/',
        '/privacy-center/unsubscribe/', '/privacy-center/imprint/', '/privacy-center/media-credits/'}
for u in json.load(open(os.path.join(harvest, 'img-urls.json'))):
    old.add(urlparse(u).path)
old = {p for p in old if p not in known}
with ThreadPoolExecutor(8) as ex:
    for p, ok, why in ex.map(one_hop, sorted(old)):
        if not ok: fails.append(f'OLD URL {p}: {why}')
print('old URLs checked:', len(old))
# Jeff's decisions (2026-11-20): plugin Privacy Center pages -> the JB Privacy Center
for src, want in (('/privacy-center/forget-me/', '/privacy-center/'), ('/privacy-center/imprint/', '/privacy-center/terms-and-conditions/'),
                  ('/category/uncategorized/', '/blog/'), ('/tag/hoa/', '/blog/')):
    r = get(src, allow_redirects=False)
    if r.status_code != 301 or urlparse(r.headers.get('Location', '')).path != want: fails.append(f'DECISION {src}: {r.status_code} {r.headers.get("Location")} (want 301 {want})')

idx = get('/sitemap-index.xml').text
pages = []
for sm in re.findall(r'<loc>([^<]+)</loc>', idx):
    pages += [urlparse(u).path for u in re.findall(r'<loc>([^<]+)</loc>', get(urlparse(sm).path).text)]
pages = sorted(set(pages)) + ['/blog/page/2/', '/category/general/page/2/', '/category/hoa-services/page/2/', '/search/']
assets, links = set(), set()
EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}', re.I)
h1s = {}
def check(p):
    out = []
    r = get(p)
    if r.status_code != 200: return [f'PAGE {p}: {r.status_code}'], set(), set(), None
    s = BeautifulSoup(r.text, 'html.parser')
    n1 = len(s.find_all('h1'))
    if len(s.find_all('title')) != 1 or not s.title.get_text(strip=True): out.append(f'PAGE {p}: title count {len(s.find_all("title"))}')
    ds = s.find_all('meta', attrs={'name': 'description'})
    if len(ds) != 1 or not ds[0].get('content', '').strip(): out.append(f'PAGE {p}: {len(ds)} meta descriptions')
    elif not 100 <= len(ds[0]['content']) <= 160: out.append(f'PAGE {p}: description length {len(ds[0]["content"])}')
    if not s.find_all('script', type='application/ld+json'): out.append(f'PAGE {p}: no JSON-LD')
    if 'https://www.brandtlawpa.com/#legalservice' not in r.text: out.append(f'PAGE {p}: Brandt Law entity missing from the schema')
    for bad in ('Allison J Brandt PA', 'Allison J. Brandt, P.A.', 'Allison J Brandt, PA', 'Alison J Brandt', 'P.O. Box', 'Tueday', 'Thurday', 'Condominum', 'Assocations', 'professsional', 'Vitual', 'react-scroll-to-bottom', '>Jeff<', 'Just another WordPress site', 'ad%20min', 'recaptcha', 'Homeowners’ Association Act (Chapter 718)', 'allisonjbrandtpa.com'):
        if bad in r.text: out.append(f'PAGE {p}: contains {bad!r}')
    cs = s.find_all('link', rel='canonical')
    if len(cs) != 1: out.append(f'PAGE {p}: {len(cs)} canonicals')
    vp = s.find('meta', attrs={'name': 'viewport'})
    if vp and re.search(r'user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b', vp.get('content', '')): out.append(f'PAGE {p}: zoom disabled')
    page_wo_scripts = re.sub(r'<script(?![^>]*ld\+json)[\s\S]*?</script>', '', r.text)   # JSON-LD is checked too (scrapers read it)
    m = EMAIL.search(page_wo_scripts)
    if m and not re.search(r'\.(webp|png|jpe?g|svg|gif)$', m.group(0), re.I): out.append(f'PAGE {p}: email address printed ({m.group(0)})')
    for el in s.find_all(['a', 'img', 'link', 'source', 'iframe', 'video']):
        for att in ('href', 'src', 'srcset'):
            v = el.get(att) or ''
            if '/wp-content/' in v and (v.startswith('/') or 'brandtlawpa.com' in v): out.append(f'PAGE {p}: {el.name} {att} -> {el.get(att)[:90]}'); break
    if re.search(r'url\([^)]*/wp-content/', page_wo_scripts): out.append(f'PAGE {p}: inline style url() -> /wp-content/')
    a_set, l_set = set(), set()
    for im in s.find_all(['img', 'source']):
        for src in [im.get('src', '')] + [x.strip().split(' ')[0] for x in (im.get('srcset') or '').split(',') if x.strip()]:
            if src.startswith('/') and not src.startswith('//'): a_set.add(src)
    for el in s.find_all(['link', 'script']):
        u = el.get('href') or el.get('src') or ''
        if u.startswith('/') and not u.startswith('//'): a_set.add(u)
    for mm in re.finditer(r'url\(\s*["\']?(/[^"\')]+)', page_wo_scripts): a_set.add(mm.group(1))
    for a in s.find_all('a', href=True):
        h = a['href']
        if h.startswith(('mailto:', 'tel:', '#', 'javascript:')): continue
        u = urlparse(urljoin(base + p, h))
        if u.netloc != urlparse(base).netloc: continue
        l_set.add(u.path)
    return out, a_set, l_set, n1
with ThreadPoolExecutor(8) as ex:
    for p, (o, a, l, n1) in zip(pages, ex.map(check, pages)):
        fails += o; assets |= a; links |= l
        if n1 is not None and n1 != 1: fails.append(f'H1 {p}: {n1} (one H1 per page, Jeff 2026-11-01)')
# CSS files: every url() they reference
for c in [x for x in assets if x.endswith('.css')]:
    t = get(c).text
    for mm in re.finditer(r'url\(\s*["\']?(/[^"\')]+)', t): assets.add(mm.group(1).split('#')[0].split('?')[0])
def head_ok(p):
    if p in known: return p, True, 'known'
    r = S.get(base + p, timeout=60, allow_redirects=False, stream=True); r.close()
    if r.status_code in (301, 302, 308):
        r2 = S.get(urljoin(base + p, r.headers.get('Location', '')), timeout=60, allow_redirects=False, stream=True); r2.close()
        return p, r2.status_code == 200, f'{r.status_code}->{r2.status_code}'
    return p, r.status_code == 200, str(r.status_code)
with ThreadPoolExecutor(8) as ex:
    for p, ok, why in ex.map(head_ok, sorted(assets | links)):
        if not ok: fails.append(f'LINK/ASSET {p}: {why}')
for extra, want in (('/sitemap-index.xml', 200), ('/rss.xml', 200), ('/robots.txt', 200), ('/does-not-exist/', 404), ('/wp-login.php', 410)):
    r = get(extra, allow_redirects=False)
    if r.status_code != want: fails.append(f'{extra}: {r.status_code} (want {want})')
print(f'pages crawled: {len(pages)}; links/assets checked: {len(assets | links)}')
for w_ in warns: print('WARN', w_)
for f in fails: print('FAIL', f)
print(f'H1 warnings: {len(warns)}')
print('RESULT:', 'PASS' if not fails else f'{len(fails)} failures')
sys.exit(1 if fails else 0)
