#!/usr/bin/env python3
"""carry-pages.py — turn the rendered live Divi pages of brandondivorcehelp.com into clean static source.
Adapted from the BLG tool (Jurisbranded/brandonlegalgroup-site tools/migration/carry-pages.py).

Usage: python3 carry-pages.py HARVEST SITE

Reads  HARVEST/rendered/<name>.html + <name>.css.json   (tools/migration/render-capture.mjs)
       HARVEST/cssfiles/*.css                           (every stylesheet the pages loaded)
       SITE/src/data/images.json                        (old upload URL -> new WebP, prep-images.py)
Writes SITE/src/data/carried/<name>.html                 page body (#main-content), cleaned
       SITE/src/data/carried/_header.html, _footer.html theme header (#top-header + #main-header) and #main-footer
       SITE/src/data/pages.json                          per-page meta
       HARVEST/build-css/<name>.css                      every CSS rule the page loaded, in order (purged later)

Straight migration: markup and CSS are the live site's own. Removed: scripts, WordPress/plugin chrome, the menu
search box. Rewritten: image URLs (-> /img/ WebP), same-site links (-> relative), broken mailto:/tel: spellings,
email addresses (-> mail button), /feed/ -> /rss.xml."""
import sys, os, re, json
import hashlib, html as H
from urllib.parse import unquote, urljoin
from bs4 import BeautifulSoup, Comment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emailguard import guard

HARV, SITE = sys.argv[1], sys.argv[2]
HOST = 'https://www.brandtlawpa.com'
IMG = json.load(open(f'{SITE}/src/data/images.json')) if os.path.exists(f'{SITE}/src/data/images.json') else {}
os.makedirs(f'{SITE}/src/data/carried', exist_ok=True)
os.makedirs(f'{HARV}/build-css', exist_ok=True)

# captured only as references, not built from the carried file at these URLs
# Jeff 2026-11-09: Client Portal (dead shortcode) and Other Legal Blog Posts (only off-topic posts) dropped; the WordPress
# GDPR plugin pages are replaced by the JB Privacy Center (src/data/carried/privacy-center*.html, written by hand).
DROP_PAGES = set() | {f[:-5] for f in os.listdir(f'{HARV}/rendered') if f.startswith('privacy-center') and f.endswith('.html') and f != 'privacy-center__privacy-policy.html'}
# layout/CSS sources for generated pages (404, archives, blog page 2); not built from the carried file at these URLs
TEMPLATE_ONLY = {'privacy-center__privacy-policy', 'does-not-exist-404-check', 'category__general', 'category__hoa-services', 'category__uncategorized', 'blog__page__2'}
# posts live at /<slug>/: rendered post pages are the CSS/layout source for the post template only
POST_SLUGS = {p['slug'] for p in json.load(open(f'{HARV}/rest-posts.json'))}
class _PR:
    def match(self, name): return name in POST_SLUGS
POST_RE = _PR()

def upload_key(u):
    u = unquote(H.unescape(u).split('?')[0].split('#')[0])
    return re.sub(r'^(https?:)?//(www\.)?brandtlawpa\.com', '', u)

def new_img(u):
    k = upload_key(u)
    if k in IMG: return IMG[k]
    return IMG.get(re.sub(r'-\d+x\d+(?=\.[A-Za-z0-9]+$)', '', k))

def rel(href):
    if not href: return href
    h = href.strip()
    m = re.match(r'^(https?:)?//(www\.)?brandtlawpa\.com(/[^#?]*)?(.*)$', h)
    if m:
        path = m.group(3) or '/'
        if path.startswith('/wp-content/uploads/'):
            ni = new_img(path)
            return ni['full'] if ni else path
        if path in ('/feed/', '/feed'): return '/rss.xml'
        q = m.group(4) or ''
        if q.startswith('?et_blog'): q = ''
        return path + q
    return h

