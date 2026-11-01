// Merit-order dispatch over the hours that happened (add-grid-scenario-model:
// counterfactual dispatch, self-backtest). Recorded demand, interchange, and
// every non-dispatched source come from EIA-930 as given; the coal, gas, and
// oil fleet meets what is left in ascending variable cost. A sort and a
// cumulative sum, in our own code, on the device. Not a commitment model.

import { DISPATCHED } from './fleet.mjs';

/** What every result omits, by key; pages and cards print each one's sentence. */
export const OMISSIONS = ['commitment', 'reserves', 'transmission', 'interchange', 'storage', 'outages', 'market', 'vom'];

/** EIA-930 columns taken as recorded: everything but the dispatched fuels. */
export const RECORDED = ['gen_nuc', 'gen_wat', 'gen_ps', 'gen_sun', 'gen_snb', 'gen_wnd', 'gen_wnb', 'gen_bat', 'gen_oes', 'gen_ues', 'gen_geo', 'gen_oth', 'gen_unk'];
export const COLUMN = { coal: 'gen_col', gas: 'gen_ng', oil: 'gen_oil' };
/** The recorded columns a solar or wind scale multiplies, with and without integrated batteries. */
export const SCALED = { solar: ['gen_sun', 'gen_snb'], wind: ['gen_wnd', 'gen_wnb'] };
export const scaleOf = ({ solar = 1, wind = 1 } = {}) => Object.fromEntries([...SCALED.solar.map((c) => [c, solar]), ...SCALED.wind.map((c) => [c, wind])]);

const HOUR = 3_600_000;
const monthOf = (hour) => new Date(hour * HOUR).getUTCMonth();

/** A column blank for at least this many reported hours before it first carries a value began mid-range. */
const CATEGORY_RUN = 24;

/**
 * Categories defined for only part of the range: a column blank in every reported hour before a day or more
 * and then reported, with the first hour it carried a value. Scattered blanks are missing values, counted apart.
 * @param {any[]} rows EIA-930 hourly rows
 */
export function categoryChanges(rows) {
  const changed = []; const gaps = [];
  for (const c of [...RECORDED, ...Object.values(COLUMN)]) {
    let lead = 0; let first = null; let later = 0;
    for (const r of rows) {
      if (r.demand === null || r.demand === undefined) continue;
      if (r[c] === null || r[c] === undefined) { if (first === null) lead++; else later++; } else first ??= r.hour;
    }
    if (first !== null && lead >= CATEGORY_RUN) changed.push({ column: c, from: first });
    else if (first !== null && lead + later) gaps.push({ column: c, hours: lead + later });
  }
  return { changed, gaps };
}

/**
 * Per month, the units available in merit order: sorted by variable cost, with cumulative capacity and the
 * cumulative capacity of each fuel, so an hour's dispatch is one binary search.
 * @param {any[]} units placed units from assembleFleet, with any edits applied
 */
export function meritOrder(units) {
  return Array.from({ length: 12 }, (_, m) => {
    const on = units.filter((u) => m >= u.from_month && m <= u.to_month && u.cost[m] && u.capacity_mw > 0)
      .sort((a, b) => a.cost[m].value - b.cost[m].value || (a.id < b.id ? -1 : 1));
    const cum = new Float64Array(on.length + 1);
    const byClass = Object.fromEntries(DISPATCHED.map((c) => [c, new Float64Array(on.length + 1)]));
    on.forEach((u, i) => {
      cum[i + 1] = cum[i] + u.capacity_mw;
      for (const c of DISPATCHED) byClass[c][i + 1] = byClass[c][i] + (u.class === c ? u.capacity_mw : 0);
    });
    return { units: on, cum, byClass };
  });
}

/** The residual the dispatched fleet must meet: demand plus net exports, less every recorded source. */
export const residualOf = (r, scale = {}) => r.demand + (r.interchange ?? 0) - RECORDED.reduce((a, c) => a + (r[c] ?? 0) * (scale[c] ?? 1), 0);

/**
 * Dispatch every reported hour. Hours EIA did not report (no demand) are excluded and counted. A residual
 * above the placed fleet is an unmet modeling residual, not a shortage; a residual below zero runs nothing.
 * @param {{units: any[], rows: any[], scale?: Record<string, number>, extra?: (r: any) => number}} p scale multiplies recorded columns (a doubled solar profile); extra adds load
 */
