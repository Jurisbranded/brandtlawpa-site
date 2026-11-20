// Every per-site value for brandtlawpa.com (facts and decisions: Project doc brandt/BRANDT-site-standard.md).
// Jeff 2026-11-20: firm name Brandt Law, P.A. everywhere (Sunbiz P25000013145 active; Allison J. Brandt, P.A. dissolved
// 2025-04-25). No street address and no P.O. Box on the site: Allison works from a home office. Florida Bar Rule
// 4-7.12(a)(2) needs only the city of a bona fide office, shown as "Lithia, Florida" with the firm name.
export const SITE = {
  name: 'Brandt Law, P.A.',
  url: 'https://www.brandtlawpa.com',
  attorney: 'Allison J. Brandt',
  officeCity: 'Lithia, Florida',
  phone: '(813) 474-9323',
  phoneHref: 'tel:+18134749323',
  email: 'allison@brandtlawpa.com',   // shown only as a mail button (standing rule 2026-10-25)
  logo: '/img/2026/05/brandt-logo2.webp',
  favicon: '/img/2022/12/brandt-fav.webp',
  defaultOg: '/img/2023/02/fb-allison-j-brant-fi-hoa-attorney.webp',
  // Google tag from the live site (Site Kit GT- tag fronting GA4). Loads last, real domain only.
  // Cloudflare Web Analytics: beacon added by Cloudflare on the real domain.
  ga4: 'GT-M3LB4G5',
  hostRe: '(^|\\.)brandtlawpa\\.com$',
  // Cloudflare Turnstile widget for brandtlawpa.com + brandtlawpa.pages.dev (invisible). Empty until Jeff creates it.
  TURNSTILE_SITEKEY: '',
  firm: {
    id: 'https://www.brandtlawpa.com/#legalservice',
    name: 'Brandt Law, P.A.',
    legalName: 'Brandt Law, P.A.',
    url: 'https://www.brandtlawpa.com/',
    telephone: '+18134749323',
    logo: 'https://www.brandtlawpa.com/img/2026/05/brandt-logo2.webp',
    // service-area firm: city only, no street (Jeff 2026-11-20)
    address: { '@type': 'PostalAddress', addressLocality: 'Lithia', addressRegion: 'FL', addressCountry: 'US' },
    areaServed: [{ '@type': 'State', name: 'Florida' }, { '@type': 'Place', name: 'Greater Tampa Bay' }],
    hours: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00' }],
    // Profiles linked from the live site. LinkedIn is linked as the company page (the live link was an admin URL);
    // the second Facebook profile and the Instagram handle are to be confirmed by the firm (site standard item 6).
    sameAs: [
      'https://www.facebook.com/people/Allison-J-Brandt-PA/100085356083357/',
      'https://twitter.com/AllisonJBrandt1',
      'https://www.linkedin.com/company/82861397/',
    ],
  },
};

export const BLOG_PATH = '/blog/';
// Old addresses that have no page of their own any more -> where they go now (one hop).
export const PAGE_REDIRECTS = {
  // JB Privacy Center replaces the WordPress GDPR plugin pages (their request forms are in-page on /privacy-center/)
  '/privacy-center/request-data/': '/privacy-center/',
  '/privacy-center/forget-me/': '/privacy-center/',
  '/privacy-center/data-rectification/': '/privacy-center/',
  '/privacy-center/contact-dpo/': '/privacy-center/',
  '/privacy-center/contact-dmca/': '/privacy-center/',
  '/privacy-center/unsubscribe/': '/privacy-center/',
  '/privacy-center/imprint/': '/privacy-center/terms-and-conditions/',
  '/privacy-center/media-credits/': '/privacy-center/',
  '/privacy-center/privacy-settings/': '/privacy-center/opt-out-preferences/',
  '/feed/': '/rss.xml',
  '/comments/feed/': '/rss.xml',
  '/sitemaps.xml': '/sitemap-index.xml',
  '/sitemap.xml': '/sitemap-index.xml',
  '/sitemap_index.xml': '/sitemap-index.xml',
  '/wp-sitemap.xml': '/sitemap-index.xml',
  '/category/uncategorized/': BLOG_PATH,
  '/wp-content/uploads/2023/05/insurance-and-risk-management.txt': '/hoa-insurance-unveiling-benefits-with-an-attorney/',   // internal draft, not published
};
// Pattern redirects (Cloudflare _redirects syntax), checked after exact rules.
export const SPLAT_REDIRECTS = [
  ['/tag/*', BLOG_PATH],          // 174 thin tag archives: to the blog
  ['/author/*', BLOG_PATH],
  ['/2022/*', BLOG_PATH], ['/2023/*', BLOG_PATH], ['/2024/*', BLOG_PATH],
];
// Paths kept out of the sitemap
export const NOINDEX_PATHS = ['/blog/page/', '/category/', '/search/'];
// List sizes (live: blog grid 10, category archives 6)
export const HOME_PER_PAGE = 10;
export const BLOG_PER_PAGE = 10;
export const CAT_PER_PAGE = 6;
// Byline: the live site printed the agency user "Jeff" (an agency fingerprint, site standard). Posts carry no
// person byline until Allison has reviewed them; then "Reviewed by Allison J. Brandt" (REVIEWED set in content).
export const BYLINE = 'Brandt Law, P.A.';
