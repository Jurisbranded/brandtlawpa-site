#!/usr/bin/env python3
"""apply-fixes.py SITE HARVEST — Jeff's 2026-11-20 decisions for brandtlawpa.com, applied to the carried source
(src/data/carried/*.html, src/data/posts.json). Re-runnable: every fix checks before it changes anything.
Each change is listed in docs/CHANGES.md. Decisions and the found-wrong list: Project doc brandt/BRANDT-site-standard.md.

 1. One firm name: Brandt Law, P.A. (Allison J. Brandt, P.A. was dissolved 2025-04-25; "Alison J Brandt PA",
    "Allison J Brandt PA", "Allison J. Brandt, PA" and "Allison Brandt, PA" all become Brandt Law, P.A.).
    Allison J. Brandt stays where she is named as the attorney.
 2. No street address and no P.O. Box (Jeff 2026-11-20, home office): the office city "Lithia, Florida" is shown
    with the firm name (Florida Bar Rule 4-7.12(a)(2)); "Get Directions" to the P.O. Box removed.
 3. Header/footer: click-to-call links in tel:+1 form, logo alt = firm name, Contact menu = the JB Privacy Center pages
    (the 13 WordPress GDPR plugin pages are replaced), footer hours typos (Tuesday, Thursday, Sunday), Accessibility
    Policy link -> the new page, LinkedIn link (was an admin URL), copyright line, typo "professsional".
 4. Appointment popup: the Gravity Forms form (reCAPTCHA) is rebuilt as an accessible form posting to /api/form
    (Turnstile), same fields; "Vitual" fixed.
 5. Home: Chapter 718 -> 720 for the Homeowners' Association Act link; COVID-19 items dropped from the issue list (as
    the Services page already did); counters updated to the current CAI figures with the source shown.
 6. Typos everywhere; FAQ question/answers extracted to src/data/faq.json for the FAQPage markup.
"""
import sys, os, re, json
from bs4 import BeautifulSoup
SITE, HARV = sys.argv[1], sys.argv[2]
C = f'{SITE}/src/data/carried'
log = []

NAMES = [
    ('Allison J. Brandt, P.A.', 'Brandt Law, P.A.'), ('Allison J. Brandt, PA', 'Brandt Law, P.A.'),
    ('Allison J Brandt, PA', 'Brandt Law, P.A.'), ('Allison J Brandt PA', 'Brandt Law, P.A.'),
    ('Alison J Brandt PA', 'Brandt Law, P.A.'), ('Allison Brandt, PA', 'Brandt Law, P.A.'),
    ('Allison J. Brandt P.A.', 'Brandt Law, P.A.'), ('Allison J Brandt P.A.', 'Brandt Law, P.A.'),
    ('Brandt Law, PA,', 'Brandt Law, P.A.,'),
]
TYPOS = [
    ('Condominum', 'Condominium'), ('Assocations', 'Associations'), ('Association Association', 'Association'),
    ('professsional', 'professional'), ('Vitual Meeting', 'Virtual Meeting'),
    ('>Tueday:<', '>Tuesday:<'), ('>Thurday:<', '>Thursday:<'),
    ('Florida Homeowners’ Association Act (Chapter 718)', 'Florida Homeowners’ Association Act (Chapter 720)'),
    ("Florida Homeowners' Association Act (Chapter 718)", "Florida Homeowners' Association Act (Chapter 720)"),
]

def edit_file(path, fn, what):
    s = open(path, encoding='utf-8').read(); n = fn(s)
    if n != s: open(path, 'w', encoding='utf-8').write(n); log.append(what)

def common(s):
    for a, b in NAMES + TYPOS: s = s.replace(a, b)
    s = re.sub(r'href="tel:\(813\) 474-9323"', 'href="tel:+18134749323"', s)
    s = s.replace('href="tel:8134749323"', 'href="tel:+18134749323"')
    s = s.replace('https://www.linkedin.com/company/82861397/ad%20min/', 'https://www.linkedin.com/company/82861397/')
    s = s.replace(' style=""', '')
    return s

for f in sorted(os.listdir(C)):
    if f.endswith('.html') and not f.startswith('privacy-center'): edit_file(f'{C}/{f}', common, f'{f}: firm name, typos, phone links')

