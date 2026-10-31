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
  { date: '2026-10-31', toolId: 'electrify.service-headroom.check', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'ratepayer.revenue-requirement.explain', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.line-rating.ampacity', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.cost.lcoe', version: '0.2.0', reason: 'Cross-checked against NLR ATB 2025\'s published LCOE for nine technologies. No answer changed; results now report validation level 2.', sample: { inputs: { fcr: 0.07, capex: 1000, fom: 20, cf: 25, vom: 0, fuel: 0 }, old: '$41.10/MWh (level 1)', new: '$41.10/MWh (level 2)' } },
  { date: '2026-10-31', toolId: 'calc.cost.lcoe', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.storage.basics', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.transformer.size', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.power-factor.correct', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.energy-units.emissions', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'household.usage-benchmark.compare', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'household.bill-totals.check', version: '0.1.0', reason: 'First release.' },
  { date: '2026-10-31', toolId: 'calc.energy-units.convert', version: '0.2.0', reason: 'Cross-checked against NIST SP 811 Appendix B.8 and marked stable. No answer changed; results now report validation level 2. The assumptions now say which therm is used.', sample: { inputs: { value: 1, from: 'therm', to: 'J' }, old: '105,500,000 J (level 1)', new: '105,500,000 J (level 2)' } },
  { date: '2026-10-30', toolId: 'calc.energy-units.convert', version: '0.1.0', reason: 'First release.' },
];