ASSET_DIR = f'{SITE}/public/assets/ext'
def localize(url):
    """Download an external image used by the page once (e.g. the Divi premade hero background) and serve it locally."""
    import urllib.request
    u = H.unescape(url.strip())
    if u.startswith('//'): u = 'https:' + u
    ext = (re.search(r'\.(png|jpe?g|gif|svg|webp|woff2?)(\?|$)', u, re.I) or [None, 'jpg'])[1].lower()
    fn = hashlib.md5(u.encode()).hexdigest()[:16] + '.' + ext
    os.makedirs(ASSET_DIR, exist_ok=True)
    dest = f'{ASSET_DIR}/{fn}'
    if not os.path.exists(dest):
        try:
            data = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read()
            open(dest, 'wb').write(data)
        except Exception as e:
            print('  asset failed', u[:90], e); return url
    if ext in ('jpg', 'jpeg', 'png'):
        try:
            from PIL import Image
            w = dest.rsplit('.', 1)[0] + '.webp'
            if not os.path.exists(w): Image.open(dest).convert('RGB').save(w, 'WEBP', quality=80, method=5)
            os.remove(dest)
            return '/assets/ext/' + os.path.basename(w)
        except Exception as e: print('  webp failed', e)
    return '/assets/ext/' + fn

# internal links that were already dead on the live site (checked 2026-10-30, HARVEST/dead-links.json): point them where
# the live site sent them (one hop), or unwrap them (text kept) where the live site answered 404. Logged in NOTES.md.
DEAD = json.load(open(f'{HARV}/dead-links.json')) if os.path.exists(f'{HARV}/dead-links.json') else {}
DEAD_LOG = set()
def dead_links(node):
    for a in node.find_all('a', href=True):
        hp = a['href'].split('#')[0]
        if hp in DEAD:
            if DEAD[hp]: a['href'] = DEAD[hp]; DEAD_LOG.add(('retarget', hp, DEAD[hp]))
            else: a.unwrap(); DEAD_LOG.add(('unlink', hp, ''))


# WP-Optimize YouTube previews (its script swapped in the player on click): same click-to-load idea, our facade
def wpo_youtube(node):
    for box in node.select('.wpo_youtube_preview_container'):
        im = box.select_one('img.wpo_youtube_preview')
        m = re.search(r'youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{11})', (im.get('data-video-url', '') if im else '') + (im.get('data-iframe-attr', '') if im else '').replace('\\/', '/'))
        if not m: continue
        title = 'Play video'
        try: title = json.loads(im['data-iframe-attr']).get('title') or title
        except Exception: pass
        box.replace_with(BeautifulSoup(f'<div class="yt-facade" data-yt="{m.group(1)}"><button type="button" aria-label="Play video: {H.escape(title)}"><img src="https://i.ytimg.com/vi/{m.group(1)}/hqdefault.jpg" alt="{H.escape(title)}" loading="lazy" width="480" height="360"></button></div>', 'html.parser'))

# files that were already 404 on the live site (HARVEST/fetch-log.json): broken images are removed, links to them unwrapped
_FL = json.load(open(f'{HARV}/fetch-log.json')) if os.path.exists(f'{HARV}/fetch-log.json') else {}
BROKEN = {re.sub(r'^https?://[^/]+', '', u) for u, v in _FL.items() if v == 404}
BROKEN_LOG = set()
CUR = ['header/footer']
def broken_files(node, where=''):
    for im in node.find_all('img'):
        k = re.sub(r'^(https?:)?//(www\.)?brandtlawpa\.com', '', unquote(im.get('data-src') or im.get('src', '') or '').split('?')[0])
        if k in BROKEN: BROKEN_LOG.add(('img removed', where, k)); im.decompose()
    for a in node.find_all('a', href=True):
        k = re.sub(r'^(https?:)?//(www\.)?brandtlawpa\.com', '', unquote(a['href']).split('?')[0])
        if k in BROKEN: BROKEN_LOG.add(('link unwrapped', where, k)); a.unwrap()

def fix_mailto(a):
    h = a['href']
    if h.lower().startswith('mailto:'):
        addr = re.sub(r'^mailto:[/#]*', '', h, flags=re.I)
        a['href'] = 'mailto:' + addr
    elif h.lower().startswith('tel:'):
        a['href'] = 'tel:' + re.sub(r'^tel:/*', '', h, flags=re.I)

