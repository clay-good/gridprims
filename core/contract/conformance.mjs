// The bill engine's standing against regulator bills (add-tariff-conformance-suite 3.7, "Feeds the limits
// page and the validation levels"): from the latest bill test vector release, how many rates and states our
// engine matches within 0.5% of the published bill or $1.00, whichever is larger, against the bar of 20 rates
// spanning 5 states that raises the bill tools to cross-checked. The limits page, its JSON copy, and the MCP
// resource read this one object.

import { runVector } from '../lib/run-vector.mjs';

/** The tools whose bills the engine computes, and so whose level the scorecard sets. */
export const BILL_TOOLS = ['household.bill-totals.check'];
export const BAR = { rates: 20, states: 5 };
export const SCORECARD_URL = '/data/ground-truth/scorecard/';
const within = (published, computed) => Math.abs(computed - published) <= Math.max(Math.abs(published) * 0.005, 1) + 1e-9;

/**
 * @param {{version: string, date: string} | null} release the latest changelog entry
 * @param {any[]} vectors that release's vectors
 * @param {{uncovered?: string[]}} [coverage] that release's coverage
 * @returns {null | {release: string, date: string, rates: number, states: string[], missed: number, bar: typeof BAR, met: boolean, uncovered: string[], scorecard: string}}
 */
export function conformanceStatus(release, vectors, coverage = {}) {
  if (!release) return null;
  // A rate counts when every vector cut from it is reproduced within the margin.
  const byRate = Map.groupBy(vectors, (v) => `${v.provenance.utility}|${v.provenance.schedule ?? ''}|${v.id.slice(0, 2)}`);
  const matched = [...byRate.values()].filter((vs) => vs.every((v) => { const r = runVector(v); return r.status !== 'skipped' && within(r.expected, r.computed); }));
  const states = [...new Set(matched.map((vs) => vs[0].id.slice(0, 2).toUpperCase()))].sort();
  return { release: release.version, date: release.date, rates: matched.length, states, missed: byRate.size - matched.length, bar: BAR,
    met: matched.length >= BAR.rates && states.length >= BAR.states, uncovered: coverage.uncovered ?? [], scorecard: SCORECARD_URL };
}
