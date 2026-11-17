// Ohio's Level 2 screens (add-interconnection-screens 1.2), from the rule itself: OAC 4901:1-22-07 as the
// Legislative Service Commission publishes it. The rule is law, so its values are not disputable; the text is
// stored with its checksum. Ohio's load-ratio screen tests against 100% of minimum load where the federal one
// tests against 15% of peak: a different test, not a different number. Files starting with "_" are not records.

const OAC = { type: 'statute', publisher: 'Ohio Legislative Service Commission (Ohio Administrative Code)', url: 'https://codes.ohio.gov/ohio-administrative-code/rule-4901:1-22-07', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/oh-oac-4901-1-22-07.txt', sha256: '2a8d7e7a78bbf466b104b67966dbbb53d41773e9baf5d05b03e6dd73ff7a8423', vintage: 'OAC 4901:1-22-07, effective July 20, 2026' };

export const SCREENS = [
  { id: 'b-1-d', family: 'aggregate-generation', measure: 'minimum-load', comparison: 'at most', locator: '4901:1-22-07(B)(1)(d)', process: 'Level 2 review', name: 'Generation on a radial circuit', threshold: 'aggregated generation on the circuit, including the proposed DER, at most 100% of the line section\'s relevant minimum load', testBasis: 'the line section\'s relevant minimum load, as most recently measured at the substation or calculated', whoAnswers: 'utility', numbers: ['one hundred per cent'] },
  { id: 'b-1-f', family: 'interrupting-capability', measure: 'interrupting-capability', comparison: 'at most', locator: '4901:1-22-07(B)(1)(f)', process: 'Level 2 review', name: 'Short-circuit interrupting capability', threshold: 'no distribution protective device or customer equipment exposed to fault currents above 90% of its short-circuit interrupting capability, and no circuit already above it', testBasis: 'the short-circuit interrupting capability of each protective device on the circuit', whoAnswers: 'utility-model', numbers: ['ninety per cent'] },
];

const field = (value, s) => ({ value, disputable: false, sources: [{ ...OAC, locator: s.locator }] });

export const record = (id) => {
  const s = SCREENS.find((x) => x.id === id);
  return {
    id: `oh-4901-1-22-07-${s.id}`, kind: 'interconnect-screen', jurisdiction: 'OH', lastChecked: '2026-11-16',
    family: s.family, measure: s.measure, comparison: s.comparison,
    contributor: { name: 'gridprims', conflict: 'none' },
    fields: { process: field(s.process, s), screen: field(`${s.locator} ${s.name}`, s), threshold: field(s.threshold, s), testBasis: field(s.testBasis, s), whoAnswers: field(s.whoAnswers, s) },
  };
};
