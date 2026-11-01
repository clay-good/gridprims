// Hourly carbon from a meter file (add-hourly-carbon): the load summed into
// UTC clock hours and multiplied by its balancing authority's consumption-based
// CO2 intensity for the same hour (EIA-930, design D1 and D2), beside the same
// load at the year's flat average and at the eGRID subregion rate; hourly
// versus annual matching of clean supply; and the typical cleanest and
// dirtiest hours of a region, by month and local clock hour.

import { utcToLocal } from '../../parsers/time.mjs';
import { parseDelimited } from '../../parsers/delimited.mjs';
import { stamp } from './added-load.mjs';

const HOUR = 3_600_000;
const LB_PER_T = 2204.62262185; // 1 metric ton / 0.45359237 kg per lb (NIST SP 811)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Every result carries this, and so does every copied card (spec carbon/hourly-emissions, "Method caveat on every result"). */
export const CAVEAT = 'EIA computes hourly CO₂ from hourly generation by fuel times annual average emission factors, so hourly changes reflect the fuel mix only; combined heat and power, units EIA does not see, and interchange errors can distort them.';
/** The one line on why this factor (the consultation draft's ranking, which is not final). */
export const WHY_FACTOR = (ba) => `This is the most detailed public hourly, consumption-based factor available for ${ba}, ranked by area, then time interval, then consumption-based, per the GHG Protocol's Scope 2 consultation draft (a draft, not final).`;
/** Every matching result carries this (spec carbon/hourly-matching, "Draft-method label"). */
export const DRAFT_LABEL = 'A preview of hourly matching as described in the GHG Protocol\'s 2025–2026 Scope 2 consultation. The method is not final, and this does not account for deliverability, certificates, or contract terms.';
export const PRODUCTION_LABEL = 'The grid clean share is production-based: generation inside the region, ignoring imports, unlike the consumption-based emissions intensity.';
/** The shift estimate's label (spec carbon/cleanest-hours, "Shift estimate"). */
export const ATTRIBUTIONAL = 'An estimate from history using average-intensity (attributional) accounting: not a forecast, and not the actual change in grid emissions, which depends on the marginal generators.';

/**
 * The local zone where most of a region's customers live, for clock hours. EIA's own "Time zone" column is
 * the zone a region reports in (MISO and LG&E-KU report in Eastern Standard, New Mexico's PNM in Arizona time),
 * so this map names the prevailing zone instead; the tools let the user change it.
 */
export const REGION_ZONES = {
  AEC: 'America/Chicago', AECI: 'America/Chicago', AVA: 'America/Los_Angeles', AVRN: 'America/Los_Angeles', AZPS: 'America/Phoenix', BANC: 'America/Los_Angeles',
  BPAT: 'America/Los_Angeles', CHPD: 'America/Los_Angeles', CISO: 'America/Los_Angeles', CPLE: 'America/New_York', CPLW: 'America/New_York', DEAA: 'America/Phoenix',
  DOPD: 'America/Los_Angeles', DUK: 'America/New_York', EEI: 'America/Chicago', EPE: 'America/Denver', ERCO: 'America/Chicago', FMPP: 'America/New_York',
  FPC: 'America/New_York', FPL: 'America/New_York', GCPD: 'America/Los_Angeles', GLHB: 'America/Chicago', GRID: 'America/Los_Angeles', GRIF: 'America/Phoenix',
  GRMA: 'America/Phoenix', GVL: 'America/New_York', GWA: 'America/Denver', HGMA: 'America/Phoenix', HST: 'America/New_York', IID: 'America/Los_Angeles',
  IPCO: 'America/Boise', ISNE: 'America/New_York', JEA: 'America/New_York', LDWP: 'America/Los_Angeles', LGEE: 'America/New_York', MISO: 'America/Chicago',
  NEVP: 'America/Los_Angeles', NSB: 'America/New_York', NWMT: 'America/Denver', NYIS: 'America/New_York', OVEC: 'America/New_York', PACE: 'America/Denver',
  PACW: 'America/Los_Angeles', PGE: 'America/Los_Angeles', PJM: 'America/New_York', PNM: 'America/Denver', PSCO: 'America/Denver', PSEI: 'America/Los_Angeles',
  SC: 'America/New_York', SCEG: 'America/New_York', SCL: 'America/Los_Angeles', SEC: 'America/New_York', SEPA: 'America/New_York', SOCO: 'America/New_York',
  SPA: 'America/Chicago', SRP: 'America/Phoenix', SWPP: 'America/Chicago', TAL: 'America/New_York', TEC: 'America/New_York', TEPC: 'America/Phoenix',
  TIDC: 'America/Los_Angeles', TPWR: 'America/Los_Angeles', TVA: 'America/Chicago', WACM: 'America/Denver', WALC: 'America/Phoenix', WAUW: 'America/Denver',
  WWA: 'America/Denver', YAD: 'America/New_York',
};

