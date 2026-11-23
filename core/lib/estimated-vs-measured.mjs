// How far our estimated hourly carbon sits from what the monitors measured
// (add-measured-plant-emissions: estimated-vs-measured). The estimate is EIA's:
// hourly generation by fuel times annual average emission factors. The
// measurement is EPA's: continuous monitors on large fossil units.
//
// The two are only comparable if we compare the same thing. For each region and
// year we take the monitored units' own gross load, fuel by fuel and hour by
// hour, price it with the per-fuel factors EIA's own published series implies,
// and set that beside what those units measured. Nothing is scaled up to the
// whole fleet, and the monitored share of the region's generation travels with
// every figure.

/** The fuel categories EIA-930 reports generation under, and the measured load column for each. */
export const FUELS = [
  { id: 'col', gen: 'gen_col', load: 'load_col_mwh' },
  { id: 'ng', gen: 'gen_ng', load: 'load_ng_mwh' },
  { id: 'oil', gen: 'gen_oil', load: 'load_oil_mwh' },
  { id: 'oth', gen: 'gen_oth', load: 'load_oth_mwh' },
];
/** Fuels EIA prices at zero carbon; they stay in the fit so the factors are not inflated by clean hours. */
const CLEAN_GEN = ['gen_nuc', 'gen_wat', 'gen_ps', 'gen_sun', 'gen_snb', 'gen_wnd', 'gen_wnb', 'gen_geo', 'gen_bat', 'gen_oes', 'gen_ues', 'gen_unk'];

/** Our own floor: under this share of a region's generation, the comparison says nothing about the estimate. */
export const COVERAGE_FLOOR = 0.4;

/**
 * Our own bar for the fit that recovers EIA's per-fuel factors. Under it, the
 * factors are not EIA's method as we read it, so the difference would be our
 * own fitting error, not the estimate's error, and is not published as one.
 */
export const MIN_FIT_R2 = 0.99;

/**
 * How much more of a fuel the monitors may measure than EIA reports the region
 * generated from it before we call the two publishers' regions different. A
 * monitored unit's gross load runs a few percent above its net generation, so
 * some headroom is normal; a quarter more is not.
 */
export const GROSS_ALLOWANCE = 1.25;

/**
 * Least squares by modified Gram-Schmidt, which drops a column that adds
 * nothing: a fuel a region never burns, or one whose generation never moves
 * apart from another's. A dropped column's coefficient comes back null rather
 * than as a number the data cannot support.
 * @param {number[][]} x rows of regressors @param {number[]} y
 * @param {{tolerance?: number}} [o]
 * @returns {{beta: Array<number | null>, rmse: number, r2: number, n: number, dropped: number[]}}
 */
export function leastSquares(x, y, { tolerance = 1e-8 } = {}) {
  const n = x.length;
  const width = x[0]?.length ?? 0;
  const kept = [];
  const q = []; // orthonormal basis, one Float64Array per kept column
  const r = []; // r[p][kept index] coefficients
  const dropped = [];
  for (let j = 0; j < width; j++) {
    const v = Float64Array.from({ length: n }, (_, i) => x[i][j]);
    const norm0 = Math.hypot(...[...v].slice(0, 0)) || Math.sqrt(v.reduce((a, b) => a + b * b, 0));
    const coef = new Float64Array(q.length);
    for (let p = 0; p < q.length; p++) {
      let dot = 0;
      for (let i = 0; i < n; i++) dot += q[p][i] * v[i];
      coef[p] = dot;
      for (let i = 0; i < n; i++) v[i] -= dot * q[p][i];
    }
    const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0));
    if (!(norm > tolerance * Math.max(norm0, 1e-12))) { dropped.push(j); continue; }
    for (let i = 0; i < n; i++) v[i] /= norm;
    q.push(v);
    r.push({ coef, norm });
    kept.push(j);
  }
  // Back substitution on R beta = Q'y, over the kept columns.
  const qty = q.map((qi) => { let d = 0; for (let i = 0; i < n; i++) d += qi[i] * y[i]; return d; });
  const solved = new Float64Array(kept.length);
  for (let p = kept.length - 1; p >= 0; p--) {
    let acc = qty[p];
    for (let s2 = p + 1; s2 < kept.length; s2++) acc -= r[s2].coef[p] * solved[s2];
    solved[p] = acc / r[p].norm;
  }
  const beta = Array.from({ length: width }, (_, j) => (kept.includes(j) ? solved[kept.indexOf(j)] : null));
  const mean = y.reduce((a, b) => a + b, 0) / (n || 1);
  let sse = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    const fit = kept.reduce((acc, j, p) => acc + x[i][j] * solved[p], 0);
    sse += (y[i] - fit) ** 2;
    sst += (y[i] - mean) ** 2;
  }
  return { beta, rmse: Math.sqrt(sse / (n || 1)), r2: sst === 0 ? NaN : 1 - sse / sst, n, dropped };
}

