"""emailguard.py (from the BLG build) — never print an email address on a public page (Jeff, 2026-10-25).
Every mailto link and every address in text becomes a button-like link that builds the mailto on click
(public/js/site.js handles [data-mail]); the address is stored base64-encoded, not readable by scrapers."""
import re, base64
from bs4 import NavigableString
EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
def enc(a): return base64.b64encode(a.strip().encode()).decode()
def guard(soup, label='email us'):
    n = 0
    for a in soup.find_all('a', href=True):
        if a['href'].lower().startswith('mailto:'):
            addr = a['href'][7:].split('?')[0]
            a['href'] = '#'; a['data-mail'] = enc(addr); a['rel'] = 'nofollow'
            if EMAIL.search(a.get_text()):
                for t in a.find_all(string=EMAIL): t.replace_with(EMAIL.sub(label, t))
            n += 1
    for t in soup.find_all(string=EMAIL):
        if t.parent.name in ('script', 'style') or t.find_parent('a'): continue
        parts = []; last = 0; s = str(t)
        for m in EMAIL.finditer(s):
            parts.append(s[last:m.start()]); parts.append(('A', m.group(0))); last = m.end()
        parts.append(s[last:])
        new = []
        for p in parts:
            if isinstance(p, tuple):
                tag = soup.new_tag('a', href='#'); tag['data-mail'] = enc(p[1]); tag['rel'] = 'nofollow'; tag.string = label
                new.append(tag)
            elif p: new.append(NavigableString(p))
        for x in new: t.insert_before(x)
        t.extract(); n += 1
    return n