/** EIA-930's published regions are the lower 48 states (an inference; see the limits page's unverified-claim register). */
export const NO_HOURLY_STATES = new Set(['AK', 'HI']);

/**
 * The balancing authority a utility's load goes to (spec carbon/hourly-emissions, "Region assignment"): the one
 * EIA-861 names when it names one with hourly data; the user's choice among several; none in Alaska and Hawaii.
 * @param {{bas?: string[], state?: string}} utility @param {Set<string>} withData regions that have hourly data
 * @returns {{status: 'assigned', ba: string} | {status: 'choose', choices: string[]} | {status: 'none', noHourly: boolean}}
 */
export function assignRegion(utility, withData) {
  const known = [...new Set(utility.bas ?? [])].filter((b) => withData.has(b)).sort();
  if (known.length === 1) return { status: 'assigned', ba: known[0] };
  if (known.length > 1) return { status: 'choose', choices: known };
  return { status: 'none', noHourly: NO_HOURLY_STATES.has(utility.state) };
}

/**
 * A meter series summed into UTC clock hours (design D2). An hour whose intervals are not all present is
 * computed on those present and counted partial. Intervals longer than an hour cannot be placed in hours.
 * @param {{startMs: Float64Array, kwh: Float64Array, intervalMinutes: number}} s
 * @returns {{status: 'ok', hours: Map<number, number>, partial: number, steps: string[]} | {status: 'refused', reason: string}}
 */
export function toHours(s) {
  if (s.intervalMinutes > 60 || 60 % s.intervalMinutes) return { status: 'refused', reason: `Hourly emissions need intervals of an hour or less that divide the hour; this file's are ${s.intervalMinutes} minutes.` };
  const per = 60 / s.intervalMinutes;
  const hours = new Map();
  const count = new Map();
  for (let i = 0; i < s.startMs.length; i++) {
    const h = Math.floor(s.startMs[i] / HOUR);
    hours.set(h, (hours.get(h) ?? 0) + s.kwh[i]);
    count.set(h, (count.get(h) ?? 0) + 1);
  }
  let partial = 0;
  for (const n of count.values()) if (n < per) partial++;
  const steps = per === 1
    ? ['Each hourly reading is matched to the EIA hour with the same UTC start.']
    : [`The ${per} intervals of each clock hour are summed and matched to the EIA hour with the same UTC start.`];
  if (partial) steps.push(`${partial.toLocaleString('en-US')} partial hour${partial === 1 ? '' : 's'} (not all ${per} intervals present) are computed on the intervals present.`);
  return { status: 'ok', hours, partial, steps };
}

/**
 * The grid's hours from EIA-930 shard rows, by UTC hour start.
 * @param {Array<Record<string, number | string | null>>} rows
 */
export function gridHours(rows) {
  return new Map(rows.map((r) => [r.hour, r]));
}

/** The flat annual average of the consumption-based intensity for each year, over the hours EIA published one. */
export function yearMeans(grid) {
  const sums = new Map();
  for (const r of grid.values()) {
    if (r.intensity_consumed === null || r.intensity_consumed === undefined) continue;
    const y = new Date(r.hour * HOUR).getUTCFullYear();
    const s = sums.get(y) ?? sums.set(y, { sum: 0, n: 0 }).get(y);
    s.sum += r.intensity_consumed;
    s.n++;
  }
  return new Map([...sums].map(([y, s]) => [y, s.sum / s.n]));
}

const pct = (a, b) => (b ? ((a - b) / b) * 100 : 0);

/**
 * Hourly emissions of a load (spec carbon/hourly-emissions): the hourly result, the same load at the year's
 * flat average (the gap is timing), and at the eGRID subregion's CO2 rate (the gap is region, basis, and year).
 * @param {{load: Map<number, number>, grid: Map<number, any>, means?: Map<number, number>, zone: string, ba: string, egrid?: {subregion: string, lbPerMwh: number, edition: string, unofficial?: boolean}}} p
 */
