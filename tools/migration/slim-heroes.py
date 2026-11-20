#!/usr/bin/env python3
"""slim-heroes.py SITE — the three large home background images (1920 px WebP, 200-620 KB): re-encoded at quality 72,
plus 828 px phone copies used by public/css/brandt.css below 768 px. The hero is the home page's largest paint."""
import sys, os
from PIL import Image
SITE = sys.argv[1]
D = f'{SITE}/public/img/2022/10'
for n in ('gated-community-association', 'hoa-rule-enforcement', 'hoa-case-study'):
    src = f'{D}/{n}.webp'
    if not os.path.exists(src): continue
    im = Image.open(src).convert('RGB')
    if os.path.getsize(src) > 180_000: im.save(src, 'WEBP', quality=72, method=6)
    w, h = im.size
    im.resize((828, round(h * 828 / w)), Image.LANCZOS).save(f'{D}/{n}-828.webp', 'WEBP', quality=70, method=6)
    print(n, os.path.getsize(src), os.path.getsize(f'{D}/{n}-828.webp'))
