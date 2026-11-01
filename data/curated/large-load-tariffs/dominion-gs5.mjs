// Dominion Energy Virginia's Rate Schedule GS-5, from the SCC's final order in
// the 2025 biennial review. The SCC's document store refuses scripted
// requests, so each field publishes from the stamped order's copy, labeled
// single source.

import { SCC_DOCKET, SCC_ORDER } from './_sources.mjs';

const f = (value, locator) => ({ value, disputable: true, sources: [{ ...SCC_ORDER, locator }, SCC_DOCKET] });

export default {
  id: 'dominion-gs5', kind: 'large-load-tariff', type: 'tariff', lastChecked: '2026-11-01',
  contributor: { name: 'gridprims', conflict: 'none' },
  utility: { name: 'Virginia Electric & Power Co (Dominion Energy Virginia)', eiaId: 19876, state: 'VA' },
  fields: {
    regulator: f('Virginia State Corporation Commission', 'caption'),
    docket: f('Case No. PUR-2025-00058', 'caption'),
    orderDate: f('2025-11-25', 'caption: "AT RICHMOND, NOVEMBER 25, 2025"'),
    effective: f('Contracts signed on or after 2027-01-01', 'p. 26, "Contract"'),
    status: f('Approved; applies from 2027', 'p. 26, "Contract"'),
    threshold: f('25 MW or more on a contiguous site, with a load factor of at least 75%', 'p. 23, "GS-5 Rate Class"'),
    minimum: f('Distribution 85%, transmission 85%, and generation 60% of contracted demand', '"Minimum Demand Charges"'),
    ramp: f('Up to 4 years within the term, at least 20% a year', 'p. 26, "Contract"'),
    term: f('14 years', 'p. 26, "Contract"'),
    exitFee: f('Any outstanding minimum charges over the remaining contract term', 'p. 26, "Contract"'),
    collateral: f('$1.5 million/MW, reducible by up to 70% for established credit, released 1/14 each year', '"Collateral Requirements"'),
  },
  prefill: { components: 'distribution: 85%\ntransmission: 85%\ngeneration: 60%', ramp: '100', years: 14, ratchetPct: 0, exitRule: 'remaining term' },
};