export function hourlyEmissions({ load, grid, means = yearMeans(grid), zone, ba, egrid }) {
  let lb = 0;
  let flatLb = 0;
  let kwh = 0;
  let excludedHours = 0;
  let excludedKwh = 0;
  const months = new Map();
  const byHourOfDay = Array.from({ length: 24 }, () => ({ kwh: 0, lb: 0, flatLb: 0 }));
  for (const [h, e] of [...load].sort((a, b) => a[0] - b[0])) {
    const g = grid.get(h);
    const year = new Date(h * HOUR).getUTCFullYear();
    // Hours without intensity are counted and left out, never filled.
    if (!g || g.intensity_consumed === null || g.intensity_consumed === undefined || !means.has(year)) { excludedHours++; excludedKwh += e; continue; }
    const l = utcToLocal(zone, h * HOUR);
    const key = `${l.year}-${String(l.month).padStart(2, '0')}`;
    const m = months.get(key) ?? months.set(key, { month: `${MONTHS[l.month - 1]} ${l.year}`, kwh: 0, lb: 0 }).get(key);
    const hl = e * g.intensity_consumed;
    const fl = e * means.get(year);
    m.kwh += e;
    m.lb += hl;
    lb += hl;
    flatLb += fl;
    kwh += e;
    byHourOfDay[l.hour].kwh += e;
    byHourOfDay[l.hour].lb += hl;
    byHourOfDay[l.hour].flatLb += fl;
  }
  const allKwh = kwh + excludedKwh;
  // The clock hours that drive the timing gap: those adding the most above the flat average.
  const drivers = byHourOfDay.map((x, hour) => ({ hour, lb: x.lb - x.flatLb, kwh: x.kwh })).filter((x) => x.lb > 0).sort((a, b) => b.lb - a.lb).slice(0, 3).map((x) => x.hour).sort((a, b) => a - b);
  // A plain finding: the evening hours (4 pm to 9 pm) against the average hour of this load.
  const evening = byHourOfDay.slice(16, 21).reduce((n, x) => ({ kwh: n.kwh + x.kwh, lb: n.lb + x.lb }), { kwh: 0, lb: 0 });
  const result = {
    ba, zone, kwh, lb, t: lb / LB_PER_T,
    months: [...months.values()].map((m) => ({ ...m, t: m.lb / LB_PER_T })),
    excluded: { hours: excludedHours, kwh: excludedKwh, share: allKwh ? excludedKwh / allKwh : 0 },
    flat: { lb: flatLb, t: flatLb / LB_PER_T, years: [...means.keys()].filter((y) => [...load.keys()].some((h) => new Date(h * HOUR).getUTCFullYear() === y)) },
    timing: { pct: pct(lb, flatLb), drivers },
    evening: evening.kwh && kwh ? { pct: pct(evening.lb / evening.kwh, lb / kwh) } : null,
    whyFactor: WHY_FACTOR(ba),
    caveat: CAVEAT,
  };
  if (egrid) {
    const elb = (allKwh / 1000) * egrid.lbPerMwh;
    result.egrid = { ...egrid, lb: elb, t: elb / LB_PER_T, pct: pct(lb, elb), label: egrid.unofficial ? 'unofficial, third-party build' : egrid.edition };
  }
  return result;
}

/** Fuels counted carbon-free in the grid's clean share; batteries and other storage are left out, and "Other" (which mixes geothermal, oil, and biomass) counts as not carbon-free. */
export const CLEAN = ['gen_nuc', 'gen_wat', 'gen_sun', 'gen_snb', 'gen_wnd', 'gen_wnb'];
const STORAGE = ['gen_bat', 'gen_ps', 'gen_oes', 'gen_ues'];
const FUEL_COLUMNS = ['gen_col', 'gen_ng', 'gen_nuc', 'gen_oil', 'gen_geo', 'gen_wat', 'gen_ps', 'gen_sun', 'gen_snb', 'gen_wnd', 'gen_wnb', 'gen_bat', 'gen_oes', 'gen_ues', 'gen_oth', 'gen_unk'];

