// Titles and meta descriptions for the pages (posts use their live SEOPress title and description, cleaned and kept
// to length by src/lib/content.mjs). Firm name Brandt Law, P.A. (Jeff 2026-11-20). Descriptions state only what the
// page itself says; titles under 60 characters, descriptions 120–158 (checked by tools/verify-site.py).
const S = ' | Brandt Law, P.A.';
export const SEO = {
  '/': { title: 'Florida HOA & Condo Association Attorney | Brandt Law, P.A.',
    description: 'Brandt Law, P.A. represents Florida homeowners and condominium associations: collections, covenant enforcement, governing documents and contracts.' },
  '/about/': { title: 'About Allison J. Brandt, HOA Attorney' + S, crumb: 'About',
    description: 'Allison J. Brandt left large firms to give Florida condominium and homeowners associations personal legal service. Learn about Brandt Law, P.A.' },
  '/services/': { title: 'HOA & Condo Association Legal Services' + S, crumb: 'Services',
    description: 'Legal services for Florida condominium and homeowners associations: enforcement, collections, amendments, elections, contracts and disputes.' },
  '/contact/': { title: 'Contact Our HOA Attorney' + S, crumb: 'Contact',
    description: 'Contact Brandt Law, P.A., Lithia, Florida: call (813) 474-9323, Monday to Friday, 9 AM to 5 PM, or request an appointment online.' },
  '/faq/': { title: 'Florida HOA & Condo Association FAQ' + S, crumb: 'FAQ',
    description: 'Answers to common questions about Florida homeowners and condominium associations: board powers, enforcement, records, meetings and collections.' },
  '/blog/': { title: 'HOA & Condo Association Blog' + S, crumb: 'Blog',
    description: 'Articles from Brandt Law, P.A. for Florida HOA and condo boards and managers: rules, enforcement, reserves, meetings, collections and disputes.' },
  '/accessibility-policy/': { title: 'Accessibility Policy' + S, crumb: 'Accessibility Policy',
    description: 'Brandt Law, P.A. is committed to an accessible website for everyone. Read our accessibility standard and how to tell us about any barrier.' },
  '/category/general/': { title: 'General Articles' + S,
    description: 'General articles from Brandt Law, P.A. for Florida homeowners and condominium association boards, managers and members.' },
  '/category/hoa-services/': { title: 'HOA Services Articles' + S,
    description: 'Articles from Brandt Law, P.A. on the legal services Florida homeowners and condominium associations rely on, from collections to disputes.' },
  // Privacy Center (JB format)
  '/privacy-center/': { title: 'Privacy Center' + S,
    description: 'The Brandt Law, P.A. Privacy Center: our privacy, cookie and legal policies, and forms to access, correct or delete your information.' },
  '/privacy-center/privacy-policy/': { title: 'Privacy Policy' + S,
    description: 'How Brandt Law, P.A. collects, uses and protects information on brandtlawpa.com, and how to exercise your privacy rights.' },
  '/privacy-center/cookie-policy/': { title: 'Cookie Policy' + S,
    description: 'The cookies and similar technologies brandtlawpa.com uses, what each category does, and how to turn Google Analytics off.' },
  '/privacy-center/opt-out-preferences/': { title: 'Opt-Out Preferences' + S,
    description: 'Brandt Law, P.A. does not sell or share your personal information. Turn off Google Analytics in this browser or send us a request.' },
  '/privacy-center/terms-and-conditions/': { title: 'Terms and Conditions' + S,
    description: 'The terms that govern your use of brandtlawpa.com: general information only, no attorney-client relationship, Florida law applies.' },
  '/privacy-center/disclaimer/': { title: 'Disclaimer' + S,
    description: 'This website is legal advertising and general information, not legal advice. Using it or contacting us does not create an attorney-client relationship.' },
};
