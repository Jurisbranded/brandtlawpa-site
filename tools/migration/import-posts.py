#!/usr/bin/env python3
"""import-posts.py HARVEST SITE — WordPress posts -> src/data/posts.json (frozen import), categories.json, tags.json.
Adapted from the BLG tool; same shape as the BLG/CDB sites, so n8n Article Producer v10 files
(src/data/posts/<slug>.json) work unchanged.
Bodies carried verbatim except: upload URLs -> WebP, same-site links -> relative (old /<slug>/ post links -> the dated
address), broken mailto:/tel: spellings fixed, email addresses -> mail button, YouTube -> click-to-load facade.
SEO title/description/robots come from each post's live page (HARVEST/raw/<path>.html, SEOPress output)."""
import sys, os, re, json
import html as H
from urllib.parse import unquote
from bs4 import BeautifulSoup
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emailguard import guard
HARV, SITE = sys.argv[1], sys.argv[2]
IMG = json.load(open(f'{SITE}/src/data/images.json'))
# Jeff 2026-11-09: off-topic posts (criminal law, DUI, traffic, Social Security) deleted, 301 to the blog (site.config.mjs)
OFF_TOPIC = set()   # Brandt: all 72 posts are on-topic HOA/condo law
# Jeff 2026-11-11: posts describing Florida alimony law before the July 1, 2023 reform (permanent alimony) dropped,
# 301 to Brandon Legal Group's current alimony page (site.config.mjs)
OUTDATED = set()    # Brandt: outdated law is corrected by the Truth Gate pass, not dropped (Jeff 2026-11-20)
P = [p for p in json.load(open(f'{HARV}/rest-posts.json')) if p['id'] not in OFF_TOPIC | OUTDATED]
CATS = json.load(open(f'{HARV}/rest-categories.json'))
TAGS = json.load(open(f'{HARV}/rest-tags.json'))
SLUG2PATH = {p['slug']: re.sub(r'^https?://[^/]+', '', p['link']) for p in P}

def key(u):
    u = unquote(H.unescape(u).split('?')[0].split('#')[0])
    return re.sub(r'^(https?:)?//(www\.)?brandtlawpa\.com', '', u)
def img(u):
    k = key(u); return IMG.get(k) or IMG.get(re.sub(r'-\d+x\d+(?=\.[A-Za-z0-9]+$)', '', k))
def rel(h):
    m = re.match(r'^(https?:)?//(www\.)?brandtlawpa\.com(/[^#?]*)?(.*)$', (h or '').strip())
    if not m: return h
    p = m.group(3) or '/'
    if p.startswith('/wp-content/uploads/'):
        i = img(p); return i['full'] if i else p
    if p in ('/feed/', '/feed'): return '/rss.xml'
    s = p.strip('/')
    if s in SLUG2PATH: p = SLUG2PATH[s]
    return p + (m.group(4) or '')

missing_imgs = set()
# internal links already dead on the live site (checked 2026-10-30): retarget where the live site sent them, or unwrap on 404
DEAD = json.load(open(f'{HARV}/dead-links.json')) if os.path.exists(f'{HARV}/dead-links.json') else {}
dead_log = set()

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
def broken_files(node, where=''):
    for im in node.find_all('img'):
        k = re.sub(r'^(https?:)?//(www\.)?brandtlawpa\.com', '', unquote(im.get('data-src') or im.get('src', '') or '').split('?')[0])
        if k in BROKEN: BROKEN_LOG.add(('img removed', where, k)); im.decompose()
    for a in node.find_all('a', href=True):
        k = re.sub(r'^(https?:)?//(www\.)?brandtlawpa\.com', '', unquote(a['href']).split('?')[0])
        if k in BROKEN: BROKEN_LOG.add(('link unwrapped', where, k)); a.unwrap()

def yt(vid, title='Play video'):
    return BeautifulSoup(f'<div class="yt-facade" data-yt="{vid}"><button type="button" aria-label="{H.escape(title)}"><img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="{H.escape(title)}" loading="lazy" width="480" height="360"></button></div>', 'html.parser')
