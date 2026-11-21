// Run bill test vectors through our engine (add-tariff-conformance-suite:
// "Our engine is gated on it"): read each vector's URPX tariff, price its
// monthly load, and compare with the expected total within the vector's
// tolerance. A vector the engine cannot read or price is skipped with the
// reason, never counted as a pass.

import { runVector } from '../../core/lib/run-vector.mjs';

export { runVector };

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