/**
 * The carbon-free share of one hour's generation inside the region (production-based): nuclear, hydro, wind,
 * and solar over all positive generation, with storage left out of both.
 * @returns {number | null} null when EIA has no generation by fuel for the hour
 */
export function cleanShare(g) {
  let clean = 0;
  let total = 0;
  let any = false;
  for (const c of FUEL_COLUMNS) {
    const v = g?.[c];
    if (v === null || v === undefined) continue;
    any = true;
    if (STORAGE.includes(c) || v <= 0) continue;
    total += v;
    if (CLEAN.includes(c)) clean += v;
  }
  return any && total > 0 ? clean / total : null;
}

/**
 * Hourly against annual matching of clean supply (spec carbon/hourly-matching), and the combined score with
 * the grid's clean share in the unmatched hours.
 * @param {{load: Map<number, number>, supply: Map<number, number>, grid?: Map<number, any>, zone: string}} p kWh by UTC hour
 */
export function matchShares({ load, supply, grid, zone }) {
  let total = 0;
  let clean = 0;
  let matched = 0;
  let surplus = 0;
  let shortfall = 0;
  let unmatchedWithMix = 0;
  let unmatchedClean = 0;
  let unmatchedNoMix = 0;
  const shortByHour = new Array(24).fill(0);
  for (const [h, l] of load) {
    const s = supply.get(h) ?? 0;
    total += l;
    clean += s;
    matched += Math.min(l, s);
    surplus += Math.max(0, s - l);
    const short = Math.max(0, l - s);
    shortfall += short;
    if (short > 0) {
      shortByHour[utcToLocal(zone, h * HOUR).hour] += short;
      const share = grid ? cleanShare(grid.get(h)) : null;
      if (share === null) unmatchedNoMix += short;
      else { unmatchedWithMix += short; unmatchedClean += short * share; }
    }
  }
  const gridShare = unmatchedWithMix ? unmatchedClean / unmatchedWithMix : null;
  const hourly = total ? matched / total : 0;
  return {
    load: total, supply: clean, matched, surplus, shortfall, shortByHour,
    annualShare: total ? Math.min(1, clean / total) : 0,
    hourlyShare: hourly,
    // Combined: the matched share, plus the grid's clean share of the energy it supplied in unmatched hours.
    grid: grid ? { cleanShare: gridShare, unmatchedKwh: shortfall, noMixKwh: unmatchedNoMix, combined: total && gridShare !== null ? hourly + (shortfall * gridShare) / total : null } : null,
    label: DRAFT_LABEL,
    productionLabel: PRODUCTION_LABEL,
  };
}

/**
 * A flat block of clean supply on the load's hours: MW in every hour, or only the local clock hours [from, to).
 * @param {Iterable<number>} hours UTC hour starts @param {number} mw @param {{zone: string, from?: number, to?: number}} o local clock hours [from, to)
 */
export function flatBlock(hours, mw, { zone, from = 0, to = 24 }) {
  const out = new Map();
  for (const h of hours) {
    const hr = utcToLocal(zone, h * HOUR).hour;
    // The same start and end means all day; an end before the start wraps past midnight.
    const on = from === to || (from < to ? hr >= from && hr < to : hr >= from || hr < to);
    out.set(h, on ? mw * 1000 : 0);
  }
  return out;
}

const UNIT_KWH = { kWh: 1, MWh: 1000 };

/**
 * Read a clean supply profile: a timestamp column and an MWh or kWh column (spec carbon/hourly-matching,
 * "Supply profiles"). The unit comes from the header when it names one, otherwise from `unit`.
 * @param {string} text @param {{zone: string, basis: 'prevailing' | 'standard' | 'utc', unit?: 'kWh' | 'MWh'}} o
 */
