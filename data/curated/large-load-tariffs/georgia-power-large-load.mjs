// Georgia Power's large-load rule, as the Georgia PSC approved it. The PSC's
// release gives the threshold and the longer term; no formula for the minimum
// bill is published, so those fields read "Not public".

import { GA_POWER, GA_PSC } from './_sources.mjs';

const f = (value, locator) => ({ value, disputable: true, sources: [{ ...GA_PSC, locator }, GA_POWER] });

export default {
  id: 'georgia-power-large-load', kind: 'large-load-tariff', type: 'tariff', lastChecked: '2026-11-01',
  contributor: { name: 'gridprims', conflict: 'none' },
  utility: { name: 'Georgia Power Co', eiaId: 7140, state: 'GA' },
  fields: {
    regulator: f('Georgia Public Service Commission', 'letterhead'),
    docket: f('Docket No. 55378 (the 2024 interim resource plan the rule derives from)', 'second paragraph'),
    orderDate: f('2025-01-23', 'dateline'),
    status: f('Approved', 'first paragraph'),
    threshold: f('More than 100 MW', 'third paragraph'),
    term: f('Up to 15 years (from 5)', 'fourth paragraph'),
    minimum: f('Minimum billing is allowed; contracts are filed with the PSC for review, and no formula is published', 'fourth and fifth paragraphs'),
  },
  prefill: null,
};
