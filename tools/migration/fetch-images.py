#!/usr/bin/env python3
"""fetch-images.py img-urls.json HARVEST — download every used upload URL exactly (sizes included), one
request per second (read-only). -> HARVEST/uploads/YYYY/MM/file, HARVEST/fetch-log.json. Also the Divi icon fonts."""
import sys, json, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'tools'))
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slowget import get
urls = json.load(open(sys.argv[1])); OUT = sys.argv[2]
logf = os.path.join(OUT, 'fetch-log.json')
log = json.load(open(logf)) if os.path.exists(logf) else {}
FONTS = ['themes/Divi/core/admin/fonts/modules/all/modules.woff', 'themes/Divi/core/admin/fonts/modules/base/modules.woff',
         'themes/Divi/core/admin/fonts/fontawesome/fa-solid-900.woff2', 'themes/Divi/core/admin/fonts/fontawesome/fa-regular-400.woff2',
         'themes/Divi/core/admin/fonts/fontawesome/fa-brands-400.woff2']
todo = [(u, os.path.join(OUT, 'uploads', u.split('/wp-content/uploads/', 1)[1])) for u in urls]
todo += [('https://www.brandtlawpa.com/wp-content/' + f, os.path.join(OUT, 'fonts', os.path.basename(os.path.dirname(f)) + '-' + os.path.basename(f))) for f in FONTS]
for n, (u, dest) in enumerate(todo):
    if os.path.exists(dest) and os.path.getsize(dest) > 0: continue
    if log.get(u) == 404: continue
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    s, h, data = get(u, binary=True)
    if s == 200 and data: open(dest, 'wb').write(data); log[u] = len(data)
    else: log[u] = s
    if n % 50 == 0: json.dump(log, open(logf, 'w'), indent=0); print(n, len(todo), flush=True)
json.dump(log, open(logf, 'w'), indent=0)
print('done', len(log), 'missing', sorted(u for u, v in log.items() if not isinstance(v, int) or v < 100 and v != 200))
