// Measured emissions by region and hour (add-measured-plant-emissions 1.1):
// the same hourly state-year files, summed over the monitored units of each
// balancing authority, one shard per region and year. The region comes from
// eGRID's balancing-authority code for the plant; a plant eGRID does not place
// goes to the unmatched shard rather than being dropped.
//
// Hours are EPA's: local standard time, without daylight saving, as the
// monitors report them. Comparing them with an hourly series in UTC means
// applying the region's standard-time offset; nothing here shifts them.

import { SHORT_TON_TO_TONNE, hourlyFilesIn, periodOf, readHourly } from './camd-common.mjs';

export const SCHEMA = [
  { name: 'region', type: 'str', unit: 'eGRID balancing-authority code' },
  { name: 'year', type: 'i32', scale: 1 },
  { name: 'date', type: 'str', unit: 'YYYY-MM-DD, local standard time' },
  { name: 'hour', type: 'i32', scale: 1, unit: 'hour of the day, 0 to 23, local standard time' },
  { name: 'co2_tonnes', type: 'f64', unit: 'metric tons' },
  { name: 'heat_input_mmbtu', type: 'f64', unit: 'MMBtu' },
  { name: 'gross_load_mwh', type: 'f64', unit: 'MWh (gross)' },
  { name: 'units_reporting', type: 'i32', scale: 1, unit: 'monitored units with a record in the hour' },
];

/** A real balancing-authority code, not eGRID's "NA - AK" for a plant it places in none. */
export const isCode = (ba) => typeof ba === 'string' && /^[A-Z0-9]+$/.test(ba);

const r6 = (n) => Math.round(n * 1e6) / 1e6;

/**
 * @param {Record<string, () => AsyncIterable<string>>} input
 * @param {number} _headerRows
 * @param {{joins: Record<string, any[]>}} o
 */
export async function normalize(input, _headerRows, o) {
  const files = hourlyFilesIn(input);
  const plants = o.joins?.['egrid/plants'] ?? [];
  // eGRID writes "NA - AK" where a plant has no balancing authority; only a real code places a plant.
  const region = new Map(plants.filter((p) => isCode(p.ba_code)).map((p) => [p.plant_id, p.ba_code]));
  if (!plants.length) return { rows: [], problems: ['the eGRID plants table is needed to place a plant in a region'] };
  const groups = new Map();
  const problems = files.length ? await readHourly(input, (r) => {
    const ba = region.get(r.plantId) ?? null;
    const key = `${ba ?? ''}|${r.date}|${r.hour}`;
    let g = groups.get(key);
    if (!g) {
      g = { region: ba, year: r.year, date: r.date, hour: r.hour, co2_tonnes: 0, heat_input_mmbtu: 0, gross_load_mwh: 0, units_reporting: 0 };
      groups.set(key, g);
    }
    g.co2_tonnes += (r.co2Tons ?? 0) * SHORT_TON_TO_TONNE;
    g.heat_input_mmbtu += r.heatMmbtu ?? 0;
    g.gross_load_mwh += (r.loadMw ?? 0) * r.operating;
    g.units_reporting++;
  }, files) : ['no hourly files to read'];
  const rows = [...groups.values()].map((g) => ({ ...g, co2_tonnes: r6(g.co2_tonnes), heat_input_mmbtu: r6(g.heat_input_mmbtu), gross_load_mwh: r6(g.gross_load_mwh) }));
  rows.sort((a, b) => ((a.region ?? '') < (b.region ?? '') ? -1 : (a.region ?? '') > (b.region ?? '') ? 1 : a.date < b.date ? -1 : a.date > b.date ? 1 : a.hour - b.hour));
  return { rows, problems, dataPeriod: periodOf(files.map((f) => f.year)) };
}