def clean(node):
    for t in node.find_all(['script', 'noscript', 'style', 'link', 'meta']): t.decompose()
    for c in node.find_all(string=lambda s: isinstance(s, Comment)): c.extract()
    # header search UI does not work on a static site
    for t in node.select('#et_top_search, .et_search_outer, .et-search-form, .et_pb_menu__search-container, .et_pb_menu__search-button'): t.decompose()
    for t in node.select('.et_pb_scroll_top'): t.decompose()
    wpo_youtube(node)
    broken_files(node, CUR[0])
    for a in node.find_all('a', href=True): fix_mailto(a)
    for a in node.find_all('a', href=True): a['href'] = rel(a['href'])
    dead_links(node)
    for f in node.find_all('form', action=True): f['action'] = rel(f['action'])
    for img in node.find_all('img'):
        for k in ['data-src', 'data-lazy-src', 'data-breeze']:
            if img.get(k) and not img.get('src', '').startswith('http'): img['src'] = img[k]
            if k in img.attrs: del img[k]
        src = img.get('src', '')
        ni = new_img(src) if '/wp-content/uploads/' in src else None
        if ni:
            img['src'] = ni['full']
            if ni.get('w') and ni.get('h') and not img.get('height'): img['width'], img['height'] = str(ni['w']), str(ni['h'])
        if img.get('srcset') and '/wp-content/uploads/' in img['srcset']:
            parts = []
            for p in img['srcset'].split(','):
                p = p.strip()
                if not p: continue
                u, _, d = p.partition(' ')
                n2 = new_img(u)
                if n2: parts.append(f"{n2['full']} {d}".strip())
            if parts: img['srcset'] = ', '.join(parts)
            else: del img['srcset']; img.attrs.pop('sizes', None)
        img.attrs.pop('decoding', None); img['decoding'] = 'async'
        if img.get('alt') is None: img['alt'] = ''
    # YouTube embeds: thumbnail until clicked (no YouTube scripts on page load); other iframes lazy
    for ifr in node.find_all('iframe'):
        src = ifr.get('src', '') or ifr.get('data-src', '')
        if ifr.get('data-src') and not ifr.get('src'): ifr['src'] = ifr['data-src']
        m = re.search(r'youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{11})', src)
        if not m: ifr['loading'] = 'lazy'; continue
        vid, title = m.group(1), H.escape(ifr.get('title') or 'Video')
        ifr.replace_with(BeautifulSoup(f'<div class="yt-facade yt-fill" data-yt="{vid}"><button type="button" aria-label="Play video: {title}"><img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="{title}" loading="lazy" width="480" height="360"></button></div>', 'html.parser'))
    # Blog page: the Divi blog grid's list is rebuilt at build time (marker filled by src/lib/render.mjs blogList)
    for box in node.select('.et_pb_blog_grid .et_pb_ajax_pagination_container'):
        box.clear(); box.append(Comment('JB-BLOGLIST'))
    for el in node.select('.et_parallax_bg'):
        el['style'] = re.sub(r'(transform|height)\s*:[^;]*;?\s*', '', el.get('style', ''))
    for img in node.find_all('img'):
        s = img.get('src', '') or ''
        if s.startswith(('http', '//')) and 'brandtlawpa.com' not in s and not s.startswith('https://i.ytimg.com/'):
            img['src'] = localize(s); img.attrs.pop('srcset', None)
        elif re.match(r'^(https?:)?//(www\.)?brandtlawpa\.com/wp-content/(plugins|themes)/', s):
            img['src'] = localize(s); img.attrs.pop('srcset', None)
    for v in node.find_all(['video', 'source']):
        if v.get('src'): v['src'] = rel(v['src'])
    for el in node.select('[style]'):
        el['style'] = re.sub(r'url\(\s*["\']?([^"\')]+)["\']?\s*\)', lambda m: 'url(' + (new_img(m.group(1))['full'] if '/wp-content/uploads/' in m.group(1) and new_img(m.group(1)) else (localize(m.group(1)) if m.group(1).startswith('http') and 'brandtlawpa.com' not in m.group(1) else rel(m.group(1)))) + ')', el['style'])
    for el in node.find_all(True):
        for a in list(el.attrs):
            if a.startswith('on'): del el[a]
    guard(node, label='Email Us')
    for el in node.find_all(True):
        for a in list(el.attrs):
            if a.startswith('data-et-') or a in ('data-order_class',): del el[a]
    return node