export function dispatch({ units, rows, scale = {}, extra }) {
  const order = meritOrder(units);
  const n = rows.length;
  const hourly = Object.fromEntries(DISPATCHED.map((c) => [c, new Float32Array(n)]));
  const residual = new Float32Array(n);
  const marginal = new Int32Array(n).fill(-1);
  const marginalMonth = new Int8Array(n);
  const unit = new Map(units.map((u) => [u.id, 0]));
  const unmet = { hours: 0, mwh: 0, max: 0 };
  let surplus = 0; let excluded = 0;
  // Per month, how many hours each merit position was marginal and its partial output, for unit totals.
  const tallies = order.map((o) => ({ marginal: new Float64Array(o.units.length + 1), partial: new Float64Array(o.units.length) }));
  for (let h = 0; h < n; h++) {
    const r = rows[h];
    if (r.demand === null || r.demand === undefined) { excluded++; marginal[h] = -2; continue; }
    const m = monthOf(r.hour);
    const o = order[m];
    const need = residualOf(r, scale) + (extra ? extra(r) : 0);
    residual[h] = need;
    marginalMonth[h] = m;
    if (need <= 0) { surplus++; tallies[m].marginal[0]++; continue; }
    const total = o.cum[o.units.length];
    if (need > total) {
      unmet.hours++; unmet.mwh += need - total; unmet.max = Math.max(unmet.max, need - total);
      for (const c of DISPATCHED) hourly[c][h] = o.byClass[c][o.units.length];
      tallies[m].marginal[o.units.length]++;
      continue;
    }
    // The first position whose cumulative capacity reaches the need.
    let lo = 0; let hi = o.units.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (o.cum[mid + 1] >= need) hi = mid; else lo = mid + 1; }
    const part = need - o.cum[lo];
    const u = o.units[lo];
    for (const c of DISPATCHED) hourly[c][h] = o.byClass[c][lo] + (u.class === c ? part : 0);
    marginal[h] = lo;
    tallies[m].marginal[lo]++;
    tallies[m].partial[lo] += part;
  }
  // A unit runs fully in every hour whose marginal position is above its own.
  order.forEach((o, m) => {
    const t = tallies[m];
    let above = 0;
    for (let i = o.units.length - 1; i >= 0; i--) {
      above += t.marginal[i + 1];
      unit.set(o.units[i].id, unit.get(o.units[i].id) + above * o.units[i].capacity_mw + t.partial[i]);
    }
  });
  const totals = Object.fromEntries(DISPATCHED.map((c) => [c, hourly[c].reduce((a, b) => a + b, 0)]));
  let co2 = 0;
  for (const u of units) co2 += (unit.get(u.id) ?? 0) * (u.co2_t_per_mwh ?? 0);
  return {
    hours: n - excluded, excluded, surplus, unmet, totals, hourly, residual, unit, co2_t: co2,
    /** The marginal unit of an hour, or null when nothing or everything ran. */
    marginalUnit(h) { return marginal[h] >= 0 ? order[marginalMonth[h]].units[marginal[h]] : null; },
    marginalCost(h) { const u = this.marginalUnit(h); return u ? u.cost[marginalMonth[h]] : null; },
  };
}

/**
 * Net-load screening: the reported hours whose residual falls below a minimum generation floor, and the energy
 * between the residual and the floor that would need to be curtailed, exported, or stored.
 * @param {{residual: Float32Array}} run @param {any[]} rows @param {number} floor MW
 */
export function belowFloor(run, rows, floor) {
  let hours = 0; let mwh = 0;
  for (let h = 0; h < rows.length; h++) {
    if (rows[h].demand === null || rows[h].demand === undefined) continue;
    if (run.residual[h] < floor) { hours++; mwh += floor - run.residual[h]; }
  }
  return { hours, mwh };
}

/**
 * The fleet with a scenario's edits applied, and the edits listed with their original values.
 * @param {any[]} units @param {Array<{kind: 'retire'|'add'|'capacity'|'cost', id?: string, unit?: any, value?: number}>} edits
 */
export function applyEdits(units, edits) {
  let out = units.map((u) => ({ ...u }));
  const listed = [];
  for (const e of edits) {
    const u = out.find((x) => x.id === e.id);
    if (e.kind === 'retire' && u) { out = out.filter((x) => x !== u); listed.push({ kind: 'retire', id: u.id, name: u.plant_name, was: u.capacity_mw }); }
    else if (e.kind === 'capacity' && u) { listed.push({ kind: 'capacity', id: u.id, name: u.plant_name, was: u.capacity_mw, now: e.value }); u.capacity_mw = e.value; }
    else if (e.kind === 'cost' && u) {
      listed.push({ kind: 'cost', id: u.id, name: u.plant_name, was: u.cost.find(Boolean)?.value ?? null, now: e.value });
      u.cost = u.cost.map((c) => (c ? { value: e.value, low: e.value, high: e.value } : c));
    } else if (e.kind === 'add' && e.unit) {
      const cost = Array.from({ length: 12 }, () => ({ value: e.unit.cost, low: e.unit.cost, high: e.unit.cost }));
      out.push({ id: e.unit.id, plant_name: e.unit.name, capacity_mw: e.unit.capacity_mw, class: e.unit.class, from_month: 0, to_month: 11, cost, co2_t_per_mwh: e.unit.co2_t_per_mwh ?? 0, added: true });
      listed.push({ kind: 'add', id: e.unit.id, name: e.unit.name, was: null, now: e.unit.capacity_mw, cost: e.unit.cost, class: e.unit.class });
    }
  }
  return { units: out, edits: listed };
}
