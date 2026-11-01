const base = { dcKw: 150, acKw: 120, exportKw: 0, storage: 'no' };

export default {
  id: 'interconnect.inverter.size',
  version: '0.1.0',
  title: 'Inverter sizing and export limits',
  purpose: 'The ratio of your panels to your inverter, what a high or low ratio means for clipping, and which figure the interconnection screens look at when you limit export.',
  archetype: 'calculator',
  firstScreen: ['dcKw', 'acKw', 'exportKw', 'storage'],
  inputs: [
    { name: 'dcKw', label: 'Panel capacity', type: 'number', unit: 'kW of direct current', range: { min: 0, max: 1e6 }, precision: 'exact', example: 150 },
    { name: 'acKw', label: 'Inverter capacity', type: 'number', unit: 'kW of alternating current', range: { min: 0.1, max: 1e6 }, precision: 'exact', example: 120 },
    { name: 'exportKw', label: 'Export limit', type: 'number', unit: 'kW', range: { min: 0, max: 1e6 }, precision: 'exact', example: 0, hint: '0 if the project does not limit export.' },
    { name: 'storage', label: 'The project includes storage', type: 'enum', example: 'no', options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] },
  ],
  outputs: [
    { name: 'ratio', label: 'Panels to inverter', unitless: true, rounding: { decimals: 2, fixed: true } },
    { name: 'screenedKw', label: 'The figure the screens generally see', unit: 'kW', rounding: { decimals: 2, fixed: true } },
  ],
  method: 'The ratio is panel capacity in kW of direct current divided by inverter capacity in kW of alternating current, to 0.01. Above 1 the inverter clips the top of sunny days; below 1 it runs under its rating. The screens generally test the inverter\'s alternating-current rating; where a rule tests what the project exports instead, an export limit below that rating is the figure it sees, if the utility accepts how the limit is held.',
  assumptions: [
    'One inverter rating for the whole project; a project with several inverters sums them.',
    'Whether a limiting method qualifies is the utility\'s decision under its own rules.',
  ],
  citations: [
    { source: 'U.S. Energy Information Administration, Today in Energy, "Solar plants typically install more panel capacity relative to their inverter capacity"', edition: 'May 25, 2018; figures as of end-2016', locator: 'individual-system inverter loading ratios usually between 1.13 and 1.30; capacity-weighted average 1.25', url: 'https://www.eia.gov/todayinenergy/detail.php?id=35372' },
    { source: 'Public Utility Commission of Texas, 16 TAC § 25.211, Interconnection of On-Site Distributed Generation', edition: 'effective January 5, 2017; read 2026-11-01', locator: '§ 25.211(g)(1): no pre-interconnection study fee for pre-certified units up to 500 kW that export not more than 15% of the total load on a single radial feeder', url: 'https://ftp.puc.texas.gov/public/puct-info/agency/rulesnlaws/subrules/electric/25.211/25.211.pdf' },
  ],
  datasets: [],
  glossary: ['kw', 'nameplate-capacity'],
  examples: [
    { id: 'ratio', title: 'A 150 kW array on a 120 kW inverter', inputs: base, expect: { ratio: { value: 1.25, tolerance: { abs: 1e-9 }, display: '1.25' }, screenedKw: { value: 120, tolerance: { abs: 1e-9 }, display: '120.00' } }, source: 'interconnect/equipment-reference spec, scenario "Ratio computed": 150 ÷ 120 = 1.25, and the screens see the 120 kW alternating-current rating' },
    { id: 'limited', title: 'A 500 kW project limited to 100 kW of export', inputs: { dcKw: 625, acKw: 500, exportKw: 100, storage: 'yes' }, expect: { ratio: { value: 1.25, tolerance: { abs: 1e-9 }, display: '1.25' }, screenedKw: { value: 100, tolerance: { abs: 1e-9 }, display: '100.00' } }, source: 'interconnect/equipment-reference spec, scenario "Limited export": a rule that tests exported power sees 100 kW; one that tests nameplate still sees 500 kW' },
    { id: 'undersized', title: 'An inverter larger than the array', inputs: { dcKw: 90, acKw: 120, exportKw: 0, storage: 'no' }, expect: { ratio: { value: 0.75, tolerance: { abs: 1e-9 }, display: '0.75' } }, source: 'Hand-computed: 90 ÷ 120 = 0.75, so nothing clips' },
  ],
  related: ['interconnect.process.route', 'interconnect.fast-track.screens'],
  // EIA's article carries a query string, which a handoff may not, so it stays a citation.
  handoffs: [{ label: 'Premises wiring, panels, and busbars (our trades site)', url: 'https://roughlogic.com/' }],
  stability: 'experimental',
  validation: { level: 1, evidence: [{ kind: 'own-examples', summary: 'The spec\'s ratio-computed and limited-export scenarios and an undersized inverter, each hand-computed.' }] },
  toRaise: 'A published worked sizing example from a utility or a national laboratory, reproduced, would raise it to cross-checked.',
  screeningLabel: 'An explanation of which figure a screen looks at, not a determination. The utility decides what it accepts.',
  limitations: [
    'Whether an export-limiting or power control method qualifies differs by rule and by utility.',
    'No benchmark table of typical ratios is shipped: the published distributions move each year.',
    'Service, panel, busbar, and conductor rules are electrical-code matters and are not covered.',
  ],
};
