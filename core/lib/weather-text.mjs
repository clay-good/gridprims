// A station's weather as the weather picker writes it, and as an agent can type
// it (add-weather-normalization): a "station ID name" line, one
// "YYYY-MM-DD mean" line a day in °F, and "normal MM-DD htdd_65=… cldd_65=…"
// lines from NOAA's 1991–2020 daily normals. Shared by the weather tool and the
// usage benchmark's "how unusual was this year" line.

const DAY = 86_400_000;

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
