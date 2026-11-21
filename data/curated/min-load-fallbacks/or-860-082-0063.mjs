// Oregon writes its own fallback into its small generator interconnection rules (add-interconnection-screens
// 1.3 and 4.3): when minimum load data are not available, the Supplemental Review Penetration Screen compares
// aggregate export capacity with 30 percent of peak load, one value for every kind of generator, and the test
// is strict ("less than"). The rule is law the state publishes, so its value is not disputable. The Secretary
// of State's database refuses scripted readers, so the capture is of its page as the Internet Archive holds it
// (2026-07-08), with the page's checksum.

const OAR = { type: 'statute', publisher: 'Oregon Secretary of State (Oregon Administrative Rules Database), Public Utility Commission', url: 'https://secure.sos.state.or.us/oard/displayDivisionRules.action?selectedDivision=4084', retrieved: '2026-11-21', capture: 'data/curated/captures/interconnect/or-oar-860-082-0063.txt', sha256: '75f05930ae58076d402bd12e82d50ea1d85da4978c395d681f9288dbc04a24df', vintage: 'OAR 860-082-0063, PUC 4-2024, effective 2024-04-09', locator: 'OAR 860-082-0063(2)(a)' };
const f = (value) => ({ value, disputable: false, sources: [OAR] });

export default {
  id: 'or-860-082-0063-2-a', kind: 'min-load-fallback', state: 'OR', lastChecked: '2026-11-21',
  contributor: { name: 'gridprims', conflict: 'none' },
  rule: 'OAR 860-082-0063(2)(a), the Supplemental Review Penetration Screen',
  appliesTo: 'aggregate export capacity on every line section bounded by automatic sectionalizing devices upstream of the project, when minimum load data are not available or cannot be calculated, estimated, or determined',
  comparison: 'less than',
  fields: {
    any: f(30),
  },
};
