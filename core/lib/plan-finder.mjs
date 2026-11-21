// Which of my utility's plans would have cost the least for how I used power?
// (add-household-bill-check: plan-finder, priced exactly from a meter file.)
// Every residential plan priced on the last 12 months and ranked, with plans
// that carry a condition (an electric vehicle, a heat pump, solar, an income
// or age program, ...) kept under "Requires" unless the household says the
// condition applies, and the past-use label on every ranking.

import { compareRates } from './rate-compare.mjs';
import { conditionsOf } from './urdb-tariff.mjs';

/** Records that are a discount or allowance program rather than a plan. */
export const PROGRAM_NAMES = /\bCARE\b|\bFERA\b|medical baseline/i;

export const PAST_USE = 'Based on your past 12 months of use. Savings depend on your future use and each plan\'s enrollment terms.';

const dollars = (x) => `$${Math.round(Math.abs(x)).toLocaleString('en-US')}`;

/**
 * @param {any} series delivered energy from a meter file
 * @param {any[]} records the utility's residential tariff records
 * @param {{zone: string, currentId?: string, have?: string[], received?: any, asOf: string, programs?: any[]}} opts have: the conditions the household meets;
 *   programs: the discount and allowance programs it is on (core/lib/discount-programs.mjs), applied to every plan they cover
 */
export function findPlans(series, records, opts) {
  const have = new Set(opts.have ?? []);
  // A discount program is a modifier the household ticks, never a plan of its own (plan-finder, D5).
  const programRecords = records.filter((rec) => PROGRAM_NAMES.test(rec.name) && rec.id !== opts.currentId);
  records = records.filter((rec) => !programRecords.includes(rec));
  const withConditions = records.map((rec) => ({ rec, conditions: conditionsOf(rec.name) }));
  const open = withConditions.filter((x) => x.conditions.every((c) => have.has(c)) || x.rec.id === opts.currentId).map((x) => x.rec);
  const r = compareRates(series, open, { zone: opts.zone, currentId: opts.currentId, received: opts.received, asOf: opts.asOf, programs: opts.programs });
  // Plans that need a condition the household has not checked: priced on the same use, outside the ranking.
  const gated = withConditions.filter((x) => !open.includes(x.rec));
  const requires = gated.length ? compareRates(series, gated.map((x) => x.rec), { zone: opts.zone, asOf: opts.asOf, programs: opts.programs }).ranked.map((p) => ({ ...p, conditions: withConditions.find((x) => x.rec === p.rec).conditions })) : [];
  const best = r.ranked[0];
  const headline = r.current && best && best !== r.current && best.annual < r.current.annual
    ? `${best.rec.name} would have cost ${dollars(best.diff)} less (${Math.abs(best.pct)}%) on the last 12 months.`
    : r.current ? 'Your current plan cost the least on the last 12 months.' : null;
  return { ...r, requires, headline, label: PAST_USE, ...(programRecords.length ? { programRecords: programRecords.map((rec) => ({ id: rec.id, name: rec.name, note: 'A discount or allowance program, applied to every plan it covers when you tick it, not listed as a plan.' })) } : {}) };
}
