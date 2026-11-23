// Measured emissions by region and hour (add-measured-plant-emissions 1.1):
// the same hourly state-year files, summed over the monitored units of each
// balancing authority, one shard per region and year. The region comes from
// eGRID's balancing-authority code for the plant; a plant eGRID does not place
// goes to the unmatched shard rather than being dropped.
//
// EPA reports each record in the plant's own local standard time, so a region
// spanning two time zones (Alabama and Georgia in Southern Company's) would mix
// different real hours if the labels were added up as published. Every record
// is moved to UTC by its state's standard offset first, the same clock EIA's
// hourly series uses, and the hour here is hours since 1970 UTC.

import { SHORT_TON_TO_TONNE, hourlyFilesIn, periodOf, readHourly } from './camd-common.mjs';

/** The fuel categories EIA-930 reports generation under, as columns of measured gross load. */
const FUELS = ['col', 'ng', 'oil', 'oth'];

export const SCHEMA = [
  { name: 'region', type: 'str', unit: 'eGRID balancing-authority code' },
  { name: 'year', type: 'i32', scale: 1, unit: 'calendar year of the UTC hour' },
  { name: 'hour', type: 'i32', scale: 1, unit: 'hours since 1970-01-01T00:00Z' },
  { name: 'co2_tonnes', type: 'f64', unit: 'metric tons' },
  { name: 'heat_input_mmbtu', type: 'f64', unit: 'MMBtu' },
  { name: 'gross_load_mwh', type: 'f64', unit: 'MWh (gross)' },
  { name: 'units_reporting', type: 'i32', scale: 1, unit: 'monitored units with a record in the hour' },
  // Gross load by fuel, so the hourly estimate can be set beside the measurement fuel by fuel.
  ...FUELS.map((f) => ({ name: `load_${f}_mwh`, type: 'f32', unit: 'MWh (gross)' })),
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
    const key = `${ba ?? ''}|${r.utcHour}`;
    let g = groups.get(key);
    if (!g) {
      g = { region: ba, year: new Date(r.utcHour * 3_600_000).getUTCFullYear(), hour: r.utcHour, co2_tonnes: 0, heat_input_mmbtu: 0, gross_load_mwh: 0, units_reporting: 0, ...Object.fromEntries(FUELS.map((f) => [`load_${f}_mwh`, 0])) };
      groups.set(key, g);
    }
    g.co2_tonnes += (r.co2Tons ?? 0) * SHORT_TON_TO_TONNE;
    g.heat_input_mmbtu += r.heatMmbtu ?? 0;
    const mwh = (r.loadMw ?? 0) * r.operating;
    g.gross_load_mwh += mwh;
    g[`load_${r.fuel}_mwh`] += mwh;
    g.units_reporting++;
  }, files) : ['no hourly files to read'];
  // Float32 columns are rounded to what float32 holds, so a value read back equals the row.
  const rows = [...groups.values()].map((g) => ({
    ...g, co2_tonnes: r6(g.co2_tonnes), heat_input_mmbtu: r6(g.heat_input_mmbtu), gross_load_mwh: r6(g.gross_load_mwh),
    ...Object.fromEntries(FUELS.map((f) => [`load_${f}_mwh`, Math.fround(g[`load_${f}_mwh`])])),
  }));
  rows.sort((a, b) => ((a.region ?? '') < (b.region ?? '') ? -1 : (a.region ?? '') > (b.region ?? '') ? 1 : a.hour - b.hour));
  return { rows, problems, dataPeriod: periodOf(files.map((f) => f.year)) };
}
