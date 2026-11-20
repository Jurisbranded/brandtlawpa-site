#!/usr/bin/env python3
"""write-privacy.py SITE — the JB Privacy Center for brandtlawpa.com (standing rule: the CGH2-format Privacy Center
replaces the WordPress GDPR plugin pages on every migrated site; Jeff 2026-11-20 "all in GDPR").
Template: the JB Privacy Center pages of the Brandon Divorce Help build (Jurisbranded/brandondivorcehelp-site,
src/data/carried/privacy-center*.html, the same CGH2 model), rewritten with this site's facts:
  Brandt Law, P.A., a Florida law firm (office: Lithia, Florida) representing condominium and homeowners associations;
  privacy email allison@brandtlawpa.com (never printed: mail button); forms on the site = the appointment form and the
  Privacy Center request form, both through our form service with Cloudflare Turnstile; Google tag GT-M3LB4G5.
The live site's Privacy Policy (2013 template, wrong domain allisonjbrandtpa.com, dissolved entity, "payments page",
"claims") and Cookie Policy are replaced by the JB policies. The live Terms (5,285 words, US + EU copy twice, wrong
domain) are replaced by the JB Terms. The live Disclaimer is carried word for word, only the firm name corrected
(Allison J Brandt, PA was dissolved 2025-04-25) — Allison to confirm on the preview. Every change: docs/CHANGES.md."""
import sys, re, base64, os
from bs4 import BeautifulSoup
SITE = sys.argv[1]
HARV = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/brandt-work/harvest'
TPL = '/home/claude/brandondivorcehelp-site/src/data/carried'
OUT = f'{SITE}/src/data/carried'
UPDATED = 'November 20, 2026'
OLD_MAIL = base64.b64encode(b'service@brandonlegalgroup.com').decode()
MAIL = base64.b64encode(b'allison@brandtlawpa.com').decode()

SUBS = [
    ('This Privacy Policy explains how Brandon Legal Group, PLLC (“Brandon Legal Group,” “we,” “us”) collects, uses, and protects information when you visit brandondivorcehelp.com (“Brandon Divorce Help”) or contact us through it.',
     'This Privacy Policy explains how Brandt Law, P.A. (“Brandt Law,” “we,” “us”) collects, uses, and protects information when you visit brandtlawpa.com or contact us through it.'),
    ('Brandon Divorce Help is a website of Brandon Legal Group, PLLC, a Florida family law firm (<a href="https://brandonlegalgroup.com/">brandonlegalgroup.com</a>). Brandon Legal Group is the party responsible for personal information collected through this website.',
     'This website is operated by Brandt Law, P.A., a Florida law firm with its office in Lithia, Florida, that represents condominium and homeowners associations. Brandt Law is the party responsible for personal information collected through this website.'),
    ('When you send us a privacy request, an unsubscribe request, or a DMCA notice through this site, or email us,',
     'When you request an appointment, send us a privacy request, an unsubscribe request, or a DMCA notice through this site, or email us,'),
    ('This Cookie Policy explains how Brandon Legal Group uses cookies and similar technologies on brandondivorcehelp.com,',
     'This Cookie Policy explains how Brandt Law, P.A. uses cookies and similar technologies on brandtlawpa.com,'),
    ('Brandon Divorce Help (brandondivorcehelp.com) is a website of Brandon Legal Group, PLLC.', 'This website (brandtlawpa.com) is operated by Brandt Law, P.A., a Florida professional association.'),
    ('Your privacy matters to Brandon Legal Group, which publishes Brandon Divorce Help.', 'Your privacy matters to Brandt Law, P.A.'),
    ('govern your use of Brandon Divorce Help.', 'govern your use of this website.'),
    ('Brandon Legal Group’s services', 'Brandt Law’s services'),
    ('Brandon Legal Group’s relationship', 'Brandt Law’s relationship'),
    ('Brandon Legal Group', 'Brandt Law'),
    ('Brandon Divorce Help', 'Brandt Law, P.A.'),
    ('brandondivorcehelp.com', 'brandtlawpa.com'),
    ('GT-WF35BF', 'GT-M3LB4G5'),
    (OLD_MAIL, MAIL),
]

def rewrite(name, out_name=None):
    s = open(f'{TPL}/{name}', encoding='utf-8').read()
    for a, b in SUBS: s = s.replace(a, b)
    s = re.sub(r'(Last updated|Effective):? November \d+, 2026', lambda m: f'{m.group(1)}{":" if m.group(1) == "Last updated" else ""} {UPDATED}', s)
    left = re.findall(r'Brandon|brandon|BLG|divorce|family law', s, re.I)
    assert not left, f'{name}: left over {sorted(set(left))}'
    open(f'{OUT}/{out_name or name}', 'w', encoding='utf-8').write(s)
    return out_name or name

