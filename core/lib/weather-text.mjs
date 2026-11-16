// A station's weather as the weather picker writes it, and as an agent can type
// it (add-weather-normalization): a "station ID name" line, one
// "YYYY-MM-DD mean" line a day in °F, and "normal MM-DD htdd_65=… cldd_65=…"
// lines from NOAA's 1991–2020 daily normals. Shared by the weather tool and the
// usage benchmark's "how unusual was this year" line.

import { NORMALS_CAVEAT } from './weather-model.mjs';

const DAY = 86_400_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${MONTHS[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}, ${iso.slice(0, 4)}`;

/**
 * The station's daily mean temperatures and normals, as the picker writes them: a station line, then one
 * "YYYY-MM-DD mean" line a day (°F), then optional "normal MM-DD htdd57 htdd60 ..." lines are not needed here;
 * the normals travel as "normals base hdd cdd" for the base pair the model needs. Kept plain for agents.
 */
export function readWeather(text) {
  const means = new Map();
  let station = null;
  const normals = [];
  for (const line of String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    let m;
    if ((m = /^station\s+(\S+)\s*(.*)$/i.exec(line))) station = { id: m[1], name: m[2] || m[1] };
    else if ((m = /^(\d{4}-\d{2}-\d{2})\s+(-?[\d.]+)$/.exec(line))) means.set(m[1], Number(m[2]));
    else if ((m = /^normal\s+(\d{2})-(\d{2})\s+(.+)$/i.exec(line))) {
      const row = { month: Number(m[1]), day: Number(m[2]) };
      for (const kv of m[3].split(/\s+/)) { const [k, v] = kv.split('='); row[k] = Number(v); }
      normals.push(row);
    } else return { error: `"${line.slice(0, 40)}" is not a station line, a "YYYY-MM-DD mean" line, or a normal line.` };
  }
  return { station, means, normals };
}


/**
 * The period's degree days against the normal year's for the same calendar days, at one base (add-weather-
 * normalization 4.2): how unusual the weather was. February 29 has no normal and is left out of both.
 * @param {{means: Map<string, number>, normals: Array<Record<string, number>>}} w @param {string} from @param {string} to inclusive
 */
export function againstNormal(w, from, to, base = 65) {
  const normal = new Map(w.normals.map((r) => [`${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`, r]));
  let hdd = 0; let cdd = 0; let normalHdd = 0; let normalCdd = 0; let days = 0; let span = 0;
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY) {
    const d = new Date(t).toISOString().slice(0, 10);
    span++;
    const n = normal.get(d.slice(5));
    if (!w.means.has(d) || !n || n[`htdd_${base}`] === undefined) continue;
    const m = w.means.get(d);
    hdd += Math.max(0, base - m);
    cdd += Math.max(0, m - base);
    normalHdd += n[`htdd_${base}`];
    normalCdd += n[`cldd_${base}`] ?? 0;
    days++;
  }
  const rel = (x, normalX) => (normalX > 0 ? x / normalX - 1 : null);
  return { base, days, span, hdd, cdd, normalHdd, normalCdd, hddChange: rel(hdd, normalHdd), cddChange: rel(cdd, normalCdd) };
}

/**
 * "How unusual was this year": the period's heating and cooling degree days at one station against its
 * normal year, with the caveat on the normals, as the lines a result shows. Shared by the usage benchmark
 * and the workbench's rate-change impact, so both say it the same way.
 * @param {ReturnType<typeof readWeather>} w a read with a station and normals @param {string} from @param {string} to inclusive
 * @returns {string[]}
 */
export function unusualWeather(w, from, to) {
  const n = againstNormal(w, from, to);
  if (!n.days) return [`How unusual the weather was: ${w.station.name} has no readings between ${longDate(from)} and ${longDate(to)}, so it cannot say.`];
  const dd = (x) => Math.round(x).toLocaleString('en-US');
  /** Degree days of one kind against normal; a kind the normal year has none of is said plainly. */
  const kind = (x, normalX, change, what) => (normalX > 0
    ? `${dd(x)} ${what} degree days, ${Math.abs(Math.round(change * 100))}% ${change >= 0 ? 'more' : 'fewer'} than normal (${dd(normalX)})`
    : x > 0 ? `${dd(x)} ${what} degree days, where the normal year has none` : `no ${what} degree days, as normal`);
  return [
    `How unusual the weather was: from ${longDate(from)} to ${longDate(to)}, ${w.station.name} (station ${w.station.id}) recorded ${kind(n.hdd, n.normalHdd, n.hddChange, 'heating')}, and ${kind(n.cdd, n.normalCdd, n.cddChange, 'cooling')}, at base ${n.base} °F over the ${n.days.toLocaleString('en-US')} days with a reading.${n.days < n.span ? ` ${(n.span - n.days).toLocaleString('en-US')} of the ${n.span.toLocaleString('en-US')} days have no reading and are left out of both sides.` : ''} A year warmer or colder than normal moves use; the weather check splits how much.`,
    NORMALS_CAVEAT,
  ];
}
