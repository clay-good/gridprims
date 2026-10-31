// electrify.service-headroom.check: room left on an existing electric service
// by the measured-demand method, from twelve monthly maximum demands on
// demand-metered bills or one maximum from a recording of 30 days or more.
// The workbench runs the same arithmetic on a meter file.

import { EDITIONS, generationRule, headroom } from '../../lib/service-headroom.mjs';

const n1 = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Numbers from a list typed one a line or separated by commas. */
export function readDemands(text) {
  const parts = String(text).split(/[\n,;]+/).map((p) => p.replace(/kw/i, '').trim()).filter(Boolean);
  const values = parts.map(Number);
  const bad = parts.filter((p, i) => !(values[i] >= 0) || p === '');
  return bad.length ? { error: `Not a number of kW: ${bad.slice(0, 3).join(', ')}.` } : { values };
}

/**
 * @param {{demand: string, basis: string, powerFactor: number, volts: number, phase: string, ratingA: number, generation: string, edition: string}} v
 */
export function compute(v) {
  const read = readDemands(v.demand);
  if (read.error) return { status: 'invalid', errors: [{ field: 'demand', message: read.error }] };
  const { values } = read;
  if (v.basis === 'bills' && values.length !== 12) return { status: 'invalid', errors: [{ field: 'demand', message: `Enter all 12 monthly maximum demands, one per bill; this list has ${values.length}.` }] };
  if (v.basis === 'recording' && values.length !== 1) return { status: 'invalid', errors: [{ field: 'demand', message: 'Enter the one highest 15-minute demand from the recording.' }] };
  if (!(v.powerFactor > 0 && v.powerFactor <= 1)) return { status: 'invalid', errors: [{ field: 'powerFactor', message: 'Power factor is between 0 and 1, such as 0.95.' }] };
  const ed = EDITIONS[v.edition];
  const cite = `${ed.edition} ${ed.section}`;
  const period = v.basis === 'bills' ? '12-month' : '30-day';
  const rule = generationRule(period, v.generation === 'yes');
  if (!rule.allowed) return { status: 'refused', reason: `${rule.reason} (${cite}.)` };

  const maxKw = Math.max(...values);
  const phase = v.phase === '3' ? 3 : 1;
  const h = headroom({ maxKw, powerFactor: v.powerFactor, volts: v.volts, phase, ratingA: v.ratingA });
  const at90 = headroom({ maxKw, powerFactor: 0.9, volts: v.volts, phase, ratingA: v.ratingA });
  const toAmps = phase === 3 ? `× 1,000 ÷ (√3 × ${v.volts} V)` : `× 1,000 ÷ ${v.volts} V`;
  return {
    status: 'ok',
    outputs: { maxKw, kva: h.kva, kva125: h.kva125, amps: h.amps, headroomA: h.headroomA, headroomKva: h.headroomKva, headroomA90: at90.headroomA },
    sentence: (out) => (h.fits
      ? `About ${out.headroomA.display} A (${out.headroomKva.display} kVA) of this ${v.ratingA} A service is left by the measured-demand method in ${cite}.`
      : `The measured demand × 125% is ${out.amps.display} A, more than this ${v.ratingA} A service's rating, by the method in ${cite}.`),
    steps: [
      `Data period: ${period === '12-month' ? 'the highest of 12 monthly maximum demands from demand-metered bills' : 'the highest 15-minute demand from a recording of at least 30 days'}: ${n1(maxKw)} kW.`,
      `Demand in kVA: ${n1(maxKw)} kW ÷ power factor ${v.powerFactor} = ${n1(h.kva)} kVA.`,
      `Times 125%: ${n1(h.kva)} × 1.25 = ${n1(h.kva125)} kVA.`,
      `In amps: ${n1(h.kva125)} kVA ${toAmps} = ${n1(h.amps)} A.`,
      `Headroom: ${v.ratingA} A − ${n1(h.amps)} A = ${n1(h.headroomA)} A, or ${n1(h.headroomKva)} kVA.`,
      `At power factor 0.90 instead, the headroom is ${n1(at90.headroomA)} A.`,
      ...(phase === 3 ? ['Utility meter data is the total for the service and assumes the phases are balanced. The 30-day option is based on the highest-loaded phase, so per-phase recordings, when you have them, replace the meter total.'] : []),
      ...(rule.note ? [rule.note] : []),
      `Method: ${cite}${ed.unverified ? ' (the section number for this edition is from a secondary source and not yet checked against the adopted code)' : ''}, paraphrased: the existing load is the maximum demand from a year of data, or from 30 days or more of 15-minute recording, taken at 125%. The authority having jurisdiction decides which edition applies and whether this method may be used.`,
    ],
  };
}
