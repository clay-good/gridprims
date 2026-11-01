// The 1991–2020 daily degree-day normals per station (NCEI's per-station
// files): heating and cooling degree days for each calendar day at base 65 °F
// and at every other base NCEI publishes. They come from a smoothed fit of
// daily mean temperature, not an average of thirty years of degree days.

import { readStations, stationOf } from './ghcn-common.mjs';
import { STATIONS } from '../registry/ghcn-daily.mjs';
import { parseDelimited } from '../../parsers/delimited.mjs';

export const HEATING_BASES = [40, 45, 50, 55, 57, 60, 65];
export const COOLING_BASES = [40, 45, 50, 55, 57, 60, 65, 70, 72];
const column = (kind, base) => `DLY-${kind}-${base === 65 ? 'NORMAL' : `BASE${base}`}`;

export const SCHEMA = [
  { name: 'station', type: 'str' }, { name: 'state', type: 'str' },
  { name: 'month', type: 'f64' }, { name: 'day', type: 'f64' },
  // NCEI publishes tenths of a degree day.
  ...HEATING_BASES.map((b) => ({ name: `htdd_${b}`, type: 'i32', scale: 10, unit: `heating degree days, base ${b} °F` })),
  ...COOLING_BASES.map((b) => ({ name: `cldd_${b}`, type: 'i32', scale: 10, unit: `cooling degree days, base ${b} °F` })),
];

export async function normalize(input) {
  const st = await readStations(input.stations, new Set(STATIONS));
  const rows = [];
  const problems = [];
  for (const [key, lines] of Object.entries(input)) {
    if (key === 'stations') continue;
    const id = stationOf(key);
    let text = '';
    for await (const l of lines()) text += `${l}\n`;
    const table = parseDelimited(text).rows.filter((r) => r.length > 1);
    const head = table[0] ?? [];
    const at = (name) => head.indexOf(name);
    const need = [...HEATING_BASES.map((b) => column('HTDD', b)), ...COOLING_BASES.map((b) => column('CLDD', b)), 'month', 'day'].filter((n) => at(n) < 0);
    if (need.length) { problems.push(`${id}: normals file lacks ${need.join(', ')}`); continue; }
    for (const r of table.slice(1)) {
      // Negative values are NCEI's special codes (missing or not computed), never a degree-day count.
      const num = (name) => { const v = Number(String(r[at(name)]).trim()); return Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null; };
      const row = { station: id, state: st.get(id)?.state ?? null, month: Number(r[at('month')]), day: Number(r[at('day')]) };
      for (const b of HEATING_BASES) row[`htdd_${b}`] = num(column('HTDD', b));
      for (const b of COOLING_BASES) row[`cldd_${b}`] = num(column('CLDD', b));
      rows.push(row);
    }
  }
  return { rows, problems };
}