def css_rewrite(css, base):
    def fix(m):
        u = m.group(1).strip().strip('"\'')
        if u.startswith('data:'): return m.group(0)
        if u.startswith('//'): u = 'https:' + u
        elif not re.match(r'^https?:', u): u = urljoin(base, u)
        if '/wp-content/uploads/' in u and 'brandtlawpa.com' in u:
            ni = new_img(u)
            return f'url({ni["full"]})' if ni else f'url({upload_key(u)})'
        fn = FONTMAP.get(u.split('?')[0].split('#')[0])
        if fn: return f'url({fn})'
        if not 'brandtlawpa.com' in u and re.search(r'\.(png|jpe?g|gif|webp)(\?|$)', u) and 'premadesections' in u:
            return f'url({localize(u)})'
        return 'url(about:blank)' if re.search(r'\.(eot|ttf|svg|woff2?|gif|png|jpe?g|cur)', u) else m.group(0)
    return re.sub(r'url\(([^)]+)\)', fix, css)

FONTMAP = {
    f'{HOST}/wp-content/themes/Divi/core/admin/fonts/modules/base/modules.woff': '/fonts/base-modules.woff',
    f'{HOST}/wp-content/themes/Divi/core/admin/fonts/modules/all/modules.woff': '/fonts/all-modules.woff',
    f'{HOST}/wp-content/themes/Divi/core/admin/fonts/fontawesome/fa-solid-900.woff2': '/fonts/fontawesome-fa-solid-900.woff2',
    f'{HOST}/wp-content/themes/Divi/core/admin/fonts/fontawesome/fa-regular-400.woff2': '/fonts/fontawesome-fa-regular-400.woff2',
    f'{HOST}/wp-content/themes/Divi/core/admin/fonts/fontawesome/fa-brands-400.woff2': '/fonts/fontawesome-fa-brands-400.woff2',
}
SKIP_CSS = ('fonts.googleapis.com', 'youtube-image-preview', 'mediaelement')

def page_css(name, as_parts=False):
    parts = []
    for x in json.load(open(f'{HARV}/rendered/{name}.css.json')):
        if x.get('href'):
            h = x['href']
            if any(s in h for s in SKIP_CSS): continue
            fn = f'{HARV}/cssfiles/' + hashlib.md5(h.split('?')[0].encode()).hexdigest()[:12] + '.css'
            if not os.path.exists(fn): print('  missing css', h); continue
            css = open(fn, encoding='utf-8', errors='replace').read()
            if x.get('media') and x['media'] not in ('all', 'screen', ''): css = f'@media {x["media"]}{{{css}}}'
            parts.append(css_rewrite(css, h))
        else:
            parts.append(css_rewrite(x.get('text', ''), HOST + '/'))
    if as_parts: return parts
    css = '\n'.join(parts)
    # keep only @font-face rules whose files are served locally (icon fonts); drop the eot/svg/ttf sources inside them
    def ff(m):
        b = m.group(0)
        if not ('url(/fonts/' in b): return ''
        return re.sub(r'src:url\(about:blank\);', '', b).replace('url(about:blank) format("embedded-opentype"),', '')
    css = re.sub(r'@font-face\s*{[^}]*}', ff, css)
    css = re.sub(r'@import[^;]+;', '', css)
    return css

def text_of(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)) if node else ''

