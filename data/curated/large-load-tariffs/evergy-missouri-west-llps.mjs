// Evergy Missouri West's Schedule LLPS (Large Load Power Service), one of the two large-load tariffs the
// Missouri PSC approved under SB 4 (RSMo §393.130.7). The term, minimum demand, and collateral agree in the
// tariff and in the PSC's fact sheet, two independent primary documents. The threshold and the exit terms are
// the tariff's own and cite it alone: the fact sheet summarizes several utilities and gives 24 months' notice
// where this tariff's text requires 36.

import { EVERGY_LLPS, MO_PSC_FACTS } from './_sources.mjs';

const both = (value, locator, factLocator) => ({ value, disputable: true, sources: [{ ...EVERGY_LLPS, locator }, { ...MO_PSC_FACTS, locator: factLocator }] });
const tariff = (value, locator) => ({ value, disputable: false, sources: [{ ...EVERGY_LLPS, locator }] });

export default {
  id: 'evergy-missouri-west-llps', kind: 'large-load-tariff', type: 'tariff', lastChecked: '2026-11-16',
  contributor: { name: 'gridprims', conflict: 'none' },
  utility: { name: 'Evergy Missouri West', eiaId: 12698, state: 'MO' },
  fields: {
    regulator: tariff('Missouri Public Service Commission', 'sheet heading, P.S.C. MO. No. 1'),
    effective: tariff('2026-03-09', 'sheet footers: "Effective: March 9, 2026"'),
    status: both('Approved', 'sheet footers', 'opening paragraph: "Ameren Missouri and Evergy, have approved large-load tariffs"'),
    threshold: tariff('A new facility, or an increase in load, of 75 MW or more of monthly maximum demand', 'Applicability'),
    minimum: both('80% of the annual contract capacity', 'Determination of Demands: "Minimum Demand shall be 80% of the annual Contract Capacity"', '"Minimum Monthly Bill": a demand charge set at 80% of the agreed upon rate'),
    ramp: both('Up to 5 years of optional load ramp before the 12-year term', 'Term', '"Minimum Service Contracts"'),
    term: both('12 years after the ramp, up to 17 years in all', 'Term', '"Minimum Service Contracts"'),
    exitFee: tariff('36 months\' written notice; an exit fee of the minimum monthly bill times the months left in the term, or 12 months, whichever is greater, plus an early termination fee for shorter notice', 'Termination or Change of Schedule'),
    collateral: both('Two years of minimum monthly bills, reducible for established credit', 'Collateral Requirements', '"Financial Security and Collateral Requirements"'),
  },
  prefill: null,
};
