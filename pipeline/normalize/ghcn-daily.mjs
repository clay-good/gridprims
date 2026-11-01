// GHCN-Daily per-station CSVs trimmed to what degree days need: station, date,
// maximum, and minimum temperature (tenths of a degree Celsius in the source),
// from 2019-01-01, with NOAA's quality flag for each value kept. A flagged
// value failed one of NOAA's checks; the weather tools treat it as missing.

import { readStations, stationOf } from './ghcn-common.mjs';
import { STATIONS } from '../registry/ghcn-daily.mjs';

const FROM = '20190101';
const HEADER_FIELDS = 8; // ID,DATE,ELEMENT,VALUE,M-FLAG,Q-FLAG,S-FLAG,OBS-TIME

export const SCHEMA = [
  { name: 'station', type: 'str' }, { name: 'state', type: 'str' },
  { name: 'day', type: 'i32', unit: 'days since 1970-01-01', scale: 1 },
  { name: 'tmax', type: 'i32', unit: '°C', scale: 10 }, { name: 'tmin', type: 'i32', unit: '°C', scale: 10 },
  { name: 'qflag_tmax', type: 'str', unit: 'NOAA quality flag; blank passed every check' }, { name: 'qflag_tmin', type: 'str', unit: 'NOAA quality flag' },
];

/** Days since 1970 of a YYYYMMDD date. */
export const dayOf = (d) => Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8)) / 86_400_000;

export async function normalize(input) {
  const st = await readStations(input.stations, new Set(STATIONS));
  const rows = [];
  const problems = [];
  for (const [key, lines] of Object.entries(input)) {
    if (key === 'stations') continue;
    const id = stationOf(key);
    const days = new Map();
    for await (const l of lines()) {
      if (!l) continue;
      const c = l.split(',');
      if (c.length < HEADER_FIELDS - 1 || c[0] !== id) { problems.push(`${id}: a line reads ${JSON.stringify(l.slice(0, 60))}`); break; }
      if ((c[2] !== 'TMAX' && c[2] !== 'TMIN') || c[1] < FROM) continue;
      const v = Number(c[3]);
      const d = days.get(c[1]) ?? days.set(c[1], { tmax: null, tmin: null, qflag_tmax: null, qflag_tmin: null }).get(c[1]);
      const k = c[2] === 'TMAX' ? 'tmax' : 'tmin';
      // -9999 is NOAA's missing value.
      d[k] = v === -9999 ? null : v / 10;
      d[`qflag_${k}`] = c[5] || null;
    }
    for (const [date, d] of [...days].sort((a, b) => (a[0] < b[0] ? -1 : 1))) rows.push({ station: id, state: st.get(id)?.state ?? null, day: dayOf(date), ...d });
  }
  return { rows, problems };
}
