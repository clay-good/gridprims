// Texas's statewide large-load interconnection rule, 16 TAC §25.194. Both of
// its documents are the PUCT's own, and the Texas Administrative Code viewer
// serves no text to a script, so each field publishes single source.

import { PUCT_ORDER, PUCT_RULE, TX_REGISTER } from './_sources.mjs';

const f = (value, locator) => ({ value, disputable: true, sources: [{ ...PUCT_RULE, locator }, { ...PUCT_ORDER, locator: 'order adopting new 16 TAC §25.194' }, TX_REGISTER] });

export default {
  id: 'texas-25-194', kind: 'large-load-tariff', type: 'rule', lastChecked: '2026-11-01', title: 'Texas statewide rule, 16 TAC §25.194',
  contributor: { name: 'gridprims', conflict: 'none' },
  scope: { state: 'TX', region: 'ERCOT' },
  fields: {
    regulator: f('Public Utility Commission of Texas', 'heading'),
    docket: f('Project No. 58481', 'order caption'),
    effective: f('2026-10-08', 'page footers: "effective 10/08/2026"'),
    status: f('In effect', 'page footers'),
    threshold: f('A new or expanded interconnection at a single site of 75 MW or more, or co-location with a generation resource, for a load not yet energized', '§25.194(b)(1)'),
    studyFee: f('$100,000, paid to the interconnecting utility', '§25.194(d)(2)(A)(i)'),
    collateral: f('$50,000 per MW of requested peak demand (or of the increase, for an expansion)', '§25.194(d)(2)(B)'),
  },
  prefill: null,
};
