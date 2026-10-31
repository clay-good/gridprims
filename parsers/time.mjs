// Local time and daylight saving with Intl and explicit IANA zones
// (foundation design D6). DST gaps and repeats are found by comparing UTC
// offsets, never by assuming a calendar rule, so the engine's own zone data
// decides and the fixture suite surfaces any engine that disagrees.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** @type {Map<string, Intl.DateTimeFormat>} */
const formatters = new Map();

/** @param {string} zone */
function formatter(zone) {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    formatters.set(zone, f);
  }
  return f;
}

/**
 * True when the engine knows this IANA zone name.
 * @param {string} zone
 */
export function isValidZone(zone) {
  try { formatter(zone); return true; } catch { return false; }
}

/**
 * @typedef {{year: number, month: number, day: number, hour: number, minute: number, second?: number}} LocalFields
 */

/**
 * Local wall-clock fields and UTC offset at an instant.
 * @param {string} zone
 * @param {number} utcMs
 * @returns {LocalFields & {second: number, offsetMinutes: number}}
 */
export function utcToLocal(zone, utcMs) {
  const parts = {};
  for (const p of formatter(zone).formatToParts(new Date(utcMs))) if (p.type !== 'literal') parts[p.type] = Number(p.value);
  if (parts.hour === 24) parts.hour = 0; // older engines report midnight as 24 despite h23
  const fields = { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
  const asUtc = Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute, fields.second);
  const offsetMinutes = Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / MINUTE);
  return { ...fields, offsetMinutes };
}

/**
 * UTC offset in minutes (east positive; US zones are negative) at an instant.
 * @param {string} zone
 * @param {number} utcMs
 */
export function offsetMinutes(zone, utcMs) {
  return utcToLocal(zone, utcMs).offsetMinutes;
}

/**
 * Convert local wall-clock fields to UTC. A wall time can name no instant (the
 * spring-forward gap) or two (the fall-back repeat); both are reported rather
 * than guessed.
 * @param {string} zone
 * @param {LocalFields} f
 * @returns {{status: 'ok', utcMs: number} | {status: 'gap'} | {status: 'repeat', earlier: number, later: number}}
 */
export function localToUtc(zone, f) {
  const wall = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second ?? 0);
  // Every offset in effect within a day either side covers any single transition.
  const candidates = new Set([offsetMinutes(zone, wall - 24 * HOUR), offsetMinutes(zone, wall), offsetMinutes(zone, wall + 24 * HOUR)]);
  const hits = [];
  for (const off of candidates) {
    const utc = wall - off * MINUTE;
    if (offsetMinutes(zone, utc) === off) hits.push(utc);
  }
  hits.sort((a, b) => a - b);
  if (hits.length === 0) return { status: 'gap' };
  if (hits.length === 1) return { status: 'ok', utcMs: hits[0] };
  return { status: 'repeat', earlier: hits[0], later: hits[hits.length - 1] };
}

/**
 * The daylight-saving transitions in a calendar year, found by scanning for
 * offset changes and narrowing each to the minute.
 * @param {string} zone
 * @param {number} year
 * @returns {Array<{utcMs: number, fromOffset: number, toOffset: number}>}
 */
export function transitions(zone, year) {
  const out = [];
  const start = Date.UTC(year, 0, 1) - 14 * HOUR;
  const end = Date.UTC(year + 1, 0, 1) + 14 * HOUR;
  let t = start;
  let off = offsetMinutes(zone, t);
  while (t < end) {
    const next = Math.min(t + 24 * HOUR, end);
    const nextOff = offsetMinutes(zone, next);
    if (nextOff !== off) {
      let lo = t;
      let hi = next;
      while (hi - lo > MINUTE) {
        const mid = lo + Math.floor((hi - lo) / 2 / MINUTE) * MINUTE;
        if (offsetMinutes(zone, mid) === off) lo = mid; else hi = mid;
      }
      out.push({ utcMs: hi, fromOffset: off, toOffset: nextOff });
    }
    t = next;
    off = nextOff;
  }
  return out;
}

/**
 * Format an instant as local ISO 8601 with its offset, for receipts and logs.
 * @param {string} zone
 * @param {number} utcMs
 */
export function formatLocalIso(zone, utcMs) {
  const l = utcToLocal(zone, utcMs);
  const p2 = (n) => String(n).padStart(2, '0');
  const sign = l.offsetMinutes < 0 ? '-' : '+';
  const a = Math.abs(l.offsetMinutes);
  return `${l.year}-${p2(l.month)}-${p2(l.day)}T${p2(l.hour)}:${p2(l.minute)}:${p2(l.second)}${sign}${p2(Math.floor(a / 60))}:${p2(a % 60)}`;
}
