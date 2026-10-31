// A first-pass backup power size (add-electrification-tools: backup-power):
// the critical load by hour, a battery to ride through an outage of a given
// length, a generator that can start the largest motor, and outage events
// from county customers-out records. County events mean some customers in the
// county were out, not this address.

export const COUNTY_PROXY = 'A county event means some customers in the county were out, not that this address was. Durations are a typical guide, not a worst case: the last customers restored can be out after the county share falls below 1%.';

/**
 * Critical loads typed one a line, as "well pump, 1.5 kW, 2 h" or
 * "lights, 0.3 kW, 6 h, from 18:00". A load without a start time is spread
 * evenly over the day by its share of hours; one with a start time runs at
 * full power for its hours from then.
 * @returns {{loads: Array<{name: string, kw: number, hours: number, from: number | null}>, errors: string[]}}
 */
export function parseLoads(text) {
  const loads = [];
  const errors = [];
  String(text).split('\n').map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const kw = /([\d.]+)\s*kw\b/i.exec(line);
    const h = /([\d.]+)\s*(?:h|hours?)\b/i.exec(line);
    const from = /from\s+(\d{1,2}):(\d{2})/i.exec(line);
    const name = line.split(',')[0].replace(/[\d.]+\s*kw.*$/i, '').trim() || `Load ${i + 1}`;
    if (!kw || !h) { errors.push(`Line ${i + 1}: add ${[!kw && 'the running kW', !h && 'the hours a day it runs'].filter(Boolean).join(' and ')}, as "well pump, 1.5 kW, 2 h".`); return; }
    const hours = Number(h[1]);
    if (!(hours > 0 && hours <= 24)) { errors.push(`Line ${i + 1}: hours a day are between 0 and 24.`); return; }
    loads.push({ name, kw: Number(kw[1]), hours, from: from ? Number(from[1]) + Number(from[2]) / 60 : null });
  });
  return { loads, errors };
}

/** The critical load in kW for each hour of the day, 0 to 23. */
export function profile(loads) {
  const kw = new Array(24).fill(0);
  for (const l of loads) {
    if (l.from === null) { for (let h = 0; h < 24; h++) kw[h] += (l.kw * l.hours) / 24; continue; }
    // Full power from the start time, wrapping past midnight; a part hour counts its share.
    for (let h = 0; h < 24; h++) {
      const start = h;
      const overlap = [0, 24].reduce((n, shift) => n + Math.max(0, Math.min(start + 1, l.from + l.hours - shift) - Math.max(start, l.from - shift)), 0);
      kw[h] += l.kw * Math.min(1, overlap);
    }
  }
  return kw;
}

/**
 * The most critical load that can run at once, for the generator: loads with
 * a start time as scheduled, and every load without one at its full kW,
 * since it could start at any moment.
 */
export function peakRunningKw(loads) {
  const placed = profile(loads.filter((l) => l.from !== null));
  return Math.max(...placed) + loads.filter((l) => l.from === null).reduce((n, l) => n + l.kw, 0);
}

/**
 * Energy to ride through `hours`, starting at the hour with the highest
 * critical load, and the nameplate at a usable window.
 * @param {number[]} kw 24 hourly values
 */
export function battery(kw, hours, usableShare = 0.8) {
  const start = kw.indexOf(Math.max(...kw));
  let usable = 0;
  for (let t = 0; t < hours; t++) usable += kw[(start + Math.floor(t)) % 24] * Math.min(1, hours - t);
  return { startHour: start, usableKwh: usable, nameplateKwh: usable / usableShare };
}

/** Peak critical kW, less the largest motor's running kW, plus that motor's starting kW. */
export function generator(peakKw, motor) {
  if (!motor) return { kw: peakKw, formula: `${peakKw} kW peak critical load` };
  const kw = peakKw - motor.runKw + motor.startKw;
  return { kw, formula: `${+peakKw.toFixed(3)} kW − ${motor.runKw} kW running + ${motor.startKw} kW starting = ${+kw.toFixed(3)} kW` };
}

/** Nearest-rank percentile of a list. */
export function nearestRank(values, p) {
  const v = [...values].sort((a, b) => a - b);
  return v.length ? v[Math.max(0, Math.ceil((p / 100) * v.length) - 1)] : null;
}

/**
 * Outage events from county customers-out records: runs of 15-minute
 * intervals with at least 1% of tracked customers out, bridging missing
 * records of up to an hour inside a run. Duration = intervals × 15 minutes.
 * @param {Array<{ms: number, out: number}>} records sorted, one per 15-minute interval that has a record
 * @param {number} tracked customers EAGLE-I tracks in the county
 */
export function outageEvents(records, tracked) {
  const Q = 900_000;
  const events = [];
  let run = null;
  for (const r of records) {
    // A record under 1% ends the run; a missing record ends it only when the gap is over an hour.
    if (r.out / tracked < 0.01) { if (run) events.push(run); run = null; continue; }
    if (run && r.ms - run.lastMs <= Q + 3_600_000) { run.lastMs = r.ms; continue; }
    if (run) events.push(run);
    run = { startMs: r.ms, lastMs: r.ms };
  }
  if (run) events.push(run);
  return events.map((e) => ({ startMs: e.startMs, hours: (e.lastMs - e.startMs + Q) / 3_600_000 }));
}

/** The count and the 50th, 90th, and longest durations. */
export function eventSummary(events) {
  const h = events.map((e) => e.hours);
  return { count: h.length, p50: nearestRank(h, 50), p90: nearestRank(h, 90), longest: h.length ? Math.max(...h) : null };
}

/**
 * One county's outage history: the event summary over the years used. A year
 * is dropped when its state's published EAGLE-I coverage is below 50%; a year
 * with no published coverage figure is kept and named.
 * @param {Array<{year: number, hours: number}>} events this county's events, 2014 to 2025
 * @param {Record<number, number>} coverage the state's highest covered share by year, in percent
 * @param {{from: number, to: number}} span the data's years
 */
export function countyHistory(events, coverage, { from, to }) {
  const years = [];
  const dropped = [];
  const unpublished = [];
  for (let y = from; y <= to; y++) {
    if (coverage[y] === undefined) { unpublished.push(y); years.push(y); } else if (coverage[y] < 50) dropped.push({ year: y, pct: coverage[y] }); else years.push(y);
  }
  const used = events.filter((e) => years.includes(e.year));
  return { ...eventSummary(used), years, dropped, unpublished };
}
