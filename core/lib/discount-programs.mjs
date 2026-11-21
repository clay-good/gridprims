// Discount and allowance programs (add-household-bill-check 1.4; plan-finder, "Discount programs apply to
// every plan", design D5): CARE, FERA, and medical baseline are not plans but modifiers the household ticks.
// A percent program discounts the charges its tariff text says it covers on every plan it applies to; a
// baseline program adds kWh to the first tier's allowance of every tiered plan it applies to. A plan a
// program does not cover is priced as it is, and says so.

const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Whether a program applies to a rate record: the record is the program's utility's, and its name matches
 * none of the rates the tariff text excludes.
 * @param {{utilityIds?: number[], excludes?: string[]}} program @param {{utilityId?: number, name: string}} rec
 */
export function covers(program, rec) {
  if (program.utilityIds?.length && !program.utilityIds.includes(rec.utilityId)) return false;
  return !(program.excludes ?? []).some((x) => new RegExp(x, 'i').test(rec.name));
}

/**
 * A record with a baseline program's added allowance on its first energy tier, in the tier's own basis.
 * @returns {{rec: any, applied: boolean, why?: string}}
 */
export function withAddedBaseline(rec, program) {
  if (!rec.energy) return { rec, applied: false, why: 'the plan has no energy tiers' };
  const tiered = rec.energy.periods.some((p) => p.tiers.length > 1 && p.tiers[0].upTo !== undefined);
  if (!tiered) return { rec, applied: false, why: 'the plan has no baseline tier to add to' };
  const add = (t) => (t.basis === 'kWh per day' ? program.kwhPerDay : (t.basis ?? 'kWh') === 'kWh' ? program.kwhPerMonth : undefined);
  if (rec.energy.periods.some((p) => p.tiers.length > 1 && add(p.tiers[0]) === undefined)) return { rec, applied: false, why: 'the program\'s allowance and the plan\'s tiers are in different units' };
  const periods = rec.energy.periods.map((p) => (p.tiers.length > 1 ? { ...p, tiers: [{ ...p.tiers[0], upTo: p.tiers[0].upTo + add(p.tiers[0]) }, ...p.tiers.slice(1)] } : p));
  return { rec: { ...rec, energy: { ...rec.energy, periods } }, applied: true };
}

/**
 * The discount a percent program gives one priced plan, on the components it covers.
 * @param {{percent: number, appliesTo?: Array<'fixed' | 'energy' | 'demand'>}} program
 * @param {{components: {fixed: number, energy: number, demand: number}}} priced
 */
export function percentDiscount(program, priced) {
  const parts = program.appliesTo ?? ['fixed', 'energy', 'demand'];
  return round2(parts.reduce((t, k) => t + (priced.components[k] ?? 0), 0) * program.percent / 100);
}
