// A balancing authority's generating fleet for one year, ready for merit-order
// dispatch (add-grid-scenario-model: fleet data). Units come from EIA-860,
// heat rates from EIA-923's fuel and net generation, fuel prices from EIA-923's
// delivery costs. Every field names its source; every gap is listed, never
// filled silently. Pure: the build passes rows in, the browser reads the result.

/** EIA energy source codes for the fuels EIA-930 reports and the model dispatches. */
export const FUEL_CLASS = {
  BIT: 'coal', SUB: 'coal', LIG: 'coal', ANT: 'coal', RC: 'coal', WC: 'coal', SC: 'coal', SGC: 'coal',
  NG: 'gas',
  DFO: 'oil', RFO: 'oil', KER: 'oil', JF: 'oil', PC: 'oil', WO: 'oil',
};
export const DISPATCHED = ['coal', 'gas', 'oil'];

/**
 * Kilograms of CO2 per MMBtu burned, by EIA energy source code: EIA's "Carbon Dioxide Emissions Coefficients
 * by Fuel" (released September 18, 2024, from EPA's greenhouse gas inventory). Coal codes without a coefficient
 * of their own (refined, waste, and synthesis coal) take EIA's all-coal value.
 */
export const CO2_KG_PER_MMBTU = { BIT: 93.24, SUB: 97.13, LIG: 98.27, ANT: 103.69, RC: 95.99, WC: 95.99, SC: 95.99, SGC: 95.99, NG: 52.91, DFO: 74.14, RFO: 75.09, KER: 73.19, JF: 72.23, PC: 102.12, WO: 74.0 };
export const CO2_SOURCE = 'https://www.eia.gov/environment/emissions/co2_vol_mass.php';

/**
 * Heat rates outside this band (MMBtu per net MWh) are not a usable plant rate: start-up fuel, CHP accounting,
 * or a reporting error. The floors sit just below the best units of each kind (about 6 for combined cycle,
 * about 8.5 for steam and combustion turbines), so the band rejects what no unit can do.
 */
export const PLAUSIBLE = { low: 7.5, lowCombinedCycle: 5.5, high: 25 };

/** Combined-cycle parts report fuel on the turbine and output on the steam side, so they are combined at the plant. */
const CONFIG = { CT: 'CC', CA: 'CC', CS: 'CC', CC: 'CC' };
const configOf = (pm) => CONFIG[pm] ?? pm;

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const sum = (a) => a.reduce((x, y) => x + y, 0);

/** Nearest-rank quantile of a sorted list. */
const rank = (v, q) => v[Math.min(v.length - 1, Math.max(0, Math.ceil(q * v.length) - 1))];

/** Weighted median: the value at half the total weight. */
function weightedMedian(pairs) {
  const s = [...pairs].sort((a, b) => a[0] - b[0]);
  const half = sum(s.map((p) => p[1])) / 2;
  let acc = 0;
  for (const [v, w] of s) { acc += w; if (acc >= half) return v; }
  return s.at(-1)?.[0] ?? null;
}

/**
 * Heat rates by plant and configuration from EIA-923 Page 1: electric fuel over net generation, for the year
 * and for each month, with the months whose fuel was blank counted as missing rather than zero.
 * @param {any[]} generation EIA-923 generation rows
 * @returns {Map<string, {rate: number|null, low: number|null, high: number|null, months: number, missingMonths: number, mmbtu: number, mwh: number}>} keyed plant|config
 */
