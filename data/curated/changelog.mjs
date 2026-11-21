// The public changelog (platform/tool-contract, "Stable, versioned results"):
// one entry per tool version, newest first. A change that alters any result for
// the same input bumps the tool's version and adds an entry here naming the
// old and new value for a sample input and the reason. Rendered at /changelog/.

/**
 * Security fixes that change a number or what a visitor sees are entries too, with
 * kind 'security' and the reporter's name in `credit` only when they consent; an
 * entry never describes an unpatched path on another site.
 *
 * @type {Array<{date: string, toolId: string | null, version: string, reason: string, kind?: 'security', credit?: string, sample?: {inputs: object, old: string, new: string}}>}
 */
export default [
  { date: '2026-11-21', toolId: 'household.bill-totals.check', version: '0.2.0', reason: 'Rates are now carried to nine decimals instead of six, so a rate URDB gives to seven decimals is priced as given. An independent recomputation of the conformance scorecard from the raw URDB file found two Louisiana bills a cent apart; a bill can move by a cent or so where the rate has more than six decimals.', sample: { inputs: { periods: '2026-11-01 to 2026-11-30, 3000 kWh', tariff: '{"fixedMonthly":6.5,"seasons":[{"name":"all year","from":"01-01","tiers":[{"rate":0.0710084}]}]}', prorate: 'yes' }, old: '219.52', new: '219.53' } },
  { date: '2026-11-14', toolId: 'electrify.service-headroom.check', version: '0.2.0', reason: 'NFPA moved its free-access page, so the citation to NFPA 70 § 220.87 now gives the page\'s new address, nfpa.org/for-professionals/codes-and-standards/list-of-codes-and-standards/free-access. The section cited and every number are unchanged.' },
  { date: '2026-11-14', toolId: 'weather.change.explain', version: '0.2.0', reason: 'Recurve moved its data-sufficiency and disqualification guidelines, so that citation now gives the page\'s new address. The thresholds cited and every number are unchanged.' },
  { date: '2026-11-01', toolId: 'interconnect.inverter.size', version: '0.1.0', reason: 'First release.' },
  { date: '2026-11-01', toolId: 'interconnect.fast-track.screens', version: '0.1.0', reason: 'First release.' },
  { date: '2026-11-01', toolId: 'interconnect.process.route', version: '0.1.0', reason: 'First release.' },
  { date: '2026-11-16', toolId: 'interconnect.fast-track.screens', version: '0.2.0', reason: 'An optional state: with CA and the gross ratings on your service transformer, the result adds California Rule 21 Screen D, the transformer screen, with its comparison and citations, kept apart from the federal counts. No federal answer changed.', sample: { inputs: { state: 'CA', aggregateKva: 75, transformerKva: 50 }, old: 'federal screens only', new: 'Screen D: 150.0% of the transformer rating, not met' } },
  { date: '2026-11-16', toolId: 'interconnect.minimum-load.screen', version: '0.3.0', reason: 'An optional state: where a state writes its own fallback into its rules, as New Mexico does in 17.9.568.16 NMAC Screen 9, the result shows each value against its technology and the result at yours. A fallback seen only in a secondary source is named, not used. No answer changed without a state.', sample: { inputs: { peakKw: 2000, aggregateKw: 500, state: 'NM', generatorType: 'inverter' }, old: 'no state fallback shown', new: 'at most 30% of peak for inverter-based generation: met' } },
  { date: '2026-11-14', toolId: 'interconnect.minimum-load.screen', version: '0.2.0', reason: 'Every result now says which minimum load the rule uses for your project, daytime or absolute, and cites SGIP § 2.4.4.1.1 for it; a utility value is read the same way. No number changed. A solar-plus-storage worked example was added.', sample: { inputs: { peakKw: 2000, aggregateKw: 500, technology: 'storage', minLoadKw: 0, minLoadSource: 'report', measured: 'unknown' }, old: 'uses absolute minimum load (no citation)', new: 'uses absolute minimum load (SGIP § 2.4.4.1.1)' } },
  { date: '2026-11-01', toolId: 'interconnect.minimum-load.screen', version: '0.1.0', reason: 'First release.' },
  { date: '2026-11-01', toolId: 'lines.attachment-height.find', version: '0.1.0', reason: 'First release.' },
  { date: '2026-11-16', toolId: 'lines.midspan-clearance.check', version: '0.4.0', reason: 'The check now reads your standards file, the same rule record the attachment tool reads: its road, driveway, foot-traffic, and rail clearances and its separations fill any value you leave as none, each naming its row and source. A value you type still wins, and two rows that disagree refuse the check until you pick one. No answer changed for checks without a file.', sample: { inputs: { ruleSource: 'yours', crosses: 'road', required: 'none', rules: 'ground.road.comm,,18,ft' }, old: 'What clearance do your rules require over it?', new: '4 ft 6 in. above the 18 ft your rules require over a road' } },
  { date: '2026-11-14', toolId: 'lines.midspan-clearance.check', version: '0.3.0', reason: 'Two more rule sources: your values with GO 95 filling any you leave as none, and NESC values you enter from your own 2023 or 2028 copy, each labeled with where it came from. With no rules, the answer now says no rules were loaded. A chosen crossing with no clearance now asks for the clearance instead of the crossing.', sample: { inputs: { ruleSource: 'yours', crosses: 'road', required: 'none' }, old: 'What does the span cross?', new: 'What clearance do your rules require over it?' } },
  { date: '2026-11-14', toolId: 'lines.midspan-clearance.check', version: '0.2.0', reason: 'The span and the two pole heights are now typed lengths: a link keeps exactly what was typed (6.81 m stays 6.81 m), and the server reads each as inches. No number changed.', sample: { inputs: { span: '6.81 m' }, old: 'read as text', new: 'read as 268.1 in.' } },
  { date: '2026-11-01', toolId: 'lines.midspan-clearance.check', version: '0.1.0', reason: 'First release.' },
  { date: '2026-11-01', toolId: 'grid.large-load.take-or-pay', version: '0.1.0', reason: 'First release.' },
  { date: '2026-11-01', toolId: 'grid.large-load.context', version: '0.1.0', reason: 'First release.' },
  { date: '2026-11-01', toolId: 'weather.change.explain', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'reliability.outage-log.indices', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'carbon.load-shift.estimate', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'electrify.backup-power.size', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'electrify.service-headroom.check', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'ratepayer.revenue-requirement.explain', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.line-rating.ampacity', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.cost.lcoe', version: '0.2.0', reason: 'Cross-checked against NLR ATB 2025\'s published LCOE for nine technologies. No answer changed; results now report validation level 2.', sample: { inputs: { fcr: 0.07, capex: 1000, fom: 20, cf: 25, vom: 0, fuel: 0 }, old: '$41.10/MWh (level 1)', new: '$41.10/MWh (level 2)' } },
  { date: '2026-10-31', toolId: 'calc.cost.lcoe', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.storage.basics', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.transformer.size', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.power-factor.correct', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.energy-units.emissions', version: '0.1.0', reason: 'First release.' },
  { date: '2026-11-14', toolId: 'household.usage-benchmark.compare', version: '0.2.0', reason: 'An optional nearby station shows how unusual the year\'s weather was: its heating and cooling degree days against NOAA\'s 1991–2020 normals for the same days. With no station, nothing changes.', sample: { inputs: { weather: 'a station' }, old: 'no weather line', new: '18% fewer heating degree days than normal (station shown)' } },
  { date: '2026-10-31', toolId: 'household.usage-benchmark.compare', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'household.bill-totals.check', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.energy-units.convert', version: '0.2.0', reason: 'Cross-checked against NIST SP 811 Appendix B.8 and marked stable. No answer changed; results now report validation level 2. The assumptions now say which therm is used.', sample: { inputs: { value: 1, from: 'therm', to: 'J' }, old: '105,500,000 J (level 1)', new: '105,500,000 J (level 2)' } },
  { date: '2026-10-30', toolId: 'calc.energy-units.convert', version: '0.1.0', reason: 'First release.' },
];
