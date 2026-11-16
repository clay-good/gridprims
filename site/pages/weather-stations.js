// The nearest NOAA stations to a typed ZIP, and one station's daily
// temperatures and normals as the weather text the tools read, for every
// page that asks how unusual the weather was. Requests go only for the ZIP
// prefix table, the state lookup shard, and the station's state shards; none
// names the ZIP, the station, or a county.

import { getJson, utilitiesForZip } from './zip-utilities.js';
import { rankStations, dailyMeans } from '../../core/lib/weather-stations.mjs';
import { readShard } from '../../core/lib/shard.mjs';

const shardCache = new Map();
const shard = (path) => shardCache.get(path) ?? shardCache.set(path, fetch(path).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)))).then((b) => readShard(b).rows())).get(path);

/**
 * The five stations nearest the ZIP, nearest first; none when the ZIP has no point.
 * @param {string} zip as typed
 * @returns {Promise<{parsed: any, stations: any[], noPoint: boolean}>}
 */
export async function stationsForZip(zip) {
  const found = await utilitiesForZip(zip);
  const { parsed } = found;
  if (!parsed.ok) return { parsed, stations: [], noPoint: false };
  const shards = Object.values(found.shards);
  const point = shards.map((s) => s.points?.[parsed.zip]).find(Boolean);
  if (!point) return { parsed, stations: [], noPoint: true };
  // Stations from every shard the ZIP needs, once each.
  const all = new Map();
  for (const s of shards) for (const [station, name, state, lat, lon, elevation, first, last] of s.stations ?? []) all.set(station, { station, name, state, lat, lon, elevation, first_year: first, last_year: last });
  return { parsed, stations: rankStations({ lat: point[0], lon: point[1] }, [...all.values()], 5), noPoint: false };
}

/**
 * One station's weather text: its line, a "YYYY-MM-DD mean" line a day from `from` to `to` (or the latest
 * two years it has, when `span` gives none), and its normals.
 * @param {any} s a station from stationsForZip @param {(lastDay: string) => [string, string]} span
 */
export async function stationWeather(s, span) {
  const meta = await getJson('/weather/meta.json');
  const base = `/data/${meta.dataset}/${meta.version}`;
  const [daily, normals] = await Promise.all([shard(`${base}/daily/${s.state}.bin`), shard(`${base}/normals/${s.state}.bin`)]);
  const { means, flagged } = dailyMeans(daily, s.station);
  const days = [...means.keys()].sort();
  if (!days.length) return { meta, means, flagged, text: null };
  const [from, to] = span(days.at(-1));
  const lines = [`station ${s.station} ${s.name}`];
  for (const d of days) if (d >= from && d <= to) lines.push(`${d} ${Math.round(means.get(d) * 10) / 10}`);
  for (const r of normals.filter((x) => x.station === s.station)) {
    lines.push(`normal ${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')} ${Object.entries(r).filter(([k, v]) => /^(htdd|cldd)_/.test(k) && v !== null).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  }
  return { meta, means, flagged, from, to, text: lines.join('\n') };
}