def clean_html(h):
    s = BeautifulSoup(h, 'html.parser')
    for sc in s.find_all('script'):
        if sc.get('type') == 'application/ld+json':
            sc.string = re.sub(r'https?://(www\.)?brandtlawpa\.com/wp-content/uploads/[^"\s]+', lambda m: 'https://www.brandtlawpa.com' + (img(m.group(0)) or {'full': '/img/2025/04/llm-logo-h-300x100.webp'})['full'], sc.string or '')
            continue
        sc.decompose()
    for st in s.find_all('style'): st.decompose()
    # Brandt: several posts were pasted from ChatGPT with its page wrappers (react-scroll-to-bottom, data-message-author-role,
    # Tailwind classes): the wrapper divs are unwrapped, their text and headings kept
    for dv in s.find_all('div'):
        cl = ' '.join(dv.get('class', []))
        if dv.get('data-message-author-role') or dv.get('data-testid', '').startswith('conversation-turn') or dv.get('data-message-id') \
           or re.search(r'react-scroll-to-bottom|gizmo|text-token|agent-turn|text-message|markdown prose|flex-1 overflow-hidden|flex-col|flex-grow|min-h-\[|empty:hidden|text-gray-400|w-full', cl):
            dv.unwrap()
    wpo_youtube(s)
    broken_files(s, 'post')
    for a in s.find_all('a', href=True):
        hh = a['href']
        if hh.lower().startswith('mailto:'): a['href'] = 'mailto:' + re.sub(r'^mailto:[/#]*', '', hh, flags=re.I)
        elif hh.lower().startswith('tel:'): a['href'] = 'tel:' + re.sub(r'^tel:/*', '', hh, flags=re.I)
        else: a['href'] = rel(hh)
    for ifr in s.find_all('iframe'):
        m = re.search(r'youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{11})', ifr.get('src', '') or ifr.get('data-src', ''))
        if m: ifr.replace_with(yt(m.group(1), ifr.get('title') or 'Play video'))
        else: ifr['loading'] = 'lazy'
    for im in s.find_all('img'):
        src = im.get('data-src') or im.get('src', '')
        for k in ('data-src', 'data-lazy-src', 'data-srcset'): im.attrs.pop(k, None)
        if re.match(r'^((https?:)?//(www\.)?brandtlawpa\.com)?/wp-content/uploads/', src):
            i = img(src)
            if i:
                im['src'] = i['full']
                if i.get('w') and not im.get('width'): im['width'], im['height'] = str(i['w']), str(i['h'])
            else:
                missing_imgs.add(key(src)); im['src'] = key(src)
        if im.get('srcset'):
            parts = []
            for p in im['srcset'].split(','):
                u, _, d = p.strip().partition(' ')
                i2 = img(u) if u else None
                if i2: parts.append(f"{i2['full']} {d}".strip())
            if parts: im['srcset'] = ', '.join(parts)
            else: im.attrs.pop('srcset', None); im.attrs.pop('sizes', None)
        if im.get('alt') is None: im['alt'] = ''
        im['decoding'] = 'async'
    for v in s.find_all(['video', 'source']):
        if v.get('src'): v['src'] = rel(v['src'].split('?')[0])
    for a in s.find_all('a', href=True):
        hp = a['href'].split('#')[0]
        if hp in DEAD:
            if DEAD[hp]: a['href'] = DEAD[hp]; dead_log.add(('retarget', hp, DEAD[hp]))
            else: a.unwrap(); dead_log.add(('unlink', hp, ''))
    guard(s, label='Email Us')
    return str(s).strip()

def text(h): return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', h or ''))).strip()

