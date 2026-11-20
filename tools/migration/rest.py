import sys, json
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slowget import get
H='https://www.brandtlawpa.com/wp-json/wp/v2/'
for t in ['pages','posts','media','categories','tags']:
    out=[]; p=1
    while True:
        s,h,d=get(f'{H}{t}?per_page=100&page={p}')
        if s!=200: break
        j=json.loads(d); out+=j
        if p>=int(h.get('X-WP-TotalPages',h.get('x-wp-totalpages','1'))): break
        p+=1
    json.dump(out, open(f'/home/claude/brandt-work/harvest/rest-{t}.json','w'))
    print(t, len(out))
