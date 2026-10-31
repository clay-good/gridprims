// electrify.service-headroom.check: room left on an existing electric service
// by the measured-demand method, from twelve monthly maximum demands on
// demand-metered bills or one maximum from a recording of 30 days or more.
// The workbench runs the same arithmetic on a meter file.

import { headroomReport } from '../../lib/service-headroom.mjs';

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
  const r = headroomReport({ maxKw: Math.max(...values), period: v.basis === 'bills' ? '12-month' : '30-day', powerFactor: v.powerFactor, volts: v.volts, phase: v.phase === '3' ? 3 : 1, ratingA: v.ratingA, hasGeneration: v.generation === 'yes', edition: v.edition });
  if (r.status === 'refused') return r;
  const { h, at90, maxKw } = r;
  return {
    status: 'ok',
    outputs: { maxKw, kva: h.kva, kva125: h.kva125, amps: h.amps, headroomA: h.headroomA, headroomKva: h.headroomKva, headroomA90: at90.headroomA },
    sentence: (out) => (h.fits
      ? `About ${out.headroomA.display} A (${out.headroomKva.display} kVA) of this ${v.ratingA} A service is left by the measured-demand method in ${r.cite}.`
      : `The measured demand × 125% is ${out.amps.display} A, more than this ${v.ratingA} A service's rating, by the method in ${r.cite}.`),
    steps: r.steps,
  };
}