def live_meta(link):
    name = re.sub(r'^https?://[^/]+/', '', link).strip('/').replace('/', '__')
    f = f'{HARV}/rendered/{name}.html'
    if not os.path.exists(f): return {}
    s = BeautifulSoup(open(f, encoding='utf-8').read(), 'html.parser')
    def meta(n, prop=False):
        e = s.find('meta', attrs={('property' if prop else 'name'): n}); return e['content'] if e and e.get('content') else ''
    ec = s.select_one('article .entry-content')
    fi = s.select_one('.et_post_meta_wrapper img')
    return {'title': H.unescape(s.title.get_text()).strip() if s.title else '', 'description': meta('description'), 'robots': meta('robots'),
            'body': ec.decode_contents() if ec else '', 'featured': (fi.get('src'), fi.get('alt') or '') if fi else None}

used_tags = set()
posts = []
for p in P:
    lm = live_meta(p['link'])
    featured = None
    if lm.get('featured'):
        src, alt = lm['featured']
        big = img(src)
        if big:
            k = key(src); stem, ext = k.rsplit('.', 1)
            grid = IMG.get(f'{stem}-400x250.{ext}') or big
            featured = {'src': big['full'], 'w': big.get('w'), 'h': big.get('h'), 'alt': alt or H.unescape(p['title']['rendered']),
                        'srcset': f"{big['full']} {big.get('w', 1080)}w", 'grid': grid['full'], 'gw': grid.get('w'), 'gh': grid.get('h'), 'orig': big['full']}
    used_tags.update(p['tags'])
    posts.append({
        'id': p['id'], 'slug': p['slug'], 'path': re.sub(r'^https?://[^/]+', '', p['link']),
        'title': H.unescape(p['title']['rendered']), 'date': p['date'], 'modified': p['modified'],
        'categories': p['categories'], 'tags': p['tags'],
        'excerpt': text(p['excerpt']['rendered']),
        'description': lm.get('description', ''), 'seoTitle': lm.get('title', ''),
        'robots': 'noindex' if 'noindex' in lm.get('robots', '') else '',
        'featured': featured, 'html': clean_html(lm.get('body') or p['content']['rendered']),
    })
    # Brandt (Jeff 2026-11-20 "update content to be current"): a body corrected to current Florida law by the Truth Gate
    # replaces the live body; the original stays in the harvest. HARVEST/truth/fixed/<slug>.html
    fx = f"{HARV}/truth/fixed/{p['slug']}.html"
    if os.path.exists(fx):
        posts[-1]['html'] = clean_html(open(fx, encoding='utf-8').read()); posts[-1]['updated'] = True
        posts[-1]['updatedDate'] = '2026-11-20'; posts[-1]['modified'] = '2026-11-20T12:00:00'
        nt = json.load(open(f'{HARV}/truth/titles.json')) if os.path.exists(f'{HARV}/truth/titles.json') else {}
        if p['slug'] in nt: posts[-1]['title'] = nt[p['slug']]; posts[-1]['seoTitle'] = ''; posts[-1]['description'] = ''
posts.sort(key=lambda x: x['date'], reverse=True)
cats = [{'id': c['id'], 'slug': c['slug'], 'name': H.unescape(c['name']), 'parent': c['parent'], 'description': text(c['description'])} for c in CATS]
tags = {str(t['id']): {'slug': t['slug'], 'name': H.unescape(t['name'])} for t in TAGS if t['id'] in used_tags}
json.dump(posts, open(f'{SITE}/src/data/posts.json', 'w'), ensure_ascii=False)
json.dump(cats, open(f'{SITE}/src/data/categories.json', 'w'), ensure_ascii=False, indent=0)
json.dump(tags, open(f'{SITE}/src/data/tags.json', 'w'), ensure_ascii=False)
json.dump(sorted(missing_imgs), open(f'{HARV}/missing-post-images.json', 'w'), indent=0)
json.dump(sorted(dead_log), open(f'{HARV}/dead-links-posts-log.json', 'w'), indent=0)
json.dump(sorted(BROKEN_LOG), open(f'{HARV}/broken-files-posts-log.json', 'w'), indent=0)
print('posts', len(posts), 'cats', len(cats), 'tags', len(tags), 'missing images', len(missing_imgs))
for m in sorted(missing_imgs)[:20]: print('  missing', m)
