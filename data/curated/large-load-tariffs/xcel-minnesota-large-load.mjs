// Xcel Energy's large-load tariff in Minnesota, as the PUC approved it in Docket 25-289. The terms come from
// the PUC's own news release; the order in eDockets refuses scripted requests, so each field publishes from
// the release, labeled single source. The approved tariff sheets' rates are not in the release.

import { MN_EDOCKETS, MN_PUC_RELEASE } from './_sources.mjs';

const f = (value, locator) => ({ value, disputable: true, sources: [{ ...MN_PUC_RELEASE, locator }, MN_EDOCKETS] });

export default {
  id: 'xcel-minnesota-large-load', kind: 'large-load-tariff', type: 'tariff', lastChecked: '2026-11-16',
  contributor: { name: 'gridprims', conflict: 'none' },
  utility: { name: 'Northern States Power Co - Minnesota (Xcel Energy)', eiaId: 13781, state: 'MN' },
  fields: {
    regulator: f('Minnesota Public Utilities Commission', 'release heading'),
    docket: f('Docket 25-289', '"Full record information is available in Docket 25-289"'),
    orderDate: f('2026-05-18', 'release date (news release of May 18, 2026)'),
    status: f('Approved', '"Key approvals"'),
    threshold: f('New loads of 100 MW or more, and new loads of 20 MW to 100 MW that are "system intensive"', '"Defining very large customers"'),
    minimum: f('80% of the customer\'s contracted capacity', '"A balanced contract structure"'),
    term: f('15 years by default', '"A balanced contract structure"'),
    exitFee: f('24 months\' exit notice; the exit fee is 80% of contracted capacity', '"A balanced contract structure"'),
  },
  prefill: null,
};