# ---------- header ----------
def header(s):
    s = s.replace('alt="HOA Attorney"', 'alt="Brandt Law, P.A."')
    # Contact submenu: the WordPress GDPR plugin pages -> the JB Privacy Center (and the empty "Contact #" item removed)
    sub = ('<ul class="sub-menu">'
           '<li class="menu-item menu-item-type-post_type menu-item-object-page"><a href="/privacy-center/">Privacy Center</a></li>'
           '<li class="menu-item menu-item-type-post_type menu-item-object-page"><a href="/privacy-center/privacy-policy/">Privacy Policy</a></li>'
           '<li class="menu-item menu-item-type-post_type menu-item-object-page"><a href="/privacy-center/cookie-policy/">Cookie Policy</a></li>'
           '<li class="menu-item menu-item-type-post_type menu-item-object-page"><a href="/privacy-center/terms-and-conditions/">Terms and Conditions</a></li>'
           '<li class="menu-item menu-item-type-post_type menu-item-object-page"><a href="/privacy-center/disclaimer/">Disclaimer</a></li>'
           '<li class="menu-item menu-item-type-post_type menu-item-object-page"><a href="/accessibility-policy/">Accessibility Policy</a></li>'
           '</ul>')
    s = re.sub(r'(<a href="/contact/">Contact</a>)<ul class="sub-menu">[\s\S]*?</ul>', lambda m: m.group(1) + sub, s)
    s = s.replace('<a class="et_pb_button et_pb_button_0_tb_header et_pb_bg_layout_dark" href="#appointment">',
                  '<a class="et_pb_button et_pb_button_0_tb_header et_pb_bg_layout_dark" href="#appointment" aria-haspopup="dialog" aria-controls="appointment">')
    return s
edit_file(f'{C}/_header.html', header, 'header: logo alt, Contact menu -> JB Privacy Center + Accessibility Policy, booking button')

# ---------- footer ----------
POPUP = '''<div id="appointment" class="et_pb_section et_pb_section_2_tb_footer popup et_section_regular jb-popup" role="dialog" aria-modal="true" aria-labelledby="appointment-title" hidden>
<div class="jb-popup__box">
<button type="button" class="jb-popup__close" aria-label="Close the appointment form">×</button>
<h2 id="appointment-title" class="jb-popup__title">Book an Appointment</h2>
<p class="jb-popup__lede">Tell us how to reach you and what your association needs. We reply on business days, Monday to Friday, 9:00 AM to 5:00 PM. Brandt Law, P.A. represents condominium and homeowners associations only.</p>
<form class="jb-form" data-api data-form-name="Book an Appointment">
<div class="jb-row">
<div class="jb-field"><label for="ap-first">First name <span class="jb-req">(required)</span></label><input id="ap-first" name="first_name" type="text" autocomplete="given-name" required></div>
<div class="jb-field"><label for="ap-last">Last name <span class="jb-req">(required)</span></label><input id="ap-last" name="last_name" type="text" autocomplete="family-name" required></div>
</div>
<div class="jb-row">
<div class="jb-field"><label for="ap-phone">Phone <span class="jb-req">(required)</span></label><input id="ap-phone" name="phone" type="tel" autocomplete="tel" required></div>
<div class="jb-field"><label for="ap-email">Email <span class="jb-req">(required)</span></label><input id="ap-email" name="email" type="email" autocomplete="email" required></div>
</div>
<fieldset class="jb-field jb-choices" data-required-group><legend>Preferred contact method <span class="jb-req">(required, choose one or more)</span></legend>
<label><input type="checkbox" name="contact_method" value="Phone Call"> Phone Call</label>
<label><input type="checkbox" name="contact_method" value="Email"> Email</label>
<label><input type="checkbox" name="contact_method" value="Virtual Meeting (Meet, Zoom etc)"> Virtual Meeting (Meet, Zoom etc)</label>
<label><input type="checkbox" name="contact_method" value="Meeting in person"> Meeting in person</label>
</fieldset>
<div class="jb-field"><label for="ap-nature">Nature of appointment <span class="jb-req">(required)</span></label><textarea id="ap-nature" name="nature" rows="5" required></textarea></div>
<p class="jb-note">Please do not send confidential details through this form. Sending it does not create an attorney-client relationship.</p>
<button type="submit" class="et_pb_button jb-submit">Request an appointment</button>
</form>
</div>
</div>'''
def footer(s):
    s = s.replace('alt="Homeowners Association Attorney"', 'alt="Brandt Law, P.A."')
    s = s.replace('<a href="/" style="color: #ffffff;">Accessibility Policy</a>', '<a href="/accessibility-policy/" style="color: #ffffff;">Accessibility Policy</a>')
    # hours: the second "Saturday" row is Sunday
    s = re.sub(r'(<div class="col1 col">Saturday:</div><div class="col2 col">CLOSED</div></div><div class="col-wrap"><div class="col1 col">)Saturday:', r'\1Sunday:', s)
    # address: no street and no P.O. Box (Jeff 2026-11-20); office city per Florida Bar Rule 4-7.12(a)(2)
    s = re.sub(r'Brandt Law, P\.A\.<br/>\s*P\.O\. Box 136<br/>\s*Lithia, FL 33547', 'Brandt Law, P.A.<br/> Office: Lithia, Florida<br/> Serving associations throughout Florida', s)
    s = s.replace('target="_blank">(813) 474-9323</a>', '>(813) 474-9323</a>').replace('href="tel:+18134749323" rel="noopener" style="color: #ffffff;"', 'href="tel:+18134749323" style="color: #ffffff;"')
    s = re.sub(r'Copyright\s+©\s+\d{4} Brandt Law, P\.A\.', 'Copyright © 2026 Brandt Law, P.A.', s)
    s = s.replace('<a class="et_pb_button et_pb_button_0_tb_footer et_pb_bg_layout_dark" href="#appointment">', '<a class="et_pb_button et_pb_button_0_tb_footer et_pb_bg_layout_dark" href="#appointment" aria-haspopup="dialog" aria-controls="appointment">')
    if 'id="appointment"' not in s: s = s.replace('</div></footer>', POPUP + '</div></footer>', 1)
    return s