/**
 * The per-fuel emission factors EIA's own published series implies for a region
 * and year, in metric tons of carbon dioxide per MWh generated. EIA does not
 * publish the factors beside the hourly file; it publishes the hourly carbon
 * dioxide it computed from them, so they are recovered from that, and the fit's
 * own error is reported so a bad fit is never used as if it were EIA's number.
 * @param {Array<Record<string, number>>} grid EIA-930 hourly rows for one region and year
 * @returns {{factors: Record<string, number | null>, rmse: number, r2: number, hours: number, mean: number}}
 */
export function impliedFactors(grid) {
  // An hour EIA published no carbon dioxide for cannot teach the fit anything. A fuel column EIA
  // leaves empty for a region is that region reporting none of it, and counts as zero generation.
  const rows = grid.filter((r) => typeof r.co2_generated === 'number');
  const columns = [...FUELS.map((f) => f.gen), ...CLEAN_GEN];
  const x = rows.map((r) => columns.map((c) => r[c] ?? 0));
  const y = rows.map((r) => r.co2_generated);
  const { beta, rmse, r2, n, dropped } = leastSquares(x, y);
  // A negative emission factor is not a thing a fuel can have: where the fit lands below zero, on a
  // fuel whose generation barely moves, the factor is held at zero and said to be held.
  const clamped = [];
  const factors = Object.fromEntries(columns.map((c, j) => {
    if (beta[j] !== null && beta[j] < 0) { clamped.push(c); return [c, 0]; }
    return [c, beta[j]];
  }));
  const mean = y.reduce((a, b) => a + b, 0) / (n || 1);
  return { factors, rmse, r2, hours: n, mean, clamped, dropped: dropped.map((j) => columns[j]) };
}

/**
 * A zone's standard-time offset from UTC in hours (EST is -5), with no
 * daylight saving in it. Used to read a UTC hour back as the local clock hour
 * where a region's own plants and customers are, for "by hour of the day".
 */
export function standardOffsetHours(zone, year = 2025) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(Date.UTC(year, 0, 15, 12));
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) + Number(m[3]) / 60) : 0;
}

/** The clock hour, 0 to 23, a UTC hour number falls on in a zone's standard time. */
export const localHourOf = (utcHour, offsetHours) => ((Math.round(utcHour + offsetHours) % 24) + 24) % 24;

/** The calendar month, 1 to 12, a UTC hour number falls in, on the zone's standard clock. */
export const localMonthOf = (utcHour, offsetHours) => new Date((utcHour + offsetHours) * 3_600_000).getUTCMonth() + 1;

const sum = (rows, f) => rows.reduce((n, r) => n + (f(r) ?? 0), 0);
const share = (a, b) => (b > 0 ? a / b : null);

/**
 * One region and year compared like for like.
 * @param {{
 *   region: string, year: number, zone: string,
 *   grid: Array<Record<string, number>>, measured: Array<Record<string, any>>,
 *   factors?: Record<string, number | null>, floor?: number, minR2?: number, grossAllowance?: number,
 * }} o grid: EIA-930 hours for the region and year; measured: EPA's regional hours
 * @returns {any} the comparison, or a record saying why there is none
 */
