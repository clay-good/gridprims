// The model against what happened (add-grid-scenario-model: self-backtest).
// The unmodified fleet's dispatch is compared, fuel by fuel and hour by hour,
// with EIA-930's recorded generation; the error then travels with every
// scenario, and a scenario change smaller than the error is not a finding.
// Causes are listed with what they touch, never chosen.

import { DISPATCHED } from './fleet.mjs';
import { COLUMN, RECORDED } from './dispatch.mjs';

const rank = (v, q) => v[Math.min(v.length - 1, Math.max(0, Math.ceil(q * v.length) - 1))];

/** Definitions shown beside every metric. */
export const METRIC_KEYS = ['bias', 'mae', 'marginalMatch'];

/**
 * The fuel recorded data indicates was marginal in an hour: the dispatched fuel whose recorded output moved
 * most from the previous reported hour in the direction their total moved. Null when the total did not move.
 */
export function recordedMarginal(prev, r) {
  if (!prev) return null;
  const d = DISPATCHED.map((c) => [c, (r[COLUMN[c]] ?? 0) - (prev[COLUMN[c]] ?? 0)]);
  const total = d.reduce((a, [, x]) => a + x, 0);
  if (total === 0) return null;
  return d.reduce((best, x) => (Math.sign(total) * x[1] > Math.sign(total) * best[1] ? x : best))[0];
}

/**
 * @param {{rows: any[], run: ReturnType<typeof import('./dispatch.mjs').dispatch>}} p the hours and the unmodified run over them
 */
export function backtest({ rows, run }) {
  const fuels = {};
  let absAll = 0; let actAll = 0; let modAll = 0;
  for (const c of DISPATCHED) {
    let mod = 0; let act = 0; let abs = 0;
    const diffs = [];
    rows.forEach((r, h) => {
      if (r.demand === null || r.demand === undefined) return;
      const a = r[COLUMN[c]] ?? 0;
      const m = run.hourly[c][h];
      mod += m; act += a; abs += Math.abs(m - a);
      diffs.push(m - a);
    });
    diffs.sort((x, y) => x - y);
    absAll += abs; actAll += act; modAll += mod;
    fuels[c] = {
      modeled_mwh: mod, actual_mwh: act, difference_mwh: mod - act,
      // A fuel the region barely burned has no meaningful percent error.
      bias: act > 0 ? (mod - act) / act : null,
      mae: act > 0 ? abs / act : null,
      hourly: diffs.length ? { p10: rank(diffs, 0.1), median: rank(diffs, 0.5), p90: rank(diffs, 0.9) } : null,
    };
  }
  // The marginal fuel, modeled against what the recorded changes indicate.
  let compared = 0; let matched = 0; let prev = null;
  rows.forEach((r, h) => {
    if (r.demand === null || r.demand === undefined) { prev = null; return; }
    const rec = recordedMarginal(prev, r);
    const u = run.marginalUnit(h);
    if (rec && u) { compared++; if (u.class === rec) matched++; }
    prev = r;
  });
  return {
    fuels,
    overall: { modeled_mwh: modAll, actual_mwh: actAll, bias: actAll ? (modAll - actAll) / actAll : null, mae: actAll ? absAll / actAll : null },
    marginalMatch: compared ? matched / compared : null, marginalCompared: compared,
    hours: run.hours, excluded: run.excluded,
  };
}

/**
 * A scenario's change in each fuel, as a share of actual generation, beside the backtest's bias for that fuel
 * over the same hours. A change no larger than the bias is reported as within the model's own error.
 */
export function againstBias(base, scenario, bt) {
  return Object.fromEntries(DISPATCHED.map((c) => {
    const act = bt.fuels[c].actual_mwh;
    const change = scenario.totals[c] - base.totals[c];
    const share = act ? change / act : null;
    const bias = bt.fuels[c].bias;
    const finding = share !== null && bias !== null && Math.abs(share) > Math.abs(bias);
    return [c, { change_mwh: change, share, bias, finding }];
  }));
}

/**
 * The candidate causes of the error, each with the share of capacity or hours it touches, in a fixed order.
 * None is chosen.
 * @param {{fleet: any, rows: any[], categories: any[]}} p
 */
export function candidateCauses({ fleet, rows, categories }) {
  const s = fleet.summary;
  const total = s.placed_mw + s.unplaceable_mw;
  const reported = rows.filter((r) => r.demand !== null && r.demand !== undefined);
  const imbalanced = reported.filter((r) => {
    const sum = [...RECORDED, ...Object.values(COLUMN)].reduce((a, c) => a + (r[c] ?? 0), 0);
    return r.net_generation ? Math.abs(sum - r.net_generation) / Math.abs(r.net_generation) > 0.01 : false;
  }).length;
  return [
    { cause: 'derivedHeatRates', share: s.derived_share + s.plant_rate_share, of: 'capacity' },
    { cause: 'substitutedPrices', share: s.substituted_share, of: 'capacity' },
    { cause: 'commitment', share: 1, of: 'hours' },
    { cause: 'fixedInterchange', share: reported.length ? reported.filter((r) => r.interchange).length / reported.length : 0, of: 'hours' },
    { cause: 'unplaceable', share: total ? s.unplaceable_mw / total : 0, of: 'capacity' },
    { cause: 'referenceData', share: rows.length ? (rows.length - reported.length + imbalanced) / rows.length : 0, of: 'hours', missing: rows.length - reported.length, imbalanced, categories },
  ];
}
