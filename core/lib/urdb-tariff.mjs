// URDB residential rates as the bill engine reads them (add-household-bill-
// check task 1.2): what kind of service a rate is, whether totals can price
// it, and, when they can, its fixed and minimum charges and its energy
// seasons and tiers. URDB's "adj" (a rider or fuel adjustment it lists
// beside a rate) is added to the rate and named.

const MONTH_DAY = ['01-01', '02-01', '03-01', '04-01', '05-01', '06-01', '07-01', '08-01', '09-01', '10-01', '11-01', '12-01'];
const json = (s) => (s ? JSON.parse(s) : null);

// Who a rate is for, as its name states it: a household that does not meet the condition cannot take it.
const CONDITIONS = [
  ['low-income', /low[- ]income|income[- ]qualified|\bCARE\b|\bFERA\b|assistance/i],
  ['elderly-or-disabled', /elderly|senior|disabled|disability|medical/i],
  ['electric-vehicle', /electric vehicle|\bEV\b|\bPEV\b/i],
  ['space-heating', /space heat|heat pump|electric heat|home heat/i],
  ['all-electric', /all\s*-?\s*electric|total electric/i],
  ['water-heating', /water heat/i],
  ['net-metering', /net meter|\bNEM\b|distributed generation|\bsolar\b/i],
  ['seasonal-or-farm', /seasonal|farm|irrigation/i],
];

/**
 * @param {any} r a row of the urdb rates table
 * @returns {{service: 'bundled' | 'delivery' | 'delivery-standard-offer' | 'energy-only' | 'not-stated', residential: boolean, conditions: string[], tou: boolean, demand: boolean, totals: boolean, reasons: string[]}}
 */
export function classify(r) {
  const service = { Bundled: 'bundled', Delivery: 'delivery', 'Delivery with Standard Offer': 'delivery-standard-offer', Energy: 'energy-only' }[r.service_type] ?? 'not-stated';
  const weekday = json(r.energy_weekday_schedule) ?? [];
  const weekend = json(r.energy_weekend_schedule) ?? [];
  const strux = json(r.energy_rate_structure) ?? [];
  // Time of use within a day (or weekdays priced apart from weekends): totals cannot price it exactly.
  const tou = weekday.some((m, i) => new Set(m).size > 1 || (weekend[i] && new Set([...m, ...weekend[i]]).size > 1));
  // A demand structure whose every rate is zero charges nothing.
  const demand = [r.demand_rate_structure, r.flat_demand_structure, r.coincident_rate_structure]
    .some((s) => json(s)?.flat().some((p) => Object.values(p).flat().some((t) => (t?.rate ?? 0) + (t?.adj ?? 0) !== 0)));
  const reasons = [];
  if (!strux.length) reasons.push('no energy charges listed');
  if (tou) reasons.push('time-of-use energy, which totals can only estimate');
  if (demand) reasons.push('a demand charge, which needs meter data');
  if (r.fixed_charge !== null && !['$/month', '$/day'].includes(r.fixed_charge_units)) reasons.push(`a fixed charge in ${r.fixed_charge_units ?? 'unstated units'}`);
  if (strux.flat().some((p) => p.energyRateTiers?.some((t) => t.unit && !['kWh', 'kWh daily'].includes(t.unit)))) reasons.push('tiers in units other than kWh');
  const conditions = CONDITIONS.filter(([, re]) => re.test(r.rate_name ?? '')).map(([name]) => name);
  return { service, residential: r.sector === 'Residential', conditions, tou, demand, totals: reasons.length === 0, reasons };
}

/**
 * The bill engine's tariff for a rate totals can price.
 * @returns {{tariff: {fixedMonthly?: number, fixedDaily?: number, minimumMonthly?: number, seasons: any[]}, notes: string[]} | null}
 */
export function toTariff(r) {
  const c = classify(r);
  if (!c.totals) return null;
  const strux = json(r.energy_rate_structure);
  const weekday = json(r.energy_weekday_schedule);
  const notes = [];
  // One energy period a month: consecutive months on the same period form a season.
  const seasons = [];
  weekday.forEach((m, i) => {
    const period = m[0];
    if (seasons.length && seasons.at(-1).period === period) return;
    seasons.push({ period, from: MONTH_DAY[i] });
  });
  if (seasons.length > 1 && seasons[0].period === seasons.at(-1).period) seasons.shift(); // December runs into January
  let adj = false;
  const tariff = {
    ...(r.fixed_charge ? (r.fixed_charge_units === '$/day' ? { fixedDaily: r.fixed_charge } : { fixedMonthly: r.fixed_charge }) : {}),
    ...(r.min_charge && r.min_charge_units === '$/month' ? { minimumMonthly: r.min_charge } : {}),
    seasons: seasons.map((s) => {
      let below = 0;
      const tiers = strux[s.period].energyRateTiers.map((t) => {
        if (t.adj) adj = true;
        // URDB's max is the tier's upper kWh, counted from zero; the engine wants each tier's own allowance.
        // "kWh daily" tiers are allowances per day of the period.
        const key = t.unit === 'kWh daily' ? 'upToDaily' : 'upTo';
        const tier = { rate: Number(((t.rate ?? 0) + (t.adj ?? 0)).toFixed(6)), ...(t.max !== undefined ? { [key]: Number((t.max - below).toFixed(6)) } : {}) };
        if (t.max !== undefined) below = t.max;
        return tier;
      });
      return { name: `period ${s.period + 1}`, from: s.from, tiers };
    }),
  };
  if (adj) notes.push('URDB lists an adjustment beside some rates (a rider or fuel charge); it is added to each rate.');
  if (r.fuel_adjustments_monthly) notes.push('URDB lists monthly fuel adjustments for this rate; they are not applied.');
  if (r.min_charge && r.min_charge_units !== '$/month') notes.push(`a minimum charge in ${r.min_charge_units ?? 'unstated units'} is not applied`);
  return { tariff, notes };
}