edit_file(f'{C}/_footer.html', footer, 'footer: logo alt, hours, office city (no P.O. Box), Accessibility Policy link, copyright, appointment form')

# ---------- home ----------
def home(s):
    s = re.sub(r'<p><strong>Brandt Law, P\.A\.</strong><br/><strong>P\.O\. Box 136</strong><br/><strong>Lithia, FL 33547</strong></p>',
               '<p><strong>Brandt Law, P.A.</strong><br/><strong>Office: Lithia, Florida</strong><br/>Serving condominium and homeowners associations throughout Florida</p>', s)
    s = re.sub(r'<div class="et_pb_button_module_wrapper et_pb_button_1_wrapper et_pb_module">\s*<a [^>]*href="https://goo\.gl/maps/[^"]*"[^>]*>[^<]*</a>\s*</div>', '', s)
    s = s.replace('href="Board%20Regulations and Rules"', 'href="/board-regulations/"')   # broken relative link on live
    # the heading over Allison's photo named the old firm ("Allison J. Brandt, P.A."): it names her; she founded her own
    # practice (the firm is now Brandt Law, P.A.)
    s = s.replace('<h2>Brandt Law, P.A.</h2>', '<h2>Allison J. Brandt</h2>')
    s = s.replace('Allison left large legal practices to launch Brandt Law, P.A. for one specific reason.', 'Allison left large legal practices to launch her own firm for one specific reason.')
    s = re.sub(r'<li>\s*COVID-19[^<]*</li>\s*', '', s)
    s = re.sub(r'<p>\s*COVID-19[^<]*</p>\s*', '', s)
    # counters: current figures, Foundation for Community Association Research 2025 Statistical Review (Florida row)
    for old, new in (('49420', '50600'), ('9674000', '10882000'), ('3855000', '4473000')):
        s = s.replace(f'data-number-value="{old}"', f'data-number-value="{new}"').replace(f'percent-value">{old}<', f'percent-value">{new}<')
    if 'jb-counter-source' not in s:
        s = re.sub(r'(data-number-value="4473000"[\s\S]*?</div>\s*</div>\s*</div>)',
                   r'\1<p class="jb-counter-source">Florida figures: Foundation for Community Association Research, <a href="https://foundation.caionline.org/wp-content/uploads/2026/03/2025StatisticalReviewFoundation.pdf" rel="noopener" target="_blank">2025 Statistical Review</a>.</p>', s, count=1)
    return s
edit_file(f'{C}/home.html', home, 'home: office city, no map link, COVID-19 items, counters with source')

