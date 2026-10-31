// Which of my utility's plans would have cost the least for how I used power?
// (add-household-bill-check: plan-finder, priced exactly from a meter file.)
// Every residential plan priced on the last 12 months and ranked, with plans
// that carry a condition (an electric vehicle, a heat pump, solar, an income
// or age program, ...) kept under "Requires" unless the household says the
// condition applies, and the past-use label on every ranking.

import { compareRates } from './rate-compare.mjs';
import { conditionsOf } from './urdb-tariff.mjs';

export const PAST_USE = 'Based on your past 12 months of use. Savings depend on your future use and each plan\'s enrollment terms.';

const dollars = (x) => `$${Math.round(Math.abs(x)).toLocaleString('en-US')}`;

/**
 * @param {any} series delivered energy from a meter file
 * @param {any[]} records the utility's residential tariff records
 * @param {{zone: string, currentId?: string, have?: string[], received?: any, asOf: string}} opts have: the conditions the household meets
 */
export function findPlans(series, records, opts) {
  const have = new Set(opts.have ?? []);
  const withConditions = records.map((rec) => ({ rec, conditions: conditionsOf(rec.name) }));
  const open = withConditions.filter((x) => x.conditions.every((c) => have.has(c)) || x.rec.id === opts.currentId).map((x) => x.rec);
  const r = compareRates(series, open, { zone: opts.zone, currentId: opts.currentId, received: opts.received, asOf: opts.asOf });
  // Plans that need a condition the household has not checked: priced on the same use, outside the ranking.
  const gated = withConditions.filter((x) => !open.includes(x.rec));
  const requires = gated.length ? compareRates(series, gated.map((x) => x.rec), { zone: opts.zone, asOf: opts.asOf }).ranked.map((p) => ({ ...p, conditions: withConditions.find((x) => x.rec === p.rec).conditions })) : [];
  const best = r.ranked[0];
  const headline = r.current && best && best !== r.current && best.annual < r.current.annual
    ? `${best.rec.name} would have cost ${dollars(best.diff)} less (${Math.abs(best.pct)}%) on the last 12 months.`
    : r.current ? 'Your current plan cost the least on the last 12 months.' : null;
  return { ...r, requires, headline, label: PAST_USE };
}