export function readSupply(text, { zone, basis, unit }) {
  const rows = parseDelimited(text).rows.filter((r) => r.some((c) => String(c).trim()));
  if (rows.length < 3) return { status: 'refused', reason: 'The supply file needs a header and at least two rows.' };
  const header = rows[0].map((h) => String(h).toLowerCase());
  const at = header.findIndex((h) => /\b[km]wh\b/.test(h));
  const col = at >= 0 ? at : 1;
  const u = at >= 0 ? (/mwh/.test(header[at]) ? 'MWh' : 'kWh') : unit;
  if (!u) return { status: 'refused', reason: 'The header does not say MWh or kWh; choose the unit.' };
  const points = [];
  const bad = [];
  rows.slice(1).forEach((r, i) => {
    const ms = stamp(r[0], zone, basis);
    const v = Number(String(r[col]).replace(/,/g, ''));
    if (Number.isNaN(ms) || !Number.isFinite(v)) bad.push(i + 2); else points.push({ ms, kwh: Math.max(0, v * UNIT_KWH[u]) });
  });
  if (bad.length) return { status: 'refused', reason: `Rows ${bad.slice(0, 5).join(', ')}${bad.length > 5 ? ', …' : ''} have no readable time or value.` };
  points.sort((a, b) => a.ms - b.ms);
  const steps = [`Read ${points.length.toLocaleString('en-US')} values in ${u}${at >= 0 ? ' (from the header)' : ''}, stamped in ${basis === 'utc' ? 'UTC' : basis === 'standard' ? 'local standard time' : 'local prevailing time'}.`];
  if (u === 'MWh') steps.push('Converted MWh to kWh: each value × 1,000.');
  return { status: 'ok', points, steps, kwh: points.reduce((n, p) => n + p.kwh, 0) };
}

/** The standard-time month, day, and hour of a UTC hour in a zone: prevailing time less any daylight-saving hour. */
function standardFields(zone, ms) {
  const y = new Date(ms).getUTCFullYear();
  const std = Math.min(utcToLocal(zone, Date.UTC(y, 0, 1)).offsetMinutes, utcToLocal(zone, Date.UTC(y, 6, 1)).offsetMinutes);
  const d = new Date(ms + std * 60_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), dst: utcToLocal(zone, ms).offsetMinutes !== std };
}

/**
 * A supply profile on the load's hours. When it covers every hour of the load, each hour takes the supply
 * of the same UTC hour (sub-hourly values summed). Otherwise, as for a typical year, each load hour takes
 * the supply of the same month, day, and standard-time hour, February 28 standing in for February 29.
 * @param {Iterable<number>} loadHours UTC hour starts @param {{points: Array<{ms: number, kwh: number}>, steps: string[]}} supply @param {string} zone
 */
export function alignSupply(loadHours, supply, zone) {
  const hours = [...loadHours].sort((a, b) => a - b);
  const byHour = new Map();
  for (const p of supply.points) { const h = Math.floor(p.ms / HOUR); byHour.set(h, (byHour.get(h) ?? 0) + p.kwh); }
  const steps = [...supply.steps];
  const out = new Map();
  if (hours.every((h) => byHour.has(h))) {
    for (const h of hours) out.set(h, byHour.get(h));
    steps.push('The profile covers the load\'s hours, so each hour takes the supply of the same UTC hour.');
    return { supply: out, steps };
  }
  const typical = new Map();
  const years = new Set();
  for (const [h, kwh] of byHour) { const f = standardFields(zone, h * HOUR); const k = `${f.month}-${f.day}-${f.hour}`; typical.set(k, (typical.get(k) ?? 0) + kwh); years.add(f.year); }
  let leap = false;
  let dst = false;
  let missing = 0;
  for (const h of hours) {
    const f = standardFields(zone, h * HOUR);
    if (f.dst) dst = true;
    let day = f.day;
    if (f.month === 2 && day === 29) { day = 28; leap = true; }
    const v = typical.get(`${f.month}-${day}-${f.hour}`);
    if (v === undefined) missing++;
    out.set(h, v ?? 0);
  }
  steps.push(`The profile is from ${[...years].sort().join(' and ')}, not the load's dates, so each load hour takes the profile's value for the same month, day, and standard-time hour.`);
  if (dst) steps.push('Summer hours are shifted to daylight-saving time to match the meter.');
  if (leap) steps.push('February 28 is repeated for February 29.');
  if (missing) steps.push(`${missing.toLocaleString('en-US')} load hour${missing === 1 ? ' has' : 's have'} no matching profile hour and get no supply.`);
  return { supply: out, steps };
}

/** Linear-interpolation quantile of sorted values (the method numpy and R call type 7). */
export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

/**
 * Typical consumption-based intensity for each month and local prevailing clock hour over the years given
 * (spec carbon/cleanest-hours): median and interquartile range in lb/MWh. Both instances of the repeated
 * fall-back hour count toward their clock hour; the absent spring-forward hour adds nothing.
 * @param {Iterable<any>} rows EIA-930 shard rows @param {{zone: string, years: number[]}} o
 */