# ---------- contact ----------
def contact(s):
    s = re.sub(r'<p>P\.A\. P\.O\. Box 136, <br/>Lithia, FL 33547</p>\s*}?', '<p>Brandt Law, P.A.<br/>Office: Lithia, Florida</p>', s)
    s = re.sub(r'(<p>Attorney at Law<br/>Brandt Law, P\.A\.)<br/>P\.O\. Box 136<br/>Lithia, FL 33547</p>', r'\1<br/>Lithia, Florida</p>', s)
    s = re.sub(r'(</div></div></div></div>)\s*}\s*(<)', r'\1\2', s)
    return s
edit_file(f'{C}/contact.html', contact, 'contact: office city, stray brace, no P.O. Box')

# contact page form: Gravity Forms form 1 (reCAPTCHA, hidden labels) -> accessible form with visible labels -> /api/form
CONTACT_FORM = '''<form class="jb-form jb-form--contact" data-api data-form-name="Contact page">
<div class="jb-row">
<div class="jb-field"><label for="cf-first">First name <span class="jb-req">(required)</span></label><input id="cf-first" name="first_name" type="text" autocomplete="given-name" required></div>
<div class="jb-field"><label for="cf-last">Last name <span class="jb-req">(required)</span></label><input id="cf-last" name="last_name" type="text" autocomplete="family-name" required></div>
</div>
<div class="jb-field"><label for="cf-email">Email</label><input id="cf-email" name="email" type="email" autocomplete="email"></div>
<div class="jb-field"><label for="cf-phone">Phone</label><input id="cf-phone" name="phone" type="tel" autocomplete="tel"></div>
<div class="jb-field"><label for="cf-msg">Message</label><textarea id="cf-msg" name="message" rows="6"></textarea></div>
<p class="jb-note">Please do not send confidential details through this form. Sending it does not create an attorney-client relationship.</p>
<button type="submit" class="et_pb_button jb-submit">Send message</button>
</form>'''
def contact_form(s):
    sp = BeautifulSoup(s, 'html.parser')
    w = sp.select_one('.gform_wrapper')
    if not w: return s
    for x in w.find_next_siblings('iframe'): x.decompose()
    w.replace_with(BeautifulSoup(CONTACT_FORM, 'html.parser'))
    return str(sp)
edit_file(f'{C}/contact.html', contact_form, 'contact: Gravity Forms form (reCAPTCHA, hidden labels) -> accessible form with Turnstile')

edit_file(f'{C}/faq.html', lambda s: s.replace('href="Florida%20Fair%20Housing%20Acts"', 'href="https://www.flsenate.gov/Laws/Statutes/2025/760.20"'), 'faq: broken Florida Fair Housing Act link -> the statute')

# ---------- FAQ: extract for the FAQPage markup ----------
fq = BeautifulSoup(open(f'{C}/faq.html', encoding='utf-8').read(), 'html.parser')
faq = []
for it in fq.select('.wpt-faq-item'):
    q = it.select_one('.wpt-faq-question-text'); a = it.select_one('.wpt-faq-answer')
    if q and a: faq.append({'q': re.sub(r'\s+', ' ', q.get_text(' ', strip=True)), 'a': re.sub(r'\s+', ' ', a.get_text(' ', strip=True))})
json.dump(faq, open(f'{SITE}/src/data/faq.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
log.append(f'faq.json: {len(faq)} questions')

# ---------- posts ----------
PP = f'{SITE}/src/data/posts.json'
posts = json.load(open(PP, encoding='utf-8'))
changed = 0
for p in posts:
    o = p['html']; h = o
    for a, b in NAMES + TYPOS: h = h.replace(a, b)
    h = h.replace('&amp;amp;', '&amp;')
    # an internal working draft (.txt in the media library) was linked from the insurance post: link removed, text kept
    h = re.sub(r'<a [^>]*href="/wp-content/uploads/2023/05/insurance-and-risk-management\.txt"[^>]*>([\s\S]*?)</a>', r'\1', h)
    h = re.sub(r'<h1(\s|>)', r'<h2\1', h).replace('</h1>', '</h2>')   # one H1 per page: the post title
    if h != o: p['html'] = h; changed += 1
    if p['categories'] == [1]: p['categories'] = [12]   # "Uncategorized" (WordPress default) -> General; /category/uncategorized/ redirects
    for k in ('title', 'excerpt', 'seoTitle', 'description'):
        for a, b in NAMES + TYPOS: p[k] = (p.get(k) or '').replace(a, b)
json.dump(posts, open(PP, 'w', encoding='utf-8'), ensure_ascii=False)
log.append(f'posts: {changed} bodies changed (firm name, typos)')
print('\n'.join(log))
