// Hawaii's Rule 14H screens with a number in them (add-interconnection-screens 1.2), one record each. Each
// field cites Hawaiian Electric's and Maui Electric's Rule No. 14, two companies' tariff books published
// separately; their stored captures agree on every threshold. The screen sheets' own footers date them, which
// is what the vintage records. Rule 14H has no minimum-load screen. Files starting with "_" are not records.

const HECO = { type: 'tariff', publisher: 'Hawaiian Electric Company, Inc.', url: 'https://www.hawaiianelectric.com/documents/billing_and_payment/rates/hawaiian_electric_rules/14.pdf', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/heco-rule-14-screens.txt', sha256: 'ccd89334b5ef904d74cd60547a8a2d8b925e51f2a6111cd4780d4442ad4cd4ee' };
const MECO = { type: 'tariff', publisher: 'Maui Electric Company, Limited', url: 'https://www.hawaiianelectric.com/documents/billing_and_payment/rates/maui_electric_rules/14.pdf', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/meco-rule-14-screens.txt', sha256: 'e5beebc134f72d9937e9b0904feee54a42ded2570996d021acd8d162f659c15d' };

export const SCREENS = [
  { id: '5', family: 'aggregate-generation', measure: 'peak-load', comparison: 'at most', name: 'Screen 5, generation on the line section', threshold: 'at most 15% of the line section\'s peak', testBasis: 'the line section\'s peak load', whoAnswers: 'utility', vintages: ['Rule 14 sheet 34D-13, effective October 22, 2018', 'Rule 14 screen sheet effective October 22, 2018'], numbers: ['15% of Line Section peak'] },
  { id: '9', family: 'interrupting-capability', measure: 'interrupting-capability', comparison: 'at most', name: 'Screen 9, short-circuit interrupting capability', threshold: 'no distribution protective device or equipment above 87.5% of its short-circuit interrupting capability', testBasis: 'the short-circuit interrupting capability of each protective device on the circuit', whoAnswers: 'utility-model', vintages: ['Rule 14 screen sheet effective October 22, 2018', 'Rule 14 screen sheet effective October 22, 2018'], numbers: ['87.5%'] },
  { id: '11', name: 'Screen 11, gross rating of 100 kVA or less', threshold: 'a facility with a gross rating of 100 kVA or less qualifies for Simplified Interconnection and skips the remaining screens', testBasis: 'the facility\'s gross rating', whoAnswers: 'you', vintages: ['Rule 14 sheet 34D-17, effective October 22, 2018', 'Rule 14 screen sheet effective August 18, 2016'], numbers: ['100 kVA'] },
];

const field = (value, s, disputable = false) => ({ value, disputable, sources: [{ ...HECO, vintage: s.vintages[0], locator: `Rule 14, Screen ${s.id}` }, { ...MECO, vintage: s.vintages[1], locator: `Rule 14, Screen ${s.id}` }] });

export const record = (id) => {
  const s = SCREENS.find((x) => x.id === id);
  return {
    id: `hi-rule-14-screen-${s.id}`, kind: 'interconnect-screen', jurisdiction: 'HI', lastChecked: '2026-11-16',
    ...(s.family ? { family: s.family, measure: s.measure, comparison: s.comparison } : {}),
    contributor: { name: 'gridprims', conflict: 'none' },
    fields: { process: field('Initial Technical Review', s), screen: field(s.name, s), threshold: field(s.threshold, s, true), testBasis: field(s.testBasis, s), whoAnswers: field(s.whoAnswers, s) },
  };
};
