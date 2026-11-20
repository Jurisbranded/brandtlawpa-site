"""Rebuild the practice-topic lists on Home (3 columns) and Services (4 columns) from src/data/topics.json.

One list for both pages, alphabetical, filled column by column so the columns are as even as possible.
Run: python3 tools/topics.py   (then npm run build)
"""
import json, re, html, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
topics = json.loads((ROOT / 'src/data/topics.json').read_text())
# column sizes chosen from measured line heights so the columns end level (re-measure if labels change)
layout = json.loads((ROOT / 'src/data/topics-layout.json').read_text())

def li(t):
    label = html.escape(t['label'], quote=False)
    if not t.get('href'):
        return '<li>' + label + '</li>'
    title = html.escape(t.get('title') or t['label'])
    return '<li><a data-wpel-link="internal" href="%s" title="%s">%s</a></li>' % (t['href'], title, label)

def columns(items, n, sizes=None):
    if not sizes or sum(sizes) != len(items) or len(sizes) != n:
        base, extra = divmod(len(items), n)
        sizes = [base + (1 if c < extra else 0) for c in range(n)]
    out, i = [], 0
    for k in sizes:
        out.append(items[i:i + k]); i += k
    return out

def rewrite(page, ncols):
    p = ROOT / 'src/data/carried' / (page + '.html')
    h = p.read_text()
    start = h.find('Abandoned Property')
    uls = [m for m in re.finditer(r'<ul>(.*?)</ul>', h, re.S)]
    # the topic lists: consecutive <ul>s from the one holding "Abandoned Property"
    first = next(i for i, m in enumerate(uls) if m.start() <= start < m.end())
    block = uls[first:first + ncols]
    assert len(block) == ncols, (page, len(block))
    cols = columns(topics, ncols, layout.get(page))
    for m, col in reversed(list(zip(block, cols))):
        h = h[:m.start()] + '<ul>' + ''.join(li(t) for t in col) + '</ul>' + h[m.end():]
    p.write_text(h)
    print(page, [len(c) for c in cols])

rewrite('home', 3)
rewrite('services', 4)
