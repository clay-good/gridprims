// Colorado's Level 2 and supplemental screens (add-interconnection-screens 1.2), from the rule itself: 4 CCR
// 723-3 Rules 3852 and 3855 as the Secretary of State publishes them, effective 2026-06-14. The rule is law,
// so its values are not disputable; the text is stored with its checksum. Black Hills Energy posts the 2021
// adopted text (Decision C21-0298), whose paragraphs read the same; it is an older copy, so it is not cited.
// Files starting with "_" are not records.

const RULE = { type: 'statute', publisher: 'Colorado Public Utilities Commission (Code of Colorado Regulations, Secretary of State)', url: "https://www.coloradosos.gov/CCR/GenerateRulePdf.do?ruleVersionId=12548&fileName=4%20CCR%20723-3", retrieved: '2026-11-21', capture: 'data/curated/captures/interconnect/co-4ccr723-3-3852-3855.txt', sha256: '85ffe9374670151d96dcaefd2d302c7c335cce3b278dbafb05bc065ec9afe5fc', vintage: '4 CCR 723-3, effective 2026-06-14' };

export const SCREENS = [
  { id: '3855-b-ii', locator: 'Rule 3855(b)(II)', family: 'aggregate-generation', measure: 'peak-load', comparison: 'at most', process: 'Level 2 initial review', name: 'Generation on the line section', threshold: 'at most 15% of the line section\'s annual peak load', testBasis: 'the line section\'s annual peak load, as most recently measured at the substation or calculated', whoAnswers: 'utility', numbers: ['15 percent of the line section’s annual peak load'] },
  { id: '3855-b-iii', locator: 'Rule 3855(b)(III)', process: 'Level 2 initial review', name: 'Fault current contribution', threshold: 'at most 10% of the circuit\'s maximum fault current', testBasis: 'the distribution circuit\'s maximum fault current at the primary level nearest the point of change of ownership', whoAnswers: 'utility-model', numbers: ['ten percent'] },
  { id: '3855-b-iv', locator: 'Rule 3855(b)(IV)', family: 'interrupting-capability', measure: 'interrupting-capability', comparison: 'at most', process: 'Level 2 initial review', name: 'Interrupting capability', threshold: 'no protective device or customer equipment above 87.5% of its short-circuit interrupting capability, and no circuit already above it', testBasis: 'the short-circuit interrupting capability of each protective device on the circuit', whoAnswers: 'utility-model', numbers: ['87.5 percent'] },
  { id: '3855-b-vii', locator: 'Rule 3855(b)(VII)', process: 'Level 2 initial review', name: 'Shared single-phase secondary', threshold: 'at most 25 kW of generation on the shared secondary', testBasis: 'the aggregate generation capacity on the shared single-phase secondary, including the proposed facility', whoAnswers: 'you', numbers: ['25 kW'] },
  { id: '3855-d-vi-a', locator: 'Rule 3855(d)(VI)(A)', family: 'aggregate-generation', measure: 'minimum-load', comparison: 'less than', process: 'Supplemental review', name: 'Minimum load', threshold: 'less than 100% of the minimum load on every line section upstream, daytime minimum load for solar without storage (10 a.m. to 4 p.m. fixed, 8 a.m. to 6 p.m. tracking), absolute minimum load otherwise', testBasis: 'the minimum load of every line section bounded by automatic sectionalizing devices upstream of the resource', whoAnswers: 'utility', numbers: ['100 percent of the minimum load', '10 a.m. to 4 p.m.', '8 a.m. to 6 p.m.'] },
  { id: '3852-f', locator: 'Rule 3852(f) and 3855(b)(I)', process: 'Level 2 initial review', name: 'Highly seasonal circuit', threshold: 'a circuit whose annual peak load is more than six times its off-season peak goes to supplemental review', testBasis: 'the circuit\'s annual peak load and its off-season peak load', whoAnswers: 'utility', numbers: ['greater than six', 'supplemental review'] },
];

const field = (value, s) => ({ value, disputable: false, sources: [{ ...RULE, locator: s.locator }] });

export const record = (id) => {
  const s = SCREENS.find((x) => x.id === id);
  return {
    id: `co-4ccr723-3-${s.id}`, kind: 'interconnect-screen', jurisdiction: 'CO', lastChecked: '2026-11-21',
    ...(s.family ? { family: s.family, measure: s.measure, comparison: s.comparison } : {}),
    contributor: { name: 'gridprims', conflict: 'none' },
    fields: { process: field(s.process, s), screen: field(`${s.locator} ${s.name}`, s), threshold: field(s.threshold, s), testBasis: field(s.testBasis, s), whoAnswers: field(s.whoAnswers, s) },
  };
};
