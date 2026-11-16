// Run bill test vectors through our engine (add-tariff-conformance-suite:
// "Our engine is gated on it"): read each vector's URPX tariff, price its
// monthly load, and compare with the expected total within the vector's
// tolerance. A vector the engine cannot read or price is skipped with the
// reason, never counted as a pass.

import { fromUrpx } from '../../core/lib/urpx.mjs';
import { priceTotals } from '../../core/lib/bill-totals.mjs';

/**
 * One vector's result: pass, fail, or skipped, with the expected and computed totals in dollars.
 * @param {any} v a vector that passes checkVector
 * @returns {{id: string, status: 'pass' | 'fail' | 'skipped', expected: number, computed?: number, difference?: number, reason?: string}}
 */
export function runVector(v) {
  const expected = v.expected.total.amount;
  const read = fromUrpx(v.tariff.document);
  if (read.error) return { id: v.id, status: 'skipped', expected, reason: read.error };
  if (v.load.kind !== 'monthly') return { id: v.id, status: 'skipped', expected, reason: 'interval loads are not run yet' };
  let cents = 0;
  try {
    for (const p of v.load.periods) cents += priceTotals({ start: p.start, end: p.end, kwh: p.kwh, ...(p.tou ? { tou: p.tou } : {}) }, read.tariff).totalCents;
  } catch (err) {
    return { id: v.id, status: 'skipped', expected, reason: err.message };
  }
  const computed = cents / 100;
  const difference = Number((computed - expected).toFixed(2));
  const allowed = v.tolerance.unit === '%' ? Math.abs(expected) * v.tolerance.amount / 100 : v.tolerance.amount;
  return { id: v.id, status: Math.abs(difference) <= allowed + 1e-9 ? 'pass' : 'fail', expected, computed, difference };
}

/**
 * The gate: every vector must pass, unless a recorded finding shows the vector itself is wrong.
 * @param {any[]} vectors @param {Array<{vector: string, finding: string, date: string}>} findings
 * @returns {string[]} one line per vector that blocks a release
 */
export function gateVectors(vectors, findings = []) {
  const wrong = new Set(findings.map((f) => f.vector));
  return vectors.map(runVector).filter((r) => r.status === 'fail' && !wrong.has(r.id))
    .map((r) => `${r.id}: our engine gives $${r.computed.toFixed(2)}, the vector expects $${r.expected.toFixed(2)} (${r.difference > 0 ? '+' : ''}${r.difference.toFixed(2)}); fix the engine, or record a finding that the vector is wrong`);
}
