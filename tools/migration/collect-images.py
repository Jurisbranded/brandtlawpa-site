#!/usr/bin/env python3
"""collect-images.py HARVEST -> HARVEST/img-urls.json: every upload URL the site actually uses
(rendered pages without scripts, their CSS, post bodies from REST, post featured images in the sizes the
templates print, og images). Exact URLs (WordPress size copies included) so crops look the same."""
import sys, os, re, json, html as H, hashlib
from bs4 import BeautifulSoup
HARV = sys.argv[1]
U = re.compile(r'(?:https?:)?(?://(?:www\.)?brandtlawpa\.com)?(/wp-content/uploads/[^\s"\'()<>,]+?\.(?:jpe?g|png|gif|webp|svg|pdf|mp4|ico|avif))', re.I)
used = set(); ext = set()
def scan(text):
    for m in U.finditer(H.unescape(text)): used.add(m.group(1).split('?')[0])
for f in os.listdir(f'{HARV}/rendered'):
    if f.endswith('.html'):
        s = BeautifulSoup(open(f'{HARV}/rendered/{f}', encoding='utf-8').read(), 'html.parser')
        for t in s.find_all(['script', 'noscript']): t.decompose()
        scan(str(s))
        for el in s.select('[style]'):
            for m in re.finditer(r'url\(["\']?(https?://[^"\')]+)', el['style']):
                if 'brandtlawpa.com' not in m.group(1): ext.add(m.group(1))
    if f.endswith('.css.json'):
        for x in json.load(open(f'{HARV}/rendered/{f}')):
            if x.get('text'): scan(x['text'])
            if x.get('href'):
                fn = f'{HARV}/cssfiles/' + hashlib.md5(x['href'].split('?')[0].encode()).hexdigest()[:12] + '.css'
                if os.path.exists(fn):
                    css = open(fn, encoding='utf-8', errors='replace').read()
                    for m in re.finditer(r'url\(\s*["\']?([^"\')]+)', css):
                        u = m.group(1)
                        if '/wp-content/uploads/' in u: scan(u)
                        elif u.startswith('http') and 'brandtlawpa.com' not in u and re.search(r'\.(png|jpe?g|gif|svg|webp)', u): ext.add(u)
posts = json.load(open(f'{HARV}/rest-posts.json'))
for p in posts: scan(p['content']['rendered'])   # featured images: in the rendered single posts and grids (rest-media is blocked, 403)
used = sorted(used)
json.dump(['https://www.brandtlawpa.com' + u for u in used], open(f'{HARV}/img-urls.json', 'w'), indent=0)
json.dump(sorted(ext), open(f'{HARV}/ext-img-urls.json', 'w'), indent=0)
print('upload urls', len(used), 'external', len(ext))