export function plantHeatRates(generation) {
  const acc = new Map();
  for (const r of generation) {
    if (r.plant_id === 99999 || !FUEL_CLASS[r.fuel_type] && !CONFIG[r.prime_mover]) continue;
    const k = `${r.plant_id}|${configOf(r.prime_mover)}`;
    const a = acc.get(k) ?? acc.set(k, { mmbtu: 0, mwh: 0, m: MONTHS.map(() => ({ mmbtu: 0, mwh: 0, missing: false })) }).get(k);
    a.mmbtu += r.fuel_electric_mmbtu ?? 0;
    a.mwh += r.net_generation_mwh ?? 0;
    MONTHS.forEach((mm, i) => {
      const f = r[`fuel_electric_mmbtu_${mm}`];
      const g = r[`net_generation_mwh_${mm}`];
      if (f === null || f === undefined || g === null || g === undefined) a.m[i].missing = true;
      else { a.m[i].mmbtu += f; a.m[i].mwh += g; }
    });
  }
  const out = new Map();
  for (const [k, a] of acc) {
    const floor = k.endsWith('|CC') ? PLAUSIBLE.lowCombinedCycle : PLAUSIBLE.low;
    const plausible = (x) => x >= floor && x <= PLAUSIBLE.high;
    const rate = a.mwh > 0 && a.mmbtu > 0 ? a.mmbtu / a.mwh : null;
    const ok = rate !== null && plausible(rate);
    const monthly = a.m.filter((m) => !m.missing && m.mwh > 0 && m.mmbtu > 0).map((m) => m.mmbtu / m.mwh).filter(plausible).sort((x, y) => x - y);
    out.set(k, {
      rate: ok ? rate : null,
      low: ok ? Math.min(rate, monthly.length ? rank(monthly, 0.1) : rate) : null,
      high: ok ? Math.max(rate, monthly.length ? rank(monthly, 0.9) : rate) : null,
      months: monthly.length, missingMonths: a.m.filter((m) => m.missing).length,
      mmbtu: a.mmbtu, mwh: a.mwh,
    });
  }
  return out;
}

const vintageOf = (y) => (y === null || y === undefined ? 'unknown' : `${Math.floor(y / 10) * 10}s`);

/**
 * Technology-and-vintage averages for units without a usable plant rate: the capacity-weighted median of the
 * plant rates in the group, with the group's 10th to 90th percentile as the range.
 * @param {any[]} generators EIA-860 generators (all regions) @param {ReturnType<typeof plantHeatRates>} rates
 */
export function groupHeatRates(generators, rates) {
  const groups = new Map();
  for (const g of generators) {
    if (g.category !== 'operable' || !FUEL_CLASS[g.energy_source_1]) continue;
    const r = rates.get(`${g.plant_id}|${configOf(g.prime_mover)}`);
    if (!r?.rate) continue;
    const k = `${g.technology}|${vintageOf(g.operating_year)}`;
    (groups.get(k) ?? groups.set(k, []).get(k)).push([r.rate, g.summer_mw ?? g.nameplate_mw ?? 0]);
  }
  const out = new Map();
  for (const [k, pairs] of groups) {
    const v = pairs.map((p) => p[0]).sort((a, b) => a - b);
    out.set(k, { rate: weightedMedian(pairs), low: rank(v, 0.1), high: rank(v, 0.9), plants: pairs.length });
  }
  // A technology's all-vintage group, for a vintage with too few plants of its own.
  const byTech = new Map();
  for (const [k, pairs] of groups) { const t = k.split('|')[0]; (byTech.get(t) ?? byTech.set(t, []).get(t)).push(...pairs); }
  for (const [t, pairs] of byTech) {
    const v = pairs.map((p) => p[0]).sort((a, b) => a - b);
    out.set(`${t}|all`, { rate: weightedMedian(pairs), low: rank(v, 0.1), high: rank(v, 0.9), plants: pairs.length });
  }
  return out;
}

/** The smallest group a fallback rate may come from. */
export const MIN_GROUP = 5;

/**
 * Delivered fuel prices ($/MMBtu) by month: each plant's own, each region's, and the nation's, for each
 * dispatched fuel, weighted by heat delivered; the region's spread (10th to 90th percentile of plant prices)
 * is the range of a substituted price.
 * @param {any[]} receipts EIA-923 fuel_receipts rows
 */
