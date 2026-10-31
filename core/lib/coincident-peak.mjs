// Coincident peaks (add-load-and-bill-analyzer: coincident-peak, tasks 5.1 to
// 5.4): how much of a load landed on the grid's system peaks, and what those
// peaks cost. Programs are versioned definitions (design D5): a method change
// such as 4CP to 12CP is a new version, so an older year keeps its rule.
// Each definition says whether the operator's published stamp is the start or
// the end of the interval, in its own time basis.

import { localToUtc } from '../../parsers/time.mjs';

/** @typedef {{id: string, program: string, name: string, peaks: number, months: number[], minutes: number, stamp: 'start' | 'end', zone: string, label: string, ruleYears: [number, number | null] | null, status: 'in force' | 'proposed', source: string, charge: 'transmission' | 'capacity', ships: boolean, listUrl: string}} Program */

/** @type {Program[]} */
export const PROGRAMS = [
  { id: 'ercot-4cp', program: 'ercot', name: 'ERCOT 4CP', peaks: 4, months: [6, 7, 8, 9], minutes: 15, stamp: 'end', zone: 'America/Chicago', label: 'interval ending, Central Prevailing Time', ruleYears: [2018, 2026], status: 'in force', source: 'PUCT Substantive Rule 25.192; ERCOT report NP9-83-M, Four Coincident Peak Calculations', charge: 'transmission', ships: true, listUrl: 'https://www.ercot.com/mktinfo/data_agg/4cp' },
  { id: 'ercot-12cp', program: 'ercot', name: 'ERCOT 12CP (proposed)', peaks: 12, months: [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9], minutes: 30, stamp: 'end', zone: 'America/Chicago', label: '30-minute interval ending, Central Prevailing Time', ruleYears: null, status: 'proposed', source: 'PUCT Project 58000, proposal published 2026-07-09 under Texas SB 6', charge: 'transmission', ships: false, listUrl: 'https://interchange.puc.texas.gov/search/filings/?UtilityType=A&ControlNumber=58000' },
  { id: 'pjm-5cp', program: 'pjm', name: 'PJM 5CP (capacity)', peaks: 5, months: [6, 7, 8, 9], minutes: 60, stamp: 'end', zone: 'America/New_York', label: 'hour ending, Eastern Prevailing Time', ruleYears: [2018, null], status: 'in force', source: 'PJM Manual 19, Load Forecasting and Analysis', charge: 'capacity', ships: false, listUrl: 'https://www.pjm.com/planning/resource-adequacy-planning/load-forecast-dev-process' },
  { id: 'pjm-nspl', program: 'pjm', name: 'PJM NSPL (transmission)', peaks: 1, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], minutes: 60, stamp: 'end', zone: 'America/New_York', label: 'hour ending, Eastern Prevailing Time', ruleYears: [2018, null], status: 'in force', source: 'PJM Open Access Transmission Tariff, Attachment M-2 (each EDC\'s NSPL method)', charge: 'transmission', ships: false, listUrl: 'https://www.pjm.com/markets-and-operations/billing-settlements-and-credit' },
  { id: 'nyiso-icap', program: 'nyiso', name: 'NYISO ICAP tag', peaks: 1, months: [6, 7, 8, 9], minutes: 60, stamp: 'start', zone: 'America/New_York', label: 'hour beginning, Eastern Prevailing Time', ruleYears: [2018, null], status: 'in force', source: 'NYISO Installed Capacity Manual; the NYCA peak in the Gold Book', charge: 'capacity', ships: false, listUrl: 'https://www.nyiso.com/installed-capacity-market' },
  { id: 'isone-icl', program: 'isone', name: 'ISO-NE ICL tag', peaks: 1, months: [6, 7, 8, 9], minutes: 60, stamp: 'end', zone: 'America/New_York', label: 'hour ending, Eastern Prevailing Time', ruleYears: [2018, null], status: 'in force', source: 'ISO-NE Annual System Peak Day, Hour & Load report (the FCM peak)', charge: 'capacity', ships: false, listUrl: 'https://www.iso-ne.com/isoexpress/web/reports/load-and-demand' },
];

/** The definition in force for a program in a year; a proposed version is used only when asked for by id. */
export function programFor(id, year) {
  const p = PROGRAMS.find((x) => x.id === id);
  if (!p) return null;
  if (p.status === 'proposed' || !p.ruleYears) return p;
  const [from, to] = p.ruleYears;
  if (year < from || (to !== null && year > to)) return null;
  return p;
}

/** Which program to preselect: ERCOT for a utility in the ERCOT balancing authority. */
export const preselect = (bas = []) => (bas.includes('ERCO') ? 'ercot-4cp' : bas.some((b) => b === 'PJM') ? 'pjm-5cp' : bas.includes('NYIS') ? 'nyiso-icap' : bas.includes('ISNE') ? 'isone-icl' : 'ercot-4cp');