done = [rewrite(n) for n in ['privacy-center.html', 'privacy-center__privacy-policy-jb.html', 'privacy-center__cookie-policy.html',
                            'privacy-center__opt-out-preferences.html', 'privacy-center__terms-and-conditions.html']]

# Disclaimer: the live text, word for word, in the JB page frame; only the dissolved firm name is corrected.
src = BeautifulSoup(open(f'{HARV}/rendered/privacy-center__disclaimer.html', encoding='utf-8').read(), 'html.parser')
ec = src.select_one('#main-content .entry-content') or src.select_one('#main-content')
for t in ec(['script', 'style', 'form', 'svg', 'noscript']): t.decompose()
for t in ec.find_all(True):
    for k in list(t.attrs):
        if k not in ('href', 'id'): del t.attrs[k]
for h in ec.find_all(['h1']): h.name = 'h2'
inner = ec.decode_contents()
for a in ['Allison J Brandt, PA', 'Allison J. Brandt, P.A.', 'Allison J Brandt PA']: inner = inner.replace(a, 'Brandt Law, P.A.')
inner = re.sub(r'<(div|span)>|</(div|span)>', '', inner)
inner = re.sub(r'\n\s*\n+', '\n', inner).strip()
frame = open(f'{TPL}/privacy-center__disclaimer.html', encoding='utf-8').read()
body = frame[:frame.index('<div class="jb-pc">') + len('<div class="jb-pc">')] + '\n' + inner + '\n' + frame[frame.index('</div>\n</div>\n</article>'):]
open(f'{OUT}/privacy-center__disclaimer.html', 'w', encoding='utf-8').write(body)
done.append('privacy-center__disclaimer.html (live text)')
print('privacy:', ', '.join(done))

# Accessibility Policy (new: the live footer link pointed at the home page). Standing rule 2026-11-02: built natively
# accessible, UserWay on top as an enhancement.
acc = f'''<p class="jb-pc-updated">Last updated: {UPDATED}</p>
<p>Brandt Law, P.A. wants everyone to be able to use this website, including people who use assistive technology such as screen readers, screen magnifiers, voice control, or a keyboard instead of a mouse.</p>
<h2>Our Standard</h2>
<p>We build and maintain this website to conform to the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA, published by the World Wide Web Consortium. In practice that means:</p>
<ul>
<li>every page has a single main heading and headings in a logical order;</li>
<li>images that carry meaning have text descriptions, and decorative images are hidden from screen readers;</li>
<li>text and controls have strong color contrast, and the page can be zoomed without losing content;</li>
<li>every link, button, menu and form works from the keyboard, with a visible focus outline;</li>
<li>every form field has a written label, required fields are marked in words, and form messages are announced to screen readers;</li>
<li>videos from other sites load only when you choose to play them.</li>
</ul>
<h2>Accessibility Tools</h2>
<p>The site also offers the UserWay accessibility tool (the accessibility icon on each page). It lets you change text size and spacing, switch to a dyslexia-friendly font, increase contrast, pause animations and more. The site is built to be accessible without it; the tool is an extra.</p>
<h2>Tell Us About a Barrier</h2>
<p>If any part of this website is hard for you to use, please tell us which page and what happened, and we will work to fix it and to give you the information another way in the meantime. Call us at <a href="tel:+18134749323">(813) 474-9323</a>, Monday to Friday, 9:00 AM to 5:00 PM, or <a data-mail="{MAIL}" href="#" rel="nofollow">email us</a>.</p>
<h2>Content From Others</h2>
<p>Some pages link to websites run by others, such as government sites and statutes. We do not control those sites and cannot guarantee their accessibility.</p>'''
frame = open(f'{OUT}/privacy-center__cookie-policy.html', encoding='utf-8').read()
a = frame.index('<div class="jb-pc">') + len('<div class="jb-pc">'); b = frame.index('</div>\n</div>\n</article>')
page_html = re.sub(r'<h1 class="entry-title main_title">[^<]*</h1>', '<h1 class="entry-title main_title">Accessibility Policy</h1>', frame[:a]) + '\n' + acc + '\n' + frame[b:]
open(f'{OUT}/accessibility-policy.html', 'w', encoding='utf-8').write(page_html)
print('accessibility-policy.html')
