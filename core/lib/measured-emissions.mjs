// What the monitors measured, per plant (add-measured-plant-emissions: the
// plant page's measured section). The pipeline ships monthly totals per
// monitored unit; this turns them into a plant's annual and monthly figures,
// the implied emission rate, and the share of the plant the monitors cover.
//
// Measured figures are not the plant: monitors cover large fossil units in
// EPA's trading programs, so coverage travels with every number.

import { METRIC_TONS_PER_LB } from './plant-math.mjs';

/** Pounds in a metric ton, from the pound the rest of the project uses. */
export const LB_PER_METRIC_TON = 1 / METRIC_TONS_PER_LB;

const MEASURES = ['co2_tonnes', 'so2_lbs', 'nox_lbs', 'heat_input_mmbtu', 'gross_load_mwh', 'operating_hours'];
const zero = () => Object.fromEntries(MEASURES.map((m) => [m, 0]));
const add = (into, row) => { for (const m of MEASURES) into[m] += row[m] ?? 0; return into; };
const r3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Carbon dioxide per megawatt-hour of gross load, in lb/MWh: the rate the
 * measurement implies. Null when nothing was generated, because a rate over no
 * generation is not a rate.
 * @param {number} co2Tonnes @param {number | null} grossMwh
 */
export function measuredRateLbMwh(co2Tonnes, grossMwh) {
  if (!grossMwh || grossMwh <= 0) return null;
  return (co2Tonnes * LB_PER_METRIC_TON) / grossMwh;
}

/**
 * A plant's measured emissions, by year and by month, with its units and its coverage.
 * @param {{
 *   units: Array<{unit_id: string, year: number, unit_type: string | null, primary_fuel: string | null, nameplate_mw: number | null, apportioned: string, operating_status: string | null}>,
 *   months: Array<{unit_id: string, year: number, month: number, apportioned: string} & Record<string, number>>,
 *   netMwh?: number | null, netYear?: number | null, nameplateMw?: number | null,
 * }} o units and monthly rows for one plant
 * @returns {{years: any[], latest: any, monthly: any[], units: any[], coverage: any, apportioned: boolean} | null} null when no monitored unit reported
 */
export function plantMeasured({ units = [], months = [], netMwh = null, netYear = null, nameplateMw = null }) {
  if (!months.length) return null;
  const byYear = new Map();
  for (const r of months) {
    const y = byYear.get(r.year) ?? byYear.set(r.year, { year: r.year, units: new Set(), apportioned: false, ...zero() }).get(r.year);
    add(y, r);
    y.units.add(r.unit_id);
    if (r.apportioned === 'yes') y.apportioned = true;
  }
  const years = [...byYear.values()].sort((a, b) => a.year - b.year).map((y) => ({
    ...Object.fromEntries(MEASURES.map((m) => [m, r3(y[m])])),
    year: y.year, units: y.units.size, apportioned: y.apportioned,
    rate_lb_mwh: measuredRateLbMwh(y.co2_tonnes, y.gross_load_mwh),
  }));
  const latest = years[years.length - 1];
  // The latest year by month, with the months that reported nothing left out.
  const byMonth = new Map();
  for (const r of months.filter((r) => r.year === latest.year)) {
    const m = byMonth.get(r.month) ?? byMonth.set(r.month, { month: r.month, ...zero() }).get(r.month);
    add(m, r);
  }
  const monthly = [...byMonth.values()].sort((a, b) => a.month - b.month)
    .map((m) => ({ ...Object.fromEntries(MEASURES.map((k) => [k, r3(m[k])])), month: m.month, rate_lb_mwh: measuredRateLbMwh(m.co2_tonnes, m.gross_load_mwh) }));
  // One row per monitored unit in the latest year, with that year's measured totals.
  const unitRows = [];
  for (const u of units.filter((u) => u.year === latest.year)) {
    const mine = months.filter((r) => r.year === latest.year && r.unit_id === u.unit_id);
    const totals = mine.reduce((into, r) => add(into, r), zero());
    unitRows.push({
      unit_id: u.unit_id, unit_type: u.unit_type, primary_fuel: u.primary_fuel, nameplate_mw: u.nameplate_mw,
      operating_status: u.operating_status, apportioned: u.apportioned === 'yes',
      ...Object.fromEntries(MEASURES.map((m) => [m, r3(totals[m])])),
      rate_lb_mwh: measuredRateLbMwh(totals.co2_tonnes, totals.gross_load_mwh),
      reported: mine.length > 0,
    });
  }
  unitRows.sort((a, b) => (a.unit_id < b.unit_id ? -1 : 1));
  const monitoredMw = unitRows.reduce((n, u) => n + (u.nameplate_mw ?? 0), 0) || null;
  return {
    years, latest, monthly, units: unitRows, apportioned: unitRows.some((u) => u.apportioned),
    coverage: {
      // Gross load the monitors measured against the plant's own reported net generation. It can pass
      // 100%, because gross load includes what the plant's own equipment used and net generation does not.
      generationShare: netMwh && netMwh > 0 ? latest.gross_load_mwh / netMwh : null,
      generationYears: netMwh && netMwh > 0 ? { measured: latest.year, reported: netYear } : null,
      // The monitored units' nameplate against the plant's operating nameplate: how much of the plant is
      // watched. It is not capped: above 100% means EPA's associated-generator capacity for the monitored
      // units is more than the operating capacity EIA-860 reports, which the page says rather than hides.
      capacityShare: monitoredMw && nameplateMw ? monitoredMw / nameplateMw : null,
      monitoredMw,
      nameplateMw,
    },
  };
}
