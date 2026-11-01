// The station index the weather tools search on the device: each chosen
// station's name, state, location, elevation, and its period of record for
// maximum and minimum temperature (ghcnd-stations.txt and ghcnd-inventory.txt).

import { readStations } from './ghcn-common.mjs';
import { STATIONS } from '../registry/ghcn-daily.mjs';

export const SCHEMA = [
  { name: 'station', type: 'str' }, { name: 'state', type: 'str' }, { name: 'name', type: 'str' },
  { name: 'lat', type: 'f64', unit: 'degrees north' }, { name: 'lon', type: 'f64', unit: 'degrees east' }, { name: 'elevation', type: 'f64', unit: 'm' },
  { name: 'first_year', type: 'f64', unit: 'first year with both maximum and minimum temperature' }, { name: 'last_year', type: 'f64', unit: 'last year with both' },
];

export async function normalize(input) {
  const want = new Set(STATIONS);
  const st = await readStations(input.stations, want);
  const years = new Map();
  for await (const l of input.inventory()) {
    const id = l.slice(0, 11);
    const el = l.slice(31, 35);
    if (!want.has(id) || (el !== 'TMAX' && el !== 'TMIN')) continue;
    const y = years.get(id) ?? years.set(id, { first: -Infinity, last: Infinity }).get(id);
    // Both elements must be present, so the period is where they overlap.
    y.first = Math.max(y.first, Number(l.slice(36, 40)));
    y.last = Math.min(y.last, Number(l.slice(41, 45)));
  }
  const missing = STATIONS.filter((id) => !st.has(id));
  if (missing.length) return { rows: [], problems: [`${missing.length} chosen stations are not in ghcnd-stations.txt: ${missing.slice(0, 5).join(', ')}`] };
  const rows = STATIONS.map((id) => ({ station: id, ...st.get(id), first_year: years.get(id)?.first ?? null, last_year: years.get(id)?.last ?? null }));
  return { rows, problems: [] };
}
