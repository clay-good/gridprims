// New Mexico writes its own fallback into its interconnection rule (add-interconnection-screens 4.3): when
// minimum load data is not available, Screen 9 of the Fast Track compares aggregate nameplate rating with a
// share of feeder or line section peak load, one share for inverter-based generation and another for rotating
// generation. The rule is law the state publishes, so its values are not disputable; the official compilation
// is captured with its checksum.

const NMAC = { type: 'statute', publisher: 'New Mexico Commission of Public Records (State Records Center and Archives)', url: 'https://www.srca.nm.gov/parts/title17/17.009.0568.html', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/nm-17.9.568.16-screen-9.txt', sha256: '6817ee7dbef5cf0c03d912c41d04daabe0ce717f4b4937e0617d61057be62594', locator: '17.9.568.16 NMAC, Screen 9', vintage: '17.9.568 NMAC effective February 14, 2023' };
const f = (value) => ({ value, disputable: false, sources: [NMAC] });

export default {
  id: 'nm-17.9.568.16-screen-9', kind: 'min-load-fallback', state: 'NM', lastChecked: '2026-11-16',
  contributor: { name: 'gridprims', conflict: 'none' },
  rule: '17.9.568.16 NMAC, Screen 9',
  appliesTo: 'interconnections other than single-phase line-to-neutral on three-phase four-wire or mixed three- and four-wire primary lines, when minimum load data is not available',
  fields: {
    inverter: f(30),
    rotating: f(10),
  },
};
