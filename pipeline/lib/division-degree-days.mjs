// Our degree days aggregated to a NOAA climate division (add-weather-normalization 1.3, "Verified against the
// publisher's division series"): each station's monthly base-65 heating and cooling degree days, summed from
// the daily means our models use, kept only for a month with every day present and unflagged, then averaged
// over the division's stations with an equal weight each. NOAA's divisional series is weighted by population
// (its divisional readme), which this does not attempt.

import { dailyMeans } from '../../core/lib/weather-stations.mjs';

const BASE = 65;
const daysInMonth = (ym) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();

/**
 * Each station's complete months of base-65 degree days.
 * @param {any[]} rows a state shard's daily rows @param {string} station
 * @returns {Map<string, {hdd: number, cdd: number}>} keyed YYYY-MM
 */
export function monthlyDegreeDays(rows, station) {
  const { means } = dailyMeans(rows, station);
  const months = new Map();
  for (const [day, mean] of means) {
    const ym = day.slice(0, 7);
    const m = months.get(ym) ?? months.set(ym, { hdd: 0, cdd: 0, days: 0 }).get(ym);
    m.hdd += Math.max(0, BASE - mean);
    m.cdd += Math.max(0, mean - BASE);
    m.days++;
  }
  return new Map([...months].filter(([ym, m]) => m.days === daysInMonth(ym)).map(([ym, m]) => [ym, { hdd: m.hdd, cdd: m.cdd }]));
}

/**
 * A division's month: the equal-weight mean over its stations that have the whole month.
 * @param {Array<Map<string, {hdd: number, cdd: number}>>} stations
 * @param {string} ym
 * @returns {{hdd: number, cdd: number, stations: number} | null}
 */
export function divisionMonth(stations, ym) {
  const have = stations.map((s) => s.get(ym)).filter(Boolean);
  if (!have.length) return null;
  return { hdd: have.reduce((t, x) => t + x.hdd, 0) / have.length, cdd: have.reduce((t, x) => t + x.cdd, 0) / have.length, stations: have.length };
}

/** Within 5% of NOAA's figure or 10 degree days, whichever is larger (degree-day-data, the division check). */
export const withinDivisionMargin = (ours, noaa) => Math.abs(ours - noaa) <= Math.max(0.05 * noaa, 10) + 1e-9;

/**
 * NOAA's monthly divisional degree days, from its climdiv-hddcdv or climdiv-cddcdv file.
 * @param {string} text @param {string[]} divisions four-digit state and division codes
 * @returns {Map<string, number>} keyed `${division}|YYYY-MM`
 */
export function readClimdiv(text, divisions) {
  const out = new Map();
  for (const line of text.split('\n')) {
    const code = line.slice(0, 4);
    if (!divisions.includes(code)) continue;
    const year = line.slice(6, 10);
    line.slice(10).trim().split(/\s+/).forEach((v, i) => { const n = Number(v); if (n >= 0) out.set(`${code}|${year}-${String(i + 1).padStart(2, '0')}`, n); });
  }
  return out;
}