/**
 * A published stamp as the interval it names, in UTC: an interval-ending 17:00 CPT is 16:45 to 17:00.
 * @param {Program} p
 * @param {{date: string, time: string}} stamp time HH:MM; hour ending 24:00 is midnight that ends the day
 */
export function intervalOf(p, { date, time }) {
  const [y, m, d] = date.split('-').map(Number);
  let [hh, mm] = time.split(':').map(Number);
  let day = Date.UTC(y, m - 1, d);
  if (hh === 24) { hh = 0; day += 86_400_000; }
  const t = new Date(day);
  const at = localToUtc(p.zone, { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(), hour: hh, minute: mm });
  const ms = at.status === 'ok' ? at.utcMs : at.status === 'repeat' ? at.earlier : NaN;
  const len = p.minutes * 60_000;
  return p.stamp === 'end' ? { startMs: ms - len, endMs: ms } : { startMs: ms, endMs: ms + len };
}

/**
 * The load in each system peak interval, its average (the tag), and labels for coarse data.
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} s
 * @param {Program} p
 * @param {Array<{date: string, time: string | null}>} stamps
 * @returns {{status: 'refused', reason: string} | {status: 'date-only', flag: string, dates: string[]} | {status: 'ok', intervals: any[], averageKw: number | null, approximate: string | null}}
 */
export function exposure(s, p, stamps) {
  if (stamps.some((x) => !x.time)) return { status: 'date-only', flag: 'date only, interval time not published', dates: stamps.map((x) => x.date) };
  if (s.intervalMinutes > p.minutes && p.minutes !== 15) {
    return { status: 'refused', reason: `${p.name} uses ${p.minutes}-minute intervals, which cannot be recovered from ${s.intervalMinutes === 60 ? 'hourly' : `${s.intervalMinutes}-minute`} data.` };
  }
  const approximate = s.intervalMinutes > p.minutes ? `approximate: your data is ${s.intervalMinutes === 60 ? 'hourly' : `${s.intervalMinutes}-minute`}, so each ${p.minutes}-minute peak interval is read as the average of the ${s.intervalMinutes} minutes around it, which can be lower than the true ${p.minutes}-minute demand.` : null;
  const step = s.intervalMinutes * 60_000;
  const intervals = stamps.map((stamp) => {
    const { startMs, endMs } = intervalOf(p, stamp);
    // Energy in the interval, from every reading that overlaps it, by the share of it that overlaps.
    let kwh = 0;
    let covered = 0;
    for (let i = 0; i < s.startMs.length; i++) {
      const a = Math.max(startMs, s.startMs[i]);
      const b = Math.min(endMs, s.startMs[i] + step);
      if (b <= a) continue;
      kwh += s.kwh[i] * ((b - a) / step);
      covered += b - a;
    }
    const kw = covered ? kwh / (covered / 3_600_000) : null;
    return { ...stamp, startMs, endMs, kw, missing: covered < endMs - startMs };
  });
  const have = intervals.filter((x) => x.kw !== null);
  return { status: 'ok', intervals, averageKw: have.length === intervals.length ? have.reduce((n, x) => n + x.kw, 0) / have.length : null, approximate };
}

/**
 * The annual cost of a tag, and what a reduction in every peak interval would have saved.
 * @param {Program} p
 * @param {number} tagKw the average (4CP) or the tag
 * @param {{ratePerKwMonth?: number, ratePerKwYear?: number, pricePerMwDay?: number, scaling?: number, days?: number, reductionKw?: number}} r
 */
export function peakCost(p, tagKw, r) {
  const yearly = (kw) => {
    if (p.charge === 'capacity' && r.pricePerMwDay !== undefined) return (kw / 1000) * (r.scaling ?? 1) * r.pricePerMwDay * (r.days ?? 365);
    if (r.ratePerKwMonth !== undefined) return kw * r.ratePerKwMonth * 12;
    if (r.ratePerKwYear !== undefined) return kw * r.ratePerKwYear;
    return null;
  };
  const annual = yearly(tagKw);
  const round = (x) => (x === null ? null : Math.round(x * 100) / 100);
  const applies = p.program === 'ercot' ? 'the following calendar year\'s bills' : p.charge === 'capacity' ? 'the delivery year from June 1 to May 31' : 'the following calendar year';
  return { annual: round(annual), savings: r.reductionKw && annual !== null ? round(annual - yearly(Math.max(0, tagKw - r.reductionKw))) : null, applies };
}

/** The eligibility note shown with ERCOT 4CP. */
export const ERCOT_NOTE = '4CP transmission charges apply to customers billed on 4CP demand under their wires utility\'s tariff, which sets who qualifies; check that tariff sheet.';
