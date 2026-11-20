// JSON-LD on every page: Brandt Law, P.A. as a service-area LegalService (city only, no street: Jeff 2026-11-20),
// Allison J. Brandt as the attorney, the WebSite, the page, breadcrumbs, BlogPosting on posts, FAQPage on the FAQ page.
// Markup only describes what is visible on the page.
import { SITE } from '../site.config.mjs';
import { strip, clip, isoLocal } from './content.mjs';

const F = SITE.firm;
const WEBSITE_ID = SITE.url + '/#website';
const PERSON_ID = SITE.url + '/about/#allison-j-brandt';
export const firm = () => ({
  '@context': 'https://schema.org', '@type': 'LegalService', '@id': F.id,
  name: F.name, legalName: F.legalName, url: F.url, telephone: F.telephone, logo: F.logo, image: F.logo,
  address: F.address, areaServed: F.areaServed, openingHoursSpecification: F.hours,
  knowsAbout: ['Florida condominium association law', 'Florida homeowners association law', 'Assessment collection', 'Covenant enforcement'],
  employee: { '@id': PERSON_ID },
  sameAs: F.sameAs,
});
export const person = () => ({
  '@context': 'https://schema.org', '@type': 'Person', '@id': PERSON_ID, name: SITE.attorney, jobTitle: 'Attorney',
  worksFor: { '@id': F.id }, url: SITE.url + '/about/',
});
export const website = () => ({
  '@context': 'https://schema.org', '@type': 'WebSite', '@id': WEBSITE_ID, name: SITE.name, url: SITE.url + '/',
  inLanguage: 'en-US', publisher: { '@id': F.id }, copyrightHolder: { '@id': F.id },
});
export const webPage = (path, name, description, type = 'WebPage') => ({
  '@context': 'https://schema.org', '@type': type, '@id': SITE.url + path + '#webpage', url: SITE.url + path, name,
  ...(description ? { description } : {}), isPartOf: { '@id': WEBSITE_ID }, publisher: { '@id': F.id }, inLanguage: 'en-US',
});
export const breadcrumbs = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: { '@id': SITE.url + c.path, name: c.name } })),
});
export function blogPosting(p, description) {
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, url: SITE.url + p.path,
    mainEntityOfPage: SITE.url + p.path, datePublished: isoLocal(p.date), dateModified: isoLocal(p.modified || p.date),
    description: description || clip(strip(p.html)),
    image: p.featured ? SITE.url + p.featured.src : SITE.url + SITE.defaultOg,
    author: { '@id': F.id }, publisher: { '@id': F.id }, isPartOf: { '@id': WEBSITE_ID }, inLanguage: 'en-US',
    ...(p.reviewed ? { reviewedBy: { '@id': PERSON_ID } } : {}),
  };
}
export const services = (names) => names.map((n) => ({
  '@context': 'https://schema.org', '@type': 'Service', name: n, provider: { '@id': F.id }, areaServed: F.areaServed,
}));
export const faqPage = (path, qa) => qa.length ? {
  '@context': 'https://schema.org', '@type': 'FAQPage', '@id': SITE.url + path + '#faq',
  mainEntity: qa.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
} : null;
