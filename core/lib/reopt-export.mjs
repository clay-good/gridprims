// A clean load file REopt accepts (add-load-and-bill-analyzer:
// handoff-and-report, task 7.1). REopt takes one column of average kW, no
// header, exactly 8,760, 17,520, or 35,040 rows from January 1 of a stated
// year, and drops December 31 in a leap year (docs/research/07 §2). The export
// lays the file out on local days, fills what it must with a disclosed
// method, and writes every repair into a notes file. Filled values exist only
// in the export; no other tool sees them.

import { utcToLocal } from '../../parsers/time.mjs';

const DAY = 86_400_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (y, m, d) => Date.UTC(y, m - 1, d);
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/**
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} s
 * @param {string} zone
 * @returns {{status: 'refused', reason: string} | {status: 'ok', year: number, minutes: number, rows: number, csv: string, notes: string[], fileName: string}}
 */
export function exportForReopt(s, zone) {
  const target = [15, 30, 60].find((m) => m >= s.intervalMinutes && m % s.intervalMinutes === 0);
  if (!target) return { status: 'refused', reason: `REopt takes 15, 30, or 60-minute steps, and ${s.intervalMinutes}-minute intervals do not divide into any of them.` };
  const slots = 1440 / target;
  const notes = [];
  if (target !== s.intervalMinutes) notes.push(`The file's ${s.intervalMinutes}-minute intervals are averaged into ${target}-minute steps.`);

  // Average kW in each local day and slot; a repeated fall-back hour puts two readings in one slot, which are averaged.
  const grid = new Map(); // day ms -> {sum: Float64Array, n: Uint8Array}
  let repeated = 0;
  for (let i = 0; i < s.startMs.length; i++) {
    const l = utcToLocal(zone, s.startMs[i]);
    const d = dayMs(l.year, l.month, l.day);
    const slot = Math.floor((l.hour * 60 + l.minute) / target);
    let g = grid.get(d);
    if (!g) grid.set(d, (g = { sum: new Float64Array(slots), n: new Uint8Array(slots) }));
    g.sum[slot] += s.kwh[i] * (60 / s.intervalMinutes);
    g.n[slot]++;
  }
  const perSlot = target / s.intervalMinutes;
  for (const g of grid.values()) for (let k = 0; k < slots; k++) if (g.n[k] > perSlot) repeated++;
  const value = (d, k) => { const g = grid.get(d); return g && g.n[k] ? g.sum[k] / g.n[k] : null; };

  const days = [...grid.keys()].sort((a, b) => a - b);
  const first = days[0];
  const last = days.at(-1);
  if (!days.length || (last - first) / DAY + 1 < 365) {
    const months = new Set(days.map((d) => iso(d).slice(0, 7))).size;
    return { status: 'refused', reason: `REopt needs a full year of load, and this file covers ${months} month${months === 1 ? '' : 's'}. Ask your utility for more history rather than inventing the missing months.` };
  }

  // The year: the latest full calendar year in the file, or else the year of its last day, re-stitched by weekday.
  let year = null;
  for (let y = new Date(last).getUTCFullYear(); y >= new Date(first).getUTCFullYear(); y--) if (first <= dayMs(y, 1, 1) && last >= dayMs(y, 12, 31)) { year = y; break; }
  const stitched = year === null;
  if (stitched) year = new Date(last).getUTCFullYear();
  const targetDays = [];
  for (let d = dayMs(year, 1, 1); d <= dayMs(year, 12, 31); d += DAY) targetDays.push(d);
  if (isLeap(year)) { targetDays.pop(); notes.push(`${year} is a leap year, so December 31 is left out, as REopt does, to keep 365 days.`); }

  /** @type {Map<number, number>} target day -> source day */
  const map = new Map();
  if (!stitched) for (const t of targetDays) map.set(t, t);
  else {
    // The last 365 days of the file in calendar order: days already in the target year stay put, and the rest
    // come from exactly 52 weeks earlier, so every weekday matches. 365 days is not a whole number of weeks,
    // so one or two target days are left over.
    const windowStart = last - 364 * DAY;
    const yearStart = dayMs(year, 1, 1);
    const ranges = { same: [], earlier: [] };
    for (const t of targetDays) {
      if (t >= windowStart && t <= last && grid.has(t)) { map.set(t, t); ranges.same.push(t); continue; }
      const src = t - 364 * DAY;
      if (src >= windowStart && src < yearStart && grid.has(src)) { map.set(t, src); ranges.earlier.push(t); }
    }
    const span = (list, offset) => (list.length ? `${iso(list[0])} to ${iso(list.at(-1))} come from ${offset ? `${iso(list[0] - offset)} to ${iso(list.at(-1) - offset)}, 52 weeks earlier, so weekdays match` : 'the same days'}` : null);
    for (const x of [span(ranges.same, 0), span(ranges.earlier, 364 * DAY)].filter(Boolean)) notes.push(`${x}.`);
    // Target days left over: copied from the nearest mapped day with the same weekday.
    for (const t of targetDays) {
      if (map.has(t)) continue;
      for (const k of [7, -7, 14, -14, 21, -21]) {
        if (map.has(t + k * DAY) && map.get(t + k * DAY) !== undefined) {
          map.set(t, map.get(t + k * DAY));
          notes.push(`${iso(t)} has no matching day in the file and is filled from ${iso(t + k * DAY)}, the nearest day with the same weekday.`);
          break;
        }
      }
    }
    notes.unshift(`The file is not a calendar year, so its last 365 days are re-stitched into calendar year ${year}, month by month, keeping weekdays aligned.`);
  }

  // Values, filling gaps by the same weekday and time in the nearest complete weeks before and after, averaged.
  const rows = [];
  let gapFilled = 0;
  let springFilled = 0;
  const gapDays = new Set();
  for (const t of targetDays) {
    const src = map.get(t);
    for (let k = 0; k < slots; k++) {
      let v = value(src, k);
      if (v === null) {
        // A slot no instant has (the spring-forward hour) takes the average of the slots on each side.
        const neighbors = [value(src, k - 1), value(src, k + 1)].filter((x) => x !== null);
        const weeks = [value(src - 7 * DAY, k), value(src + 7 * DAY, k)].filter((x) => x !== null);
        if (isSpringGap(zone, src, k, target)) { v = neighbors.length ? neighbors.reduce((a, b) => a + b) / neighbors.length : 0; springFilled++; }
        else {
          const wider = weeks.length ? weeks : [value(src - 14 * DAY, k), value(src + 14 * DAY, k)].filter((x) => x !== null);
          v = wider.length ? wider.reduce((a, b) => a + b) / wider.length : (neighbors[0] ?? 0);
          gapFilled++;
          gapDays.add(iso(src));
        }
      }
      rows.push(v);
    }
  }
  if (repeated) notes.push(`Daylight saving: ${repeated} repeated fall-back step${repeated === 1 ? ' is' : 's are'} averaged into one, so every day has ${slots} steps.`);
  if (springFilled) notes.push(`Daylight saving: ${springFilled} spring-forward step${springFilled === 1 ? '' : 's'}, which no clock shows, ${springFilled === 1 ? 'is' : 'are'} filled with the average of the steps on each side.`);
  if (gapFilled) notes.push(`Gaps: ${gapFilled} missing step${gapFilled === 1 ? '' : 's'} on ${gapDays.size} day${gapDays.size === 1 ? '' : 's'} (${[...gapDays].join(', ')}) ${gapFilled === 1 ? 'is' : 'are'} filled with the average of the same weekday and time in the nearest complete weeks before and after. Filled values appear only in this export; the bill and other tools still leave the gaps out.`);
  notes.unshift(`REopt custom load profile for calendar year ${year}: ${rows.length.toLocaleString('en-US')} rows of average kW, ${target}-minute steps (${60 / target} per hour), no header, starting January 1 at midnight. Set ElectricLoad.year to ${year}.`);
  return { status: 'ok', year, minutes: target, rows: rows.length, csv: rows.map((v) => v.toFixed(4)).join('\n') + '\n', notes, fileName: `gridprims-reopt-load-${year}-${60 / target}-per-hour.csv` };
}

/** Whether a slot of a local day falls in the hour skipped by a spring-forward change. */
function isSpringGap(zone, day, k, target) {
  const minutes = k * target;
  // Find the instant whose local wall time is this slot: if none exists, it is the gap.
  for (const offsetH of [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3]) {
    const guess = day + minutes * 60_000 - offsetH * 3_600_000;
    const l = utcToLocal(zone, guess);
    if (dayMs(l.year, l.month, l.day) === day && l.hour * 60 + l.minute === minutes) return false;
  }
  return true;
}