pages = []
names = sorted(f[:-5] for f in os.listdir(f'{HARV}/rendered') if f.endswith('.html'))
home = BeautifulSoup(open(f'{HARV}/rendered/home.html', encoding='utf-8').read(), 'html.parser')
# Brandt: Divi Theme Builder header and footer (header.et-l--header / footer.et-l--footer)
hdr = clean(home.select_one('header.et-l--header'))
ftr = clean(home.select_one('footer.et-l--footer'))
open(f'{SITE}/src/data/carried/_header.html', 'w').write(str(hdr))
open(f'{SITE}/src/data/carried/_footer.html', 'w').write(str(ftr))

for name in names:
    if name in DROP_PAGES: continue
    soup = BeautifulSoup(open(f'{HARV}/rendered/{name}.html', encoding='utf-8').read(), 'html.parser')
    main = soup.select_one('#main-content')
    if not main: print('no #main-content', name); continue
    CUR[0] = name
    clean(main)
    is_post = bool(POST_RE.match(name))
    path = '/' + name.replace('__', '/') + '/' if name != 'home' else '/'
    def meta(n, prop=False):
        e = soup.find('meta', attrs={('property' if prop else 'name'): n}); return e['content'] if e and e.get('content') else ''
    t = soup.find('title'); can = soup.find('link', rel='canonical')
    body_cls = [c for c in soup.body.get('class', []) if c not in ('chrome', 'osx', 'windows', 'linux', 'gecko', 'safari', 'iphone', 'et_smooth_scroll')]
    jsonld = [s.string for s in soup.find_all('script', type='application/ld+json') if s.string]
    out = str(main)
    if not is_post or name in TEMPLATE_ONLY: open(f'{SITE}/src/data/carried/{name}.html', 'w').write(out)
    if not is_post: open(f'{HARV}/build-css/{name}.css', 'w').write(page_css(name))
    pages.append({'name': name, 'path': path, 'title': H.unescape(t.get_text()).strip() if t else '', 'description': meta('description'),
                  'robots': meta('robots'), 'ogImage': rel(meta('og:image', True)), 'canonical': can['href'] if can else '',
                  'bodyClass': ' '.join(body_cls), 'lang': soup.html.get('lang', 'en-US'), 'jsonldOld': jsonld,
                  'template': is_post or name in TEMPLATE_ONLY, 'text': text_of(main)[:400]})
    print('carried', name, len(out))

# post template CSS: every stylesheet any captured sample post loaded, each once, in order
seen, parts = set(), []
for name in names:
    if POST_RE.match(name):
        for part in page_css(name, as_parts=True):
            h = hashlib.md5(part.encode()).hexdigest()
            if h not in seen: seen.add(h); parts.append(part)
css = '\n'.join(parts)
css = re.sub(r'@font-face\s*{[^}]*}', lambda m: m.group(0) if 'url(/fonts/' in m.group(0) else '', css)
css = re.sub(r'@import[^;]+;', '', css)
# Brandt: the live post pages load only the "late" Divi file for the Theme Builder header/footer and no icon font
# @font-face (the browser had them cached from other pages). The home page's full set goes first; post rules after it.
home_css = open(f'{HARV}/build-css/home.css', encoding='utf-8').read() if os.path.exists(f'{HARV}/build-css/home.css') else ''
open(f'{HARV}/build-css/post.css', 'w').write(css + '\n' + home_css)
json.dump(pages, open(f'{SITE}/src/data/pages.json', 'w'), indent=1)
json.dump(sorted(DEAD_LOG), open(f'{HARV}/dead-links-pages-log.json', 'w'), indent=0)
json.dump(sorted(BROKEN_LOG), open(f'{HARV}/broken-files-pages-log.json', 'w'), indent=0)
print('pages', len(pages))

# Brandt: pages whose live CSS had no icon-font @font-face (browser cache) get the home page's ETmodules/FontAwesome faces
_h = open(f'{HARV}/build-css/home.css', encoding='utf-8').read()
_faces = '\n'.join(re.findall(r'@font-face\s*{[^}]*}', _h))
for f in os.listdir(f'{HARV}/build-css'):
    fp = f'{HARV}/build-css/{f}'; t = open(fp, encoding='utf-8').read()
    if '@font-face' not in t and _faces: open(fp, 'w', encoding='utf-8').write(_faces + '\n' + t)
print('icon fonts added where missing')