export function fuelPrices(receipts) {
  const plant = new Map(); const region = new Map(); const nation = new Map(); const spread = new Map(); const baOf = new Map();
  let deliveries = 0; let withheld = 0;
  const add = (m, k, mmbtu, cost) => { const a = m.get(k) ?? m.set(k, { mmbtu: 0, dollars: 0 }).get(k); a.mmbtu += mmbtu; a.dollars += (mmbtu * cost) / 100; };
  for (const r of receipts) {
    const cls = FUEL_CLASS[r.energy_source];
    if (!cls || !r.quantity || !r.heat_content) continue;
    deliveries++;
    if (r.fuel_cost === null || r.fuel_cost === undefined) { withheld++; continue; }
    const mmbtu = r.quantity * r.heat_content;
    if (r.ba_code) baOf.set(r.plant_id, r.ba_code);
    add(plant, `${r.plant_id}|${cls}|${r.month}`, mmbtu, r.fuel_cost);
    if (r.ba_code) add(region, `${r.ba_code}|${cls}|${r.month}`, mmbtu, r.fuel_cost);
    add(nation, `${cls}|${r.month}`, mmbtu, r.fuel_cost);
  }
  const price = (a) => (a && a.mmbtu > 0 ? a.dollars / a.mmbtu : null);
  for (const [k, a] of plant) {
    const [id, cls, month] = k.split('|');
    const key = `${baOf.get(Number(id)) ?? ''}|${cls}|${month}`;
    (spread.get(key) ?? spread.set(key, []).get(key)).push(price(a));
  }
  for (const v of spread.values()) v.sort((a, b) => a - b);
  return {
    deliveries, withheld,
    /** @returns {{value: number, low: number, high: number, source: 'plant'|'region'|'nation'} | null} */
    at(plantId, ba, cls, month) {
      const own = price(plant.get(`${plantId}|${cls}|${month}`));
      if (own !== null) return { value: own, low: own, high: own, source: 'plant' };
      const reg = price(region.get(`${ba}|${cls}|${month}`));
      const s = spread.get(`${ba}|${cls}|${month}`) ?? [];
      if (reg !== null) return { value: reg, low: s.length ? Math.min(reg, rank(s, 0.1)) : reg, high: s.length ? Math.max(reg, rank(s, 0.9)) : reg, source: 'region' };
      const nat = price(nation.get(`${cls}|${month}`));
      return nat === null ? null : { value: nat, low: nat, high: nat, source: 'nation' };
    },
  };
}

/** Month index (0 to 11) a unit is first and last available in the year, or null when it was not in service. */
function availability(g, year) {
  const start = g.operating_year === null || g.operating_year === undefined ? null : g.operating_year < year ? 0 : g.operating_year === year ? (g.operating_month ?? 1) - 1 : null;
  if (start === null) return null;
  const retired = g.status === 'RE' && g.retirement_year === year;
  if (g.category !== 'operable' && !retired) return null;
  // A unit that retired in a month runs through the month before.
  const end = retired ? (g.retirement_month ?? 1) - 2 : 11;
  return end < start ? null : { from: start, to: end, retired: retired ? `${year}-${String(g.retirement_month ?? 1).padStart(2, '0')}` : null };
}

/**
 * The fleet of one balancing authority for one year.
 * @param {{ba: string, year: number, generators: any[], plants: any[], rates: ReturnType<typeof plantHeatRates>, groups: ReturnType<typeof groupHeatRates>, prices: ReturnType<typeof fuelPrices>, versions: Record<string, string>}} p
 */
