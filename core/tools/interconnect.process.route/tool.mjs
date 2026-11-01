// interconnect.process.route: which federal interconnection process a
// generator or storage project goes through, why, and what the procedures
// say about deadlines and the pre-application report
// (add-interconnection-screens: process router). States set their own rules;
// for any state this is shown as the federal reference, not the state's rule.

import { PRE_APPLICATION, TIMELINE, route } from '../../lib/process-router.mjs';
import regulators from '../../../data/curated/regulators.mjs';


export function compute(v) {
  const j = String(v.jurisdiction).trim().toUpperCase();
  const state = j === 'FEDERAL' ? null : regulators.find((r) => r.state === j);
  if (j !== 'FEDERAL' && !state) return { status: 'invalid', errors: [{ field: 'jurisdiction', message: 'Enter federal, or a two-letter state code such as OH.' }] };
  const r = route({ kw: v.kw, kv: v.kv, technology: v.technology, mainline: v.mainline });
  const steps = [r.reason];
  if (r.process === 'fast-track') steps.push('Eligibility is not a pass: the utility still runs the Fast Track screens, and a project that fails them can go to supplemental review or the study process (§ 2.1).');
  if (r.mainlineWouldHelp) steps.push('On a mainline within 2.5 electrical circuit miles of the substation the ceiling is higher; ask the utility whether your point of interconnection is one.');
  for (const [what, when] of TIMELINE[r.process]) steps.push(`${what}: ${when}.`);
  steps.push(`A pre-application report for one point of interconnection costs $${PRE_APPLICATION.fee} and is due in ${PRE_APPLICATION.days} (${PRE_APPLICATION.cite}). It holds the line-section data the screens use.`);
  steps.push('Utilities may post their own schedules that supersede these. gridprims does not file, submit, or track an application: you file with the utility.');
  if (state) steps.unshift(`gridprims does not hold ${state.stateName}'s interconnection rules. This is the federal procedure as a reference, not the rule that applies to you. Your state's rules are at the ${state.name}: ${state.docket}`);
  const sentence = `${state ? 'Under the federal reference, ' : ''}${r.process === 'fast-track' ? `this project is eligible for Fast Track, up to ${r.ceilingKw.toLocaleString('en-US')} kW` : r.process === 'study' && r.mainlineWouldHelp && v.mainline === 'unknown' ? 'Fast Track applies only if the project connects on a mainline within 2.5 circuit miles of the substation; if not, it goes to the study process' : r.process === 'study' ? 'Fast Track does not apply; this project goes to the study process' : r.process === 'inverter-10kw' ? 'this project goes to the 10 kW Inverter Process' : 'this project is too large for the small generator procedures'}.`;
  return {
    status: 'ok',
    outputs: { ...(r.ceilingKw ? { ceilingKw: r.ceilingKw } : {}), preAppFee: PRE_APPLICATION.fee },
    sentence: sentence[0].toUpperCase() + sentence.slice(1),
    steps,
  };
}