export function compareRegionYear({ region, year, zone, grid, measured, factors, floor = COVERAGE_FLOOR, minR2 = MIN_FIT_R2, grossAllowance = GROSS_ALLOWANCE }) {
  // The factors are fitted on the year's own hours. EIA's factors are annual averages, and they move
  // from year to year, so a fit spanning years would price one year's load with another's mix. The
  // neighbouring year's hours may still be passed in, for matching the hours around the turn of the year.
  const yearHours = grid.filter((r) => r.year === undefined || r.year === year);
  const fit = factors ? { factors, rmse: null, r2: null, hours: grid.length, clamped: [], dropped: [] } : impliedFactors(yearHours);
  const offset = standardOffsetHours(zone, year);
  // Both sides are on the same clock already: EPA's records were moved to UTC, state by state, when
  // the regional hours were built, and EIA publishes in UTC. Only the reading back into a local clock
  // hour, for "by hour of the day", uses the region's own standard offset.
  const byHour = new Map(grid.map((r) => [r.hour, r]));
  const priced = [];
  let unmatchedHours = 0;
  for (const m of measured) {
    if (!byHour.has(m.hour)) { unmatchedHours++; continue; }
    const estimated = FUELS.reduce((n, f) => n + (m[f.load] ?? 0) * (fit.factors[f.gen] ?? 0), 0);
    priced.push({ ...m, hour_local: localHourOf(m.hour, offset), month_local: localMonthOf(m.hour, offset), estimated_tonnes: estimated });
  }
  const measuredTonnes = sum(priced, (r) => r.co2_tonnes);
  const estimatedTonnes = sum(priced, (r) => r.estimated_tonnes);
  const monitoredMwh = sum(priced, (r) => r.gross_load_mwh);
  // The region's own generation for the year only: the caller may pass the next year's hours as well,
  // so the last hours of the year, which fall in the next year in UTC, can still be matched.
  const regionMwh = sum(grid.filter((r) => r.year === undefined || r.year === year), (r) => r.net_generation);
  const coverage = share(monitoredMwh, regionMwh);
  const fitOk = factors ? true : typeof fit.r2 === 'number' && fit.r2 >= minR2;
  // The two publishers must agree about which region these units are in. Where the monitored units
  // burned more of a fuel than EIA says the whole region generated from it, or EIA reports none of
  // that fuel at all, the mapping disagrees and there is nothing to compare: a federal hydro
  // marketer's plants, or a neighbour's units placed here by eGRID and there by EIA.
  const yearGrid = yearHours;
  const fuels = FUELS.map((f) => {
    const mine = sum(priced, (r) => r[f.load]);
    const theirs = sum(yearGrid, (r) => r[f.gen]);
    return { id: f.id, monitoredMwh: mine, regionMwh: theirs, factor: fit.factors[f.gen] ?? null, ratio: theirs > 0 ? mine / theirs : null };
  });
  const fuelMismatch = fuels.filter((f) => f.monitoredMwh > monitoredMwh * 0.01 && (f.factor === null || f.ratio === null || f.ratio > grossAllowance)).map((f) => f.id);
  const mappingOk = fuelMismatch.length === 0;
  const group = (key) => {
    const m = new Map();
    for (const r of priced) {
      const g = m.get(key(r)) ?? m.set(key(r), { key: key(r), measured_tonnes: 0, estimated_tonnes: 0, gross_load_mwh: 0, hours: 0 }).get(key(r));
      g.measured_tonnes += r.co2_tonnes ?? 0;
      g.estimated_tonnes += r.estimated_tonnes;
      g.gross_load_mwh += r.gross_load_mwh ?? 0;
      g.hours++;
    }
    return [...m.values()].sort((a, b) => a.key - b.key).map((g) => ({ ...g, difference: share(g.estimated_tonnes - g.measured_tonnes, g.measured_tonnes) }));
  };
  return {
    region, year, zone, standardOffsetHours: offset,
    hours: priced.length, unmatchedHours,
    measuredTonnes, estimatedTonnes,
    differenceTonnes: estimatedTonnes - measuredTonnes,
    difference: share(estimatedTonnes - measuredTonnes, measuredTonnes),
    monitoredMwh, regionMwh, coverage,
    // Under the floor the difference is not reported as the estimate's error: it would mostly measure
    // the generation the monitors never saw. The floor is ours, not EPA's and not EIA's. Nor is it
    // reported where the fit that recovers EIA's factors is poor, because then the gap is our fitting error.
    informative: coverage !== null && coverage >= floor && fitOk && mappingOk, floor, minR2, grossAllowance, fitOk, mappingOk, fuelMismatch, fuels,
    uninformativeBecause: [...(coverage === null || coverage < floor ? ['coverage'] : []), ...(fitOk ? [] : ['fit']), ...(mappingOk ? [] : ['mapping'])],
    byMonth: group((r) => r.month_local),
    // By the local standard hour EPA reports, so "summer evenings" means evenings where the units are.
    byHourOfDay: group((r) => r.hour_local),
    fit: { rmse: fit.rmse, r2: fit.r2, hours: fit.hours, factors: fit.factors, clamped: fit.clamped ?? [], dropped: fit.dropped ?? [] },
  };
}
