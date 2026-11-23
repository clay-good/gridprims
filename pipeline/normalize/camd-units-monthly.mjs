// Measured emissions by monitored unit and month (add-measured-plant-emissions
// 1.1): EPA's hourly state-year files, streamed a line at a time, summed to one
// row per unit and month. Carbon dioxide is converted from the short tons EPA
// reports to metric tons at the factor EPA states; sulfur dioxide and nitrogen
// oxides keep the pounds EPA reports. Gross load is each hour's average load in
// MW times the fraction of the hour the unit operated, which is how EPA's own
// daily files total it, and is gross load, not net generation.

import { SHORT_TON_TO_TONNE, hourlyFilesIn, periodOf, readHourly } from './camd-common.mjs';

export const SCHEMA = [
  { name: 'state', type: 'str' },
  { name: 'plant_id', type: 'i32', scale: 1, unit: 'EPA/EIA ORISPL facility id' },
  { name: 'unit_id', type: 'str' },
  { name: 'year', type: 'i32', scale: 1 },
  { name: 'month', type: 'i32', scale: 1 },
  { name: 'co2_tonnes', type: 'f64', unit: 'metric tons' },
  { name: 'so2_lbs', type: 'f64', unit: 'lb' },
  { name: 'nox_lbs', type: 'f64', unit: 'lb' },
  { name: 'heat_input_mmbtu', type: 'f64', unit: 'MMBtu' },
  { name: 'gross_load_mwh', type: 'f64', unit: 'MWh (gross)' },
  { name: 'operating_hours', type: 'f64', unit: 'hours' },
  { name: 'hours_reported', type: 'i32', scale: 1, unit: 'hours with a record' },
  { name: 'apportioned', type: 'str', unit: 'yes when the unit shares a stack and EPA divides the measured total' },
];

/** Round away the float noise a few thousand additions leave, keeping six decimals. */
const r6 = (n) => Math.round(n * 1e6) / 1e6;

/**
 * @param {Record<string, () => AsyncIterable<string>>} input
 */
export async function normalize(input) {
  const files = hourlyFilesIn(input);
  const groups = new Map();
  const problems = files.length ? await readHourly(input, (r) => {
    const key = `${r.plantId}|${r.unitId}|${r.year}|${r.month}`;
    let g = groups.get(key);
    if (!g) {
      g = { state: r.state, plant_id: r.plantId, unit_id: r.unitId, year: r.year, month: r.month, co2_tonnes: 0, so2_lbs: 0, nox_lbs: 0, heat_input_mmbtu: 0, gross_load_mwh: 0, operating_hours: 0, hours_reported: 0, apportioned: 'no' };
      groups.set(key, g);
    }
    g.co2_tonnes += (r.co2Tons ?? 0) * SHORT_TON_TO_TONNE;
    g.so2_lbs += r.so2Lbs ?? 0;
    g.nox_lbs += r.noxLbs ?? 0;
    g.heat_input_mmbtu += r.heatMmbtu ?? 0;
    g.gross_load_mwh += (r.loadMw ?? 0) * r.operating;
    g.operating_hours += r.operating;
    g.hours_reported++;
    if (r.stacks) g.apportioned = 'yes';
  }, files) : ['no hourly files to read'];
  const rows = [...groups.values()].map((g) => ({ ...g, co2_tonnes: r6(g.co2_tonnes), so2_lbs: r6(g.so2_lbs), nox_lbs: r6(g.nox_lbs), heat_input_mmbtu: r6(g.heat_input_mmbtu), gross_load_mwh: r6(g.gross_load_mwh), operating_hours: r6(g.operating_hours) }));
  rows.sort((a, b) => (a.state < b.state ? -1 : a.state > b.state ? 1 : a.plant_id - b.plant_id || (a.unit_id < b.unit_id ? -1 : a.unit_id > b.unit_id ? 1 : a.year - b.year || a.month - b.month)));
  return { rows, problems, dataPeriod: periodOf(files.map((f) => f.year)) };
}
