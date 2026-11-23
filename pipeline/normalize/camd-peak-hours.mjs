// What ran in a region's highest-demand hours (add-measured-plant-emissions
// 2.4): for each balancing authority and year, the ten hours with the most
// demand in EIA's hourly series, and every monitored unit that reported in
// them, with its gross load, its measured carbon dioxide, and the rate that
// implies.
//
// Unit-level hourly records are never shipped whole: these are ten hours a
// year per region, the hours people ask about, and nothing else.

import { SHORT_TON_TO_TONNE, hourlyFilesIn, periodOf, readHourly } from './camd-common.mjs';
import { isCode } from './camd-region-hourly.mjs';

/** How many of a region-year's highest-demand hours are kept. */
export const PEAK_HOURS = 10;
/** Pounds in a metric ton (NIST SP 811: 1 lb = 0.45359237 kg). */
const LB_PER_TONNE = 1 / 0.00045359237;

export const SCHEMA = [
  { name: 'region', type: 'str', unit: 'eGRID balancing-authority code' },
  { name: 'year', type: 'i32', scale: 1 },
  { name: 'hour', type: 'i32', scale: 1, unit: 'hours since 1970-01-01T00:00Z' },
  { name: 'rank', type: 'i32', scale: 1, unit: 'the hour\'s place among the year\'s highest-demand hours, 1 is the highest' },
  { name: 'demand_mwh', type: 'f64', unit: 'MWh, the region\'s demand in the hour (EIA-930)' },
  { name: 'plant_id', type: 'i32', scale: 1, unit: 'EPA/EIA ORISPL facility id' },
  { name: 'unit_id', type: 'str' },
  { name: 'fuel', type: 'str', unit: 'EIA-930 fuel category: col, ng, oil, or oth' },
  { name: 'operating_hours', type: 'f64', unit: 'the fraction of the hour the unit ran' },
  { name: 'gross_load_mwh', type: 'f64', unit: 'MWh (gross)' },
  { name: 'co2_tonnes', type: 'f64', unit: 'metric tons' },
  { name: 'rate_lb_mwh', type: 'f64', unit: 'lb of carbon dioxide per MWh of gross load' },
  { name: 'apportioned', type: 'str', unit: 'yes when the unit shares a stack and EPA divides the measured total' },
];

const r6 = (n) => Math.round(n * 1e6) / 1e6;

/**
 * @param {Record<string, () => AsyncIterable<string>>} input
 * @param {number} _headerRows
 * @param {{joins: Record<string, any[]>}} o
 */
export async function normalize(input, _headerRows, o) {
  const files = hourlyFilesIn(input);
  const plants = o.joins?.['egrid/plants'] ?? [];
  const grid = o.joins?.['eia-930/hourly'] ?? [];
  if (!plants.length) return { rows: [], problems: ['the eGRID plants table is needed to place a plant in a region'] };
  if (!grid.length) return { rows: [], problems: ['EIA-930\'s hourly table is needed to find a region\'s highest-demand hours'] };
  const region = new Map(plants.filter((p) => isCode(p.ba_code)).map((p) => [p.plant_id, p.ba_code]));
  // The years the measured files cover, so the peak hours are chosen in the same years.
  const years = new Set(files.map((f) => f.year));
  // Each region-year's highest-demand hours: a region reporting no demand (a generation-only
  // balancing authority) has no peak hour and is left out.
  const byRegionYear = new Map();
  for (const g of grid) {
    if (!years.has(g.year) || !(g.demand > 0)) continue;
    const key = `${g.ba}|${g.year}`;
    const list = byRegionYear.get(key) ?? byRegionYear.set(key, []).get(key);
    list.push(g);
  }
  // hour key -> {region, year, rank, demand}
  const peak = new Map();
  for (const [key, list] of byRegionYear) {
    const [ba, year] = key.split('|');
    list.sort((a, b) => b.demand - a.demand || a.hour - b.hour);
    list.slice(0, PEAK_HOURS).forEach((g, i) => peak.set(`${ba}|${g.hour}`, { region: ba, year: Number(year), rank: i + 1, demand: g.demand }));
  }
  const rows = [];
  const problems = files.length ? await readHourly(input, (r) => {
    const ba = region.get(r.plantId);
    if (!ba) return;
    const hit = peak.get(`${ba}|${r.utcHour}`);
    if (!hit) return;
    // A unit that reported the hour but did not run is not listed as running.
    if (!(r.operating > 0)) return;
    const mwh = (r.loadMw ?? 0) * r.operating;
    const tonnes = (r.co2Tons ?? 0) * SHORT_TON_TO_TONNE;
    rows.push({
      region: ba, year: hit.year, hour: r.utcHour, rank: hit.rank, demand_mwh: r6(hit.demand),
      plant_id: r.plantId, unit_id: r.unitId, fuel: r.fuel, operating_hours: r6(r.operating),
      gross_load_mwh: r6(mwh), co2_tonnes: r6(tonnes),
      rate_lb_mwh: mwh > 0 ? r6((tonnes * LB_PER_TONNE) / mwh) : null,
      apportioned: r.stacks ? 'yes' : 'no',
    });
  }, files) : ['no hourly files to read'];
  rows.sort((a, b) => (a.region < b.region ? -1 : a.region > b.region ? 1 : a.rank - b.rank || a.plant_id - b.plant_id || (a.unit_id < b.unit_id ? -1 : 1)));
  return { rows, problems, dataPeriod: periodOf(files.map((f) => f.year)) };
}