export function typicalHours(rows, { zone, years }) {
  const want = new Set(years);
  const cells = Array.from({ length: 12 }, () => Array.from({ length: 24 }, () => []));
  for (const r of rows) {
    if (r.intensity_consumed === null || r.intensity_consumed === undefined) continue;
    const l = utcToLocal(zone, r.hour * HOUR);
    if (!want.has(l.year)) continue;
    cells[l.month - 1][l.hour].push(r.intensity_consumed * 1000);
  }
  return cells.map((hours, m) => ({
    month: m + 1,
    hours: hours.map((v, hour) => {
      v.sort((a, b) => a - b);
      return { hour, n: v.length, median: quantile(v, 0.5), q1: quantile(v, 0.25), q3: quantile(v, 0.75) };
    }),
  }));
}

/** The cleanest and dirtiest two-hour windows of a month's typical day, by mean of the hourly medians; windows may wrap past midnight. */
export function windows(month) {
  const med = month.hours.map((h) => h.median);
  const pairs = med.map((v, h) => ({ from: h, to: (h + 2) % 24, mean: v === null || med[(h + 1) % 24] === null ? null : (v + med[(h + 1) % 24]) / 2 })).filter((p) => p.mean !== null);
  if (!pairs.length) return null;
  // Ties go to the earlier window.
  const by = (sign) => [...pairs].sort((a, b) => sign * (a.mean - b.mean) || a.from - b.from)[0];
  return { cleanest: by(1), dirtiest: by(-1) };
}

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const meanOver = (month, [from, to]) => {
  const hs = [];
  for (let h = from; h !== to; h = (h + 1) % 24) hs.push(h);
  const v = hs.map((h) => month.hours[h].median).filter((x) => x !== null);
  return v.length === hs.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/**
 * The attributed CO2 a shift of flexible load would change in a year (spec carbon/cleanest-hours, "Shift
 * estimate"): kWh a day, spread evenly over the current and the proposed local hours [from, to), priced at each
 * month's typical intensities and weighted by the month's days in a 365-day year.
 * @param {ReturnType<typeof typicalHours>} typical @param {{kwhPerDay: number, current: [number, number], proposed: [number, number]}} p
 */
export function shiftEstimate(typical, { kwhPerDay, current, proposed }) {
  let lb = 0;
  let days = 0;
  for (const m of typical) {
    const a = meanOver(m, current);
    const b = meanOver(m, proposed);
    if (a === null || b === null) continue;
    lb += (kwhPerDay / 1000) * (a - b) * DAYS[m.month - 1];
    days += DAYS[m.month - 1];
  }
  return { lb, t: lb / LB_PER_T, days, label: ATTRIBUTIONAL };
}

/**
 * A window's typical intensity over the year: the mean of its hours' medians in each month, weighted by the
 * month's days in a 365-day year (lb/MWh). Priced at this figure, a shift gives what shiftEstimate gives.
 * @param {Array<{month: number, hours: Array<{median: number | null}>}>} typical @param {[number, number]} window local hours [from, to)
 */
export function yearWindowMean(typical, window) {
  let sum = 0;
  let days = 0;
  for (const m of typical) {
    const v = meanOver(m, window);
    if (v === null) continue;
    sum += v * DAYS[m.month - 1];
    days += DAYS[m.month - 1];
  }
  return days ? sum / days : null;
}

/**
 * The latest three complete calendar years in a region's hours, newest last: years the data runs past, with
 * an intensity in at least half their hours. EIA leaves gaps (CAISO's 2024 lacks 96 hours), which show as a
 * smaller count in each typical hour rather than dropping the year.
 */
export function completeYears(rows, zone, count = 3) {
  const perYear = new Map();
  let last = -Infinity;
  for (const r of rows) {
    const y = utcToLocal(zone, r.hour * HOUR).year;
    if (y > last) last = y;
    if (r.intensity_consumed !== null && r.intensity_consumed !== undefined) perYear.set(y, (perYear.get(y) ?? 0) + 1);
  }
  const hoursIn = (y) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 8784 : 8760);
  return [...perYear].filter(([y, n]) => y < last && n >= hoursIn(y) / 2).map(([y]) => y).sort((a, b) => a - b).slice(-count);
}

export { LB_PER_T };
