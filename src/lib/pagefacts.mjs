// Facts read from carried pages for schema that must match visible content.
import { clip } from './content.mjs';

// FAQ page: question/answer pairs of the WPT FAQ accordion on /faq/, extracted at migration time
// (tools/migration/apply-fixes.py -> src/data/faq.json) so the FAQPage markup matches what is shown.
import faq from '../data/faq.json';
export const faqFromPage = () => faq.map((x) => ({ q: x.q, a: clip(x.a, 1500) }));
// Services page: practice areas shown in the Services list (names exactly as printed there)
export const SERVICE_NAMES = [
  'Covenant Enforcement',
  'Assessments and Debt Collection Practices',
  'Vendor Contract Review and Negotiation',
  'Elections & Recalls',
  'Amendments To Governing Documents',
  'Foreclosure And Lien Priority Procedures',
  'Developer Control & Transition',
  'Dispute Resolution, Court, and Mediation Process',
];
