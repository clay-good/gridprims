// New York's Standardized Interconnection Requirements screens (add-interconnection-screens 1.2), one record per
// screen, each field citing two primary documents whose Appendix G text is identical: the PSC's SIR effective
// 2026-10-01 and Con Edison's P.S.C. No. 10 Addendum SIR-23, which files the same SIR as tariff. Both captures
// are stored, and a test finds every threshold's number in both. Files starting with "_" are not records.

const SIR = { type: 'regulator', publisher: 'New York State Public Service Commission', url: 'https://dps.ny.gov/nys-standardized-interconnection-requirements-effective-october-1-2026', retrieved: '2026-11-21', capture: 'data/curated/captures/interconnect/ny-sir-2026-10-01-appendix-g.txt', sha256: 'dd5c75e43276036df9836f17bf19073faece2ec87d1b3eac3b9bab4cbab5bf17', vintage: 'SIR effective 2026-10-01 (Case 24-E-0621)' };
const CONED = { type: 'tariff', publisher: 'Consolidated Edison Company of New York', url: "https://www.coned.com/-/media/files/coned/documents/rates/electric/psc-10/addenda.pdf", retrieved: '2026-11-21', capture: 'data/curated/captures/interconnect/ny-coned-psc10-addendum-sir-23.txt', sha256: 'b6d829b866a1497fb37f413d89e8f08a75e7ee7d57ed252c9a9b15d2b90b3fc4', vintage: 'P.S.C. No. 10, Addendum SIR-23, effective 2026-10-01' };

/** Every screen: its Appendix G screen, name, threshold, what it is measured against, who can answer, and the numbers both texts must carry. */
export const SCREENS = [
  { id: 'screen-3', locator: 'Screen 3', family: 'network', measure: 'network-load', comparison: 'less than', process: 'Preliminary screening (networked secondary)', name: 'Simplified penetration test on a network', threshold: 'aggregate DER less than 15% of the network\'s minimum load, and in the local network less than 50% of the minimum load on its transformers', testBasis: 'the network\'s minimum load, and the minimum load on the local network\'s transformers', whoAnswers: 'utility', numbers: ['15% of the minimum load of the network', '50% of the minimum load on the transformer(s)'] },
  { id: 'screen-d', locator: 'Screen D', process: 'Preliminary screening', name: 'Line and grounding configuration', threshold: 'on a three-phase four-wire line with mixed three- and four-wire sections, any other connection fails unless aggregate DER AC nameplate is at most 10% of line-section peak load', testBasis: 'the primary line configuration and the line section\'s peak load', whoAnswers: 'utility', numbers: ['10% of line-section peak load'] },
  { id: 'screen-e', locator: 'Screen E', family: 'aggregate-generation', measure: 'minimum-load', comparison: 'less than', process: 'Preliminary screening (radial)', name: 'Simplified penetration test on a radial line', threshold: 'aggregate DER less than the line section\'s daytime minimum load, or less than 15% of its annual peak load where daytime minimum load data is not available', testBasis: 'the daytime minimum load of every line section upstream of the DER (12 months of data, an estimate, or a power flow model), or its annual peak load', whoAnswers: 'utility', numbers: ['less than the daytime minimum load', '15% of the annual peak load'] },
  { id: 'screen-f', locator: 'Screen F', process: 'Preliminary screening', name: 'Short-circuit capacity', threshold: 'available short-circuit capacity more than 25 times the DER\'s rating at the medium-voltage point of common coupling, and more than 25 times all aggregate DER at the substation', testBasis: 'the feeder\'s available short-circuit capacity at the point of common coupling and at the substation', whoAnswers: 'utility-model', numbers: ['greater than 25'] },
  { id: 'screen-i-3', locator: 'Screen I, item 3', family: 'interrupting-capability', measure: 'interrupting-capability', comparison: 'at most', process: 'Supplemental screening', name: 'Interrupting capability', threshold: 'equipment where fault current would exceed 90% of its short-circuit interrupting capability is identified', testBasis: 'the short-circuit interrupting capability of each device on the circuit', whoAnswers: 'utility-model', numbers: ['90% of its short circuit current interrupting capability'] },
];

const cite = (s) => [{ ...SIR, locator: `Appendix G, ${s.locator}` }, { ...CONED, locator: `Addendum SIR-23, Appendix G, ${s.locator}` }];
const field = (value, s, disputable = false) => ({ value, disputable, sources: cite(s) });

/** The record for one screen. */
export const record = (id) => {
  const s = SCREENS.find((x) => x.id === id);
  return {
    id: `ny-sir-${s.id}`, kind: 'interconnect-screen', jurisdiction: 'NY', lastChecked: '2026-11-21',
    ...(s.family ? { family: s.family, measure: s.measure, comparison: s.comparison } : {}),
    contributor: { name: 'gridprims', conflict: 'none' },
    fields: { process: field(s.process, s), screen: field(`${s.locator} ${s.name}`, s), threshold: field(s.threshold, s, true), testBasis: field(s.testBasis, s), whoAnswers: field(s.whoAnswers, s) },
  };
};
