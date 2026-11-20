#!/usr/bin/env python3
"""prep-images.py HARVEST SITE — convert every downloaded upload (exact URLs the site used, WordPress size copies
included, so crops look the same) to WebP and write the old-URL map. Adapted from the BLG tool.
  HARVEST/uploads/YYYY/MM/file  -> SITE/public/img/YYYY/MM/<base>.webp (max 1920 px wide); GIF/SVG kept; PDF/MP4 -> public/files
  -> SITE/src/data/images.json  { "/wp-content/uploads/...": { full, w, h } }
Every other size of a media-library item that is in use maps to the copy we have (original preferred), so old
image addresses still answer with one redirect (dist/_worker.js)."""
import sys, os, re, json, shutil
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageOps
Image.MAX_IMAGE_PIXELS = None
HARV, SITE = sys.argv[1], sys.argv[2]
SRC = f'{HARV}/uploads'; OUT = f'{SITE}/public/img'; FILES = f'{SITE}/public/files'
MAXW = 1920

def slugbase(name):
    b = os.path.splitext(name)[0]
    return re.sub(r'[^A-Za-z0-9._-]+', '-', b).strip('-').lower() or 'image'

def conv(rel):
    src = os.path.join(SRC, rel)
    ym = os.path.dirname(rel); base = slugbase(os.path.basename(rel)); ext = rel.rsplit('.', 1)[-1].lower()
    try:
        if ext in ('pdf', 'mp4', 'webm', 'mov', 'doc', 'docx'):
            os.makedirs(f'{FILES}/{ym}', exist_ok=True)
            shutil.copyfile(src, f'{FILES}/{ym}/{base}.{ext}')
            return rel, {'full': f'/files/{ym}/{base}.{ext}'}
        with open(src, 'rb') as fh: head = fh.read(16)
        os.makedirs(f'{OUT}/{ym}', exist_ok=True)
        if ext == 'svg' or head.lstrip()[:4] in (b'<svg', b'<?xm'):
            shutil.copyfile(src, f'{OUT}/{ym}/{base}.svg'); return rel, {'full': f'/img/{ym}/{base}.svg'}
        if not (head[:3] == b'\xff\xd8\xff' or head[:8] == b'\x89PNG\r\n\x1a\n' or head[:4] == b'RIFF' or head[:3] == b'GIF' or head[:4] == b'\x00\x00\x01\x00'):
            return rel, {'broken': True}
        im = Image.open(src)
        if head[:3] == b'GIF' and getattr(im, 'is_animated', False):
            shutil.copyfile(src, f'{OUT}/{ym}/{base}.gif'); return rel, {'full': f'/img/{ym}/{base}.gif', 'w': im.width, 'h': im.height}
        im = ImageOps.exif_transpose(im)
        if im.mode not in ('RGB', 'RGBA'): im = im.convert('RGBA' if 'transparency' in im.info or im.mode in ('P', 'LA') else 'RGB')
        w, h = im.size
        full = im if w <= MAXW else im.resize((MAXW, round(h * MAXW / w)), Image.LANCZOS)
        full.save(f'{OUT}/{ym}/{base}.webp', 'WEBP', quality=82, method=5)
        return rel, {'full': f'/img/{ym}/{base}.webp', 'w': full.size[0], 'h': full.size[1]}
    except Exception as e:
        return rel, {'error': str(e)}

rels = sorted(os.path.relpath(os.path.join(d, f), SRC) for d, _, fs in os.walk(SRC) for f in fs)
with ProcessPoolExecutor() as ex: res = dict(ex.map(conv, rels, chunksize=8))
IMG = {}; bad = []
for rel, r in res.items():
    if 'full' in r: IMG['/wp-content/uploads/' + rel] = r
    else: bad.append((rel, r))
direct = set(IMG)
# other sizes of library items in use -> the copy we have (original preferred, else the widest size we have)
for m in (json.load(open(f'{HARV}/rest-media.json')) if os.path.exists(f'{HARV}/rest-media.json') else []):
    src = re.sub(r'^https?://[^/]+', '', m.get('source_url', ''))
    md = m.get('media_details') or {}
    keys = [src] + [re.sub(r'^https?://[^/]+', '', s.get('source_url', '')) for s in (md.get('sizes') or {}).values()]
    if md.get('original_image'): keys.append(os.path.dirname(src) + '/' + md['original_image'])
    have = [k for k in keys if k in direct]
    if not have: continue
    best = src if src in direct else max(have, key=lambda k: IMG[k].get('w', 0))
    for k in keys:
        if k and k not in IMG: IMG[k] = IMG[best]
os.makedirs(f'{SITE}/src/data', exist_ok=True)
json.dump(IMG, open(f'{SITE}/src/data/images.json', 'w'), indent=0, sort_keys=True)
json.dump(bad, open(f'{HARV}/images-bad.json', 'w'), indent=0)
print('files', len(res), 'mapped urls', len(IMG), 'broken/failed', len(bad))
for b in bad[:30]: print('  ', b)
