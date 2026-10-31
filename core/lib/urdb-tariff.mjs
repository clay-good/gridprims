// URDB residential rates as the bill engine reads them (add-household-bill-
// check task 1.2): what kind of service a rate is, whether totals can price
// it, and, when they can, its fixed and minimum charges and its energy
// seasons and tiers. URDB's "adj" (a rider or fuel adjustment it lists
// beside a rate) is added to the rate and named.

const MONTH_DAY = ['01-01', '02-01', '03-01', '04-01', '05-01', '06-01', '07-01', '08-01', '09-01', '10-01', '11-01', '12-01'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const json = (s) => (s ? JSON.parse(s) : null);

// Who a rate is for, as its name states it: a household that does not meet the condition cannot take it.
export const CONDITIONS = [
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
 * @returns {{service: 'bundled' | 'delivery' | 'delivery-standard-offer' | 'energy-only' | 'not-stated', residential: boolean, conditions: string[], tou: boolean, touByPeriod: boolean, demand: boolean, totals: boolean, reasons: string[]}}
 *   touByPeriod: time of use with one rate per period, which kWh by period (as a bill prints them) prices exactly
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
    .some((s) => json(s)?.flat().some((p) => Object.values(p).flat().some((t) => Number(t?.rate ?? 0) + Number(t?.adj ?? 0) !== 0)));
  const reasons = [];
  if (!strux.length) reasons.push('no energy charges listed');
  if (tou) reasons.push('time-of-use energy, which totals can only estimate');
  if (demand) reasons.push('a demand charge, which needs meter data');
  if (r.fixed_charge !== null && !['$/month', '$/day'].includes(r.fixed_charge_units)) reasons.push(`a fixed charge in ${r.fixed_charge_units ?? 'unstated units'}`);
  if (strux.flat().some((p) => p.energyRateTiers?.some((t) => t.unit && !['kWh', 'kWh daily'].includes(t.unit)))) reasons.push('tiers in units other than kWh');
  const conditions = conditionsOf(r.rate_name);
  const touByPeriod = tou && reasons.length === 1 && strux.every((p) => p.energyRateTiers?.length === 1);
  return { service, residential: r.sector === 'Residential', conditions, tou, touByPeriod, demand, totals: reasons.length === 0, reasons };
}

/** Who a rate is for, from its name. @param {string | null | undefined} name */
export const conditionsOf = (name) => CONDITIONS.filter(([, re]) => re.test(name ?? '')).map(([c]) => c);

const clock = (h) => (h === 0 || h === 24 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h} am` : `${h - 12} pm`);

/** The hours a period covers in one day's schedule: "4 pm to 9 pm", "all day", or "" when it does not occur. */
function hoursOf(day, period) {
  if (day.every((p) => p === period)) return 'all day';
  const runs = [];
  day.forEach((p, h) => {
    if (p !== period) return;
    if (runs.length && runs.at(-1)[1] === h) runs.at(-1)[1] = h + 1;
    else runs.push([h, h + 1]);
  });
  // A run to midnight joins the one from midnight: 9 pm to 6 am.
  if (runs.length > 1 && runs[0][0] === 0 && runs.at(-1)[1] === 24) runs[0][0] = runs.pop()[0];
  return runs.map(([a, b]) => `${clock(a)} to ${clock(b)}`).join(' and ');
}

/** Consecutive months with the same key form a season; December running into January joins January's. */
function seasonsBy(keyOf) {
  const seasons = [];
  for (let i = 0; i < 12; i++) {
    const key = keyOf(i);
    if (seasons.length && seasons.at(-1).key === key) seasons.at(-1).to = i;
    else seasons.push({ key, from: i, to: i });
  }
  if (seasons.length > 1 && seasons[0].key === seasons.at(-1).key) seasons[0].from = seasons.pop().from;
  const name = (s) => (seasons.length === 1 ? 'all year' : s.from === s.to ? MONTHS[s.from] : `${MONTHS[s.from]} to ${MONTHS[s.to]}`);
  return seasons.map((s) => ({ ...s, name: name(s), start: MONTH_DAY[s.from] }));
}

/**
 * The bill engine's tariff for a rate totals can price, or that kWh by time-of-use period can.
 * @returns {{tariff: {fixedMonthly?: number, fixedDaily?: number, minimumMonthly?: number, seasons: any[]}, tou: boolean, notes: string[]} | null}
 *   with tou, each season lists periods ({name, rate, hours}) in place of tiers
 */
export function toTariff(r) {
  const c = classify(r);
  if (!c.totals && !c.touByPeriod) return null;
  const strux = json(r.energy_rate_structure);
  const weekday = json(r.energy_weekday_schedule);
  const weekend = json(r.energy_weekend_schedule) ?? weekday;
  const notes = [];
  let adj = false;
  const rateOf = (t) => {
    if (t.adj) adj = true;
    // URDB stores a few rates as text ("8.18").
    return Number((Number(t.rate ?? 0) + Number(t.adj ?? 0)).toFixed(6));
  };
  const tierList = (period) => {
    let below = 0;
    return strux[period].energyRateTiers.map((t) => {
      // URDB's max is the tier's upper kWh, counted from zero; the engine wants each tier's own allowance.
      // "kWh daily" tiers are allowances per day of the period.
      const key = t.unit === 'kWh daily' ? 'upToDaily' : 'upTo';
      const tier = { rate: rateOf(t), ...(t.max !== undefined ? { [key]: Number((Number(t.max) - below).toFixed(6)) } : {}) };
      if (t.max !== undefined) below = Number(t.max);
      return tier;
    });
  };
  const seasons = c.tou
    // Months with the same weekday and weekend schedules form a season; each period it uses has one rate.
    ? seasonsBy((i) => JSON.stringify([weekday[i], weekend[i]])).map((s) => {
      const used = [...new Set([...weekday[s.from], ...weekend[s.from]])].sort((a, b) => a - b);
      return {
        name: s.name, from: s.start,
        periods: used.map((p) => {
          const wd = hoursOf(weekday[s.from], p);
          const we = hoursOf(weekend[s.from], p);
          const hours = wd === we ? `every day ${wd}` : [wd && `weekdays ${wd}`, we && `weekends ${we}`].filter(Boolean).join(', ');
          return { name: `period ${p + 1}`, rate: rateOf(strux[p].energyRateTiers[0]), hours };
        }),
      };
    })
    // One energy period a month: consecutive months on the same period form a season.
    : seasonsBy((i) => weekday[i][0]).map((s) => ({ name: s.name, from: s.start, tiers: tierList(s.key) }));
  const tariff = {
    ...(r.fixed_charge ? (r.fixed_charge_units === '$/day' ? { fixedDaily: r.fixed_charge } : { fixedMonthly: r.fixed_charge }) : {}),
    ...(r.min_charge && r.min_charge_units === '$/month' ? { minimumMonthly: r.min_charge } : {}),
    seasons,
  };
  if (adj) notes.push('URDB lists an adjustment beside some rates (a rider or fuel charge); it is added to each rate.');
  if (r.fuel_adjustments_monthly) notes.push('URDB lists monthly fuel adjustments for this rate; they are not applied.');
  if (r.min_charge && r.min_charge_units !== '$/month') notes.push(`a minimum charge in ${r.min_charge_units ?? 'unstated units'} is not applied`);
  return { tariff, tou: c.tou, notes };
}
