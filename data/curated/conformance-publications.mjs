// State commission bill-comparison publications considered as ground truth
// for the tariff conformance suite (add-tariff-conformance-suite 1.1): each
// with the terms its site states, whether those terms allow reuse, and why
// it is or is not used. A publication whose terms restrict redistribution is
// excluded even though bill amounts are facts.

export default [
  {
    state: 'IN', publisher: 'Indiana Utility Regulatory Commission', title: '2026 Residential Bill Survey (July 1, 2026 billing)',
    url: 'https://www.in.gov/iurc/files/2026-Electric-Residential-Bill-Survey_Update_7.28.26.pdf', checked: '2026-11-01',
    terms: { url: 'https://www.in.gov/core/terms_of_use.html', says: 'Materials on the IN.gov portal are licensed "for your own personal use, and not for republication, distribution ... or other use."' },
    status: 'excluded', reason: 'The portal terms restrict republication and distribution.',
  },
  {
    state: 'FL', publisher: 'Florida Public Service Commission', title: 'Comparative Rate Statistics, Section A',
    url: 'https://floridapsc.com/pscfiles/website-files/PDF/Publications/General/comprate/rate-electric.pdf', checked: '2026-11-01',
    terms: null,
    status: 'not usable', reason: 'The file at this address is a scanned report dated December 31, 2001, too old to test current tariffs and read by character recognition.',
  },
  {
    state: 'TX', publisher: 'Public Utility Commission of Texas', title: 'Residential rate reports',
    url: 'https://www.puc.texas.gov/industry/electric/rates/', checked: '2026-11-01',
    terms: { url: 'https://www.puc.texas.gov/agency/about/policies/', says: 'The policies page states no restriction on reuse.' },
    status: 'not found', reason: 'The residential rate report pages linked from the rates page returned HTTP 404, and no 2026 report was found at the address pattern of the 2022 reports.',
  },
];
