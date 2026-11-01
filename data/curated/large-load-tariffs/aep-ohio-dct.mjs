// AEP Ohio's Schedule DCT (data center tariff). The PUCO docket rejects
// scripted requests, so each field publishes from the utility's own tariff
// page, labeled single source, with the blocked docket recorded.

import { AEP_PAGE, PUCO_DOCKET } from './_sources.mjs';

const both = [AEP_PAGE, PUCO_DOCKET];
const f = (value, locator) => ({ value, disputable: true, sources: both.map((s) => (s.unreachable ? s : { ...s, locator })) });

export default {
  id: 'aep-ohio-dct', kind: 'large-load-tariff', type: 'tariff', lastChecked: '2026-11-01',
  contributor: { name: 'gridprims', conflict: 'none' },
  utility: { name: 'Ohio Power Company (AEP Ohio)', eiaId: 14006, state: 'OH' },
  fields: {
    regulator: f('Public Utilities Commission of Ohio', 'first paragraph'),
    docket: f('Case No. 24-0508-EL-ATA', 'links to the approved stipulation and the opinion and order'),
    orderDate: f('2025-07-09', 'first paragraph: "On July 9, 2025, the Public Utilities Commission of Ohio adopted"'),
    effective: f('2025-07-23', 'first paragraph: "the tariff became effective on July 23, 2025"'),
    status: f('In effect', 'first paragraph'),
    threshold: f('25,000 kW or more of data center load, including affiliated loads at one location in aggregate', '"Steps for Processing New Service Requests of 25,000 kW or Greater" and "considered in the aggregate"'),
    minimum: f('The greater of 85% of the highest monthly billing demand in the past 11 months, or 15,000 kW plus 85% above 25,000 kW (25,001 to 75,000 kW of contract capacity) or 57,500 kW plus 100% above 75,000 kW (over 75,000 kW), never more than 85% of contract capacity', '"Minimum Demand Charges"'),
    ramp: f('Up to 4 years, at no less than 50%, 65%, 80%, and 90% of contract capacity', '"Load Ramp Period"'),
    term: f('The ramp period plus 8 years', '"Contract Term"'),
    exitFee: f('After the fifth contract year past the ramp, 36 months of minimum charges after notice of termination', '"Exit Fees"'),
    collateral: f('50% of the total minimum charges for the full term, unless the customer has an A-/A3 credit rating and cash over 10 times the requirement', '"Collateral Requirement"'),
    studyFee: f('$10,000 (over 25,000 kW), $50,000 (50,000 kW), or $100,000 (100,000 kW and more)', '"Load Study Fees"'),
  },
  // The calculator's prefill, from the fields above; demand rates are on Schedule DCT itself, not this page.
  prefill: { components: 'demand: 57,500 kW + 100% above 75 MW, cap 85%', ramp: '50, 65, 80, 90, 100', years: 12, ratchetPct: 85, exitRule: '36 months' },
};