export function assembleFleet({ ba, year, generators, plants, rates, groups, prices, versions }) {
  const plantBa = new Map(plants.map((p) => [p.plant_id, p.ba_code]));
  const src = (dataset, field) => ({ dataset, version: versions[dataset] ?? null, field });
  const units = []; const recorded = []; const unplaceable = [];
  for (const g of generators) {
    if (plantBa.get(g.plant_id) !== ba) continue;
    const when = availability(g, year);
    if (!when) continue;
    const capacity = g.summer_mw ?? g.nameplate_mw;
    const cls = FUEL_CLASS[g.energy_source_1];
    const base = {
      id: `${g.plant_id}-${g.generator_id}`, plant_id: g.plant_id, generator_id: g.generator_id, plant_name: g.plant_name,
      capacity_mw: capacity, fuel: g.energy_source_1, class: cls ?? null, technology: g.technology, prime_mover: g.prime_mover,
      online: g.operating_year === null ? null : `${g.operating_year}-${String(g.operating_month ?? 1).padStart(2, '0')}`, retired: when.retired,
      from_month: when.from, to_month: when.to,
      // Hourly monitored heat input (EPA CAMD) is not held, so no unit is marked monitored.
      monitored: null,
      sources: { capacity_mw: src('eia-860', g.summer_mw === null ? 'nameplate_mw' : 'summer_mw'), fuel: src('eia-860', 'energy_source_1'), online: src('eia-860', 'operating_year'), retired: src('eia-860', 'retirement_year') },
    };
    if (!cls) { recorded.push({ id: base.id, plant_name: base.plant_name, capacity_mw: capacity, fuel: base.fuel, technology: base.technology }); continue; }
    const missing = [];
    if (!capacity) missing.push('capacity');
    const own = rates.get(`${g.plant_id}|${configOf(g.prime_mover)}`);
    const grp = [groups.get(`${g.technology}|${vintageOf(g.operating_year)}`), groups.get(`${g.technology}|all`)].find((x) => x && x.plants >= MIN_GROUP);
    const heat = own?.rate
      ? { value: own.rate, low: own.low, high: own.high, method: CONFIG[g.prime_mover] ? 'plant-combined-cycle' : 'plant', months: own.months, missing_months: own.missingMonths, source: src('eia-923', 'fuel_electric_mmbtu / net_generation_mwh') }
      : grp ? { value: grp.rate, low: grp.low, high: grp.high, method: 'technology-vintage', group: `${g.technology}, ${vintageOf(g.operating_year)}`, plants: grp.plants, source: src('eia-923', 'group median') } : null;
    if (!heat) missing.push('heat rate');
    const months = MONTHS.map((_, i) => prices.at(g.plant_id, ba, cls, i + 1));
    if (months.slice(when.from, when.to + 1).some((m) => m === null)) missing.push('fuel price');
    if (missing.length) { unplaceable.push({ ...base, missing }); continue; }
    const cost = months.map((p) => (p ? { value: heat.value * p.value, low: heat.low * p.low, high: heat.high * p.high } : null));
    units.push({
      ...base, heat_rate: heat,
      fuel_price: months.map((p) => (p ? { value: p.value, low: p.low, high: p.high, source: p.source } : null)),
      substituted: months.slice(when.from, when.to + 1).some((p) => p.source !== 'plant'),
      // Variable operating and maintenance cost is not published per unit, so it is zero and listed as omitted.
      vom: 0,
      cost,
      // Metric tons of CO2 per net MWh: heat rate times EIA's coefficient for the unit's primary fuel.
      co2_t_per_mwh: (heat.value * CO2_KG_PER_MMBTU[g.energy_source_1]) / 1000,
    });
  }
  const mw = (list) => sum(list.map((u) => u.capacity_mw ?? 0));
  const placed = mw(units);
  return {
    ba, year, versions,
    units, unplaceable, recorded,
    summary: {
      placed_mw: placed, unplaceable_mw: mw(unplaceable), recorded_mw: mw(recorded),
      // Shares of the capacity placed in merit order.
      derived_share: placed ? mw(units.filter((u) => u.heat_rate.method === 'technology-vintage')) / placed : 0,
      plant_rate_share: placed ? mw(units.filter((u) => u.heat_rate.method !== 'technology-vintage')) / placed : 0,
      measured_share: 0,
      substituted_share: placed ? mw(units.filter((u) => u.substituted)) / placed : 0,
      by_class: Object.fromEntries(DISPATCHED.map((c) => [c, mw(units.filter((u) => u.class === c))])),
    },
  };
}

// The fleet the browser fetches: two decimals, and a price's source as one letter.
const r2 = (x) => (x === null || x === undefined ? null : Math.round(x * 100) / 100);
const SOURCE = { plant: 'p', region: 'r', nation: 'n' };

/** A placed unit, compact for the browser: costs and prices by month as [value, low, high]. */
export const compactUnit = (u) => ({
  id: u.id, plant_id: u.plant_id, plant_name: u.plant_name, capacity_mw: u.capacity_mw, class: u.class, fuel: u.fuel, technology: u.technology,
  online: u.online, retired: u.retired, from_month: u.from_month, to_month: u.to_month,
  heat_rate: { value: r2(u.heat_rate.value), low: r2(u.heat_rate.low), high: r2(u.heat_rate.high), method: u.heat_rate.method, ...(u.heat_rate.group ? { group: u.heat_rate.group } : {}) },
  price: u.fuel_price.map((p) => (p ? [r2(p.value), r2(p.low), r2(p.high), SOURCE[p.source]] : null)),
  cost: u.cost.map((c) => (c ? [r2(c.value), r2(c.low), r2(c.high)] : null)),
  co2_t_per_mwh: Math.round(u.co2_t_per_mwh * 10000) / 10000, substituted: u.substituted,
});

/** A compact unit back into the shape dispatch reads. */
export const expandUnit = (u) => ({ ...u, cost: u.cost.map((c) => (c ? { value: c[0], low: c[1], high: c[2] } : null)) });
