// Weather normalization (add-weather-normalization): degree days from daily
// maximum and minimum temperature at any base, the open change-point model
// family (flat, heating-only, cooling-only, heating-plus-cooling) fitted on use
// per day across balance points from 30 to 90 °F, the sufficiency and
// disqualification rules of the open method documentation (CalTRACK 2.0,
// CC0; OpenDSM's PNRMSE alternative), and the three-part split of a change in
// use into weather, use, and the model's own miss on its baseline.

const DAY = 86_400_000;

/** Celsius to Fahrenheit. */
export const toF = (c) => (c * 9) / 5 + 32;

/**
 * Degree days for one day: the mean of the day's maximum and minimum against the base, the convention NOAA
 * and EIA state. A day with a maximum of 80 °F and a minimum of 56 °F has a mean of 68 °F: 3 cooling degree
 * days and none of heating at base 65 °F.
 */
export function degreeDays(maxF, minF, base) {
  const mean = (maxF + minF) / 2;
  return { hdd: Math.max(0, base - mean), cdd: Math.max(0, mean - base) };
}

/** The balance points searched: 30 to 90 °F every 3 °F (the documentation's widest spacing). */
export const BALANCE_POINTS = Array.from({ length: 21 }, (_, i) => 30 + i * 3);

/**
 * An observation: a day or a billing period, its use, and the daily mean temperatures (°F) of the days in it.
 * @typedef {{start: string, days: number, kwh: number, means: number[]}} Obs
 */

/** Weighted least squares on up to three columns by the normal equations. */
function wls(X, y, w) {
  const k = X[0].length;
  const A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let i = 0; i < y.length; i++) {
    for (let a = 0; a < k; a++) {
      for (let b = 0; b < k; b++) A[a][b] += w[i] * X[i][a] * X[i][b];
      A[a][k] += w[i] * X[i][a] * y[i];
    }
  }
  // Gaussian elimination with partial pivoting.
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j <= k; j++) A[r][j] -= f * A[c][j];
    }
  }
  return A.map((row, i) => row[k] / A[i][i]);
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const perDay = (o, base, kind) => mean(o.means.map((m) => (kind === 'hdd' ? Math.max(0, base - m) : Math.max(0, m - base))));

/**
 * Whether the period has enough weather of one kind at a base to measure a relationship: at least 10 days with
 * non-zero degree days, and at least 20 degree days a year.
 */
export function enoughWeather(obs, base, kind) {
  let nonzero = 0;
  let total = 0;
  let days = 0;
  for (const o of obs) for (const m of o.means) {
    const dd = kind === 'hdd' ? Math.max(0, base - m) : Math.max(0, m - base);
    if (dd > 0) nonzero++;
    total += dd;
    days++;
  }
  const perYear = days ? (total * 365) / days : 0;
  return { ok: nonzero >= 10 && perYear >= 20, nonzero, perYear };
}

/** One candidate fitted at given balance points. */
function fit(obs, type, bh, bc) {
  const rows = obs.map((o) => {
    const x = [1];
    if (type === 'hdd' || type === 'hdd_cdd') x.push(perDay(o, bh, 'hdd'));
    if (type === 'cdd' || type === 'hdd_cdd') x.push(perDay(o, bc, 'cdd'));
    return x;
  });
  const y = obs.map((o) => o.kwh / o.days);
  // A billing period weighs by its days; a day weighs one.
  const w = obs.map((o) => o.days);
  const beta = wls(rows, y, w);
  if (!beta) return null;
  const pred = rows.map((x) => x.reduce((n, v, i) => n + v * beta[i], 0));
  const sw = w.reduce((a, b) => a + b, 0);
  const ybar = y.reduce((n, v, i) => n + v * w[i], 0) / sw;
  const sse = y.reduce((n, v, i) => n + w[i] * (v - pred[i]) ** 2, 0);
  const sst = y.reduce((n, v, i) => n + w[i] * (v - ybar) ** 2, 0);
  const slopes = beta.length - 1;
  const n = obs.length;
  const r2 = sst > 0 ? 1 - sse / sst : 0;
  const adjR2 = n - slopes - 1 > 0 ? 1 - ((1 - r2) * (n - 1)) / (n - slopes - 1) : r2;
  const coef = { intercept: beta[0] };
  if (type === 'hdd' || type === 'hdd_cdd') coef.heating = beta[1];
  if (type === 'cdd' || type === 'hdd_cdd') coef.cooling = beta[beta.length - 1];
  return { type, heatingBalance: bh ?? null, coolingBalance: bc ?? null, coef, r2, adjR2, slopes };
}

/** The use a model predicts for an observation, in kWh: use per day at its weather, times its days. */
export function predict(model, o) {
  let upd = model.coef.intercept;
  if (model.coef.heating !== undefined) upd += model.coef.heating * perDay(o, model.heatingBalance, 'hdd');
  if (model.coef.cooling !== undefined) upd += model.coef.cooling * perDay(o, model.coolingBalance, 'cdd');
  return upd * o.days;
}

/** Linear-interpolation quantile of sorted values. */
const quantile = (s, q) => { const at = (s.length - 1) * q; const lo = Math.floor(at); return s[lo] + (s[Math.ceil(at)] - s[lo]) * (at - lo); };

/**
 * Fit quality on use per day: CV(RMSE) with the degrees of freedom the documentation uses (observations less
 * the slope terms; the intercept is not counted), the normalized mean bias error, and OpenDSM's
 * percentile-normalized RMSE (RMSE over the interquartile range of observed use per day).
 */
export function fitQuality(model, obs) {
  const y = obs.map((o) => o.kwh / o.days);
  const yhat = obs.map((o) => predict(model, o) / o.days);
  const n = y.length;
  const ybar = mean(y);
  const sse = y.reduce((s, v, i) => s + (v - yhat[i]) ** 2, 0);
  const cvrmse = ybar ? Math.sqrt(sse / Math.max(1, n - model.slopes)) / ybar : Infinity;
  const nmbe = ybar ? y.reduce((s, v, i) => s + (yhat[i] - v), 0) / (n * ybar) : 0;
  const sorted = [...y].sort((a, b) => a - b);
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const pnrmse = iqr > 0 ? Math.sqrt(sse / n) / iqr : Infinity;
  return { cvrmse, nmbe, pnrmse, words: cvrmse <= 0.25 ? 'closely' : cvrmse <= 0.5 ? 'fairly closely' : cvrmse <= 1 ? 'loosely' : 'poorly' };
}

/**
 * Sufficiency of a baseline (spec weather/baseline-model, "Data sufficiency rules"), each rule as a sentence
 * with the value it tested. Daily: 365 days, at most 10% of days missing use or temperature. Bills: at least
 * 11 periods after dropping any longer than 35 days (70 when the utility bills every two months).
 * @param {Obs[]} obs @param {{kind: 'daily' | 'bills', bimonthly?: boolean}} o
 */
export function sufficiency(obs, { kind, bimonthly = false }) {
  const checks = [];
  if (kind === 'daily') {
    if (!obs.length) return { ok: false, obs, checks: [{ ok: false, sentence: 'No days of use were found.' }] };
    const first = Date.parse(`${obs[0].start}T00:00:00Z`);
    const last = Date.parse(`${obs.at(-1).start}T00:00:00Z`);
    const span = Math.round((last - first) / DAY) + 1;
    const usable = obs.filter((o) => o.means.length === 1).length;
    const missing = span - usable;
    checks.push({ ok: span >= 365, sentence: span >= 365 ? `The baseline covers ${span.toLocaleString('en-US')} days, at least the year it needs.` : `A baseline needs a year of use: 365 days. This one has ${span.toLocaleString('en-US')}.` });
    checks.push({ ok: missing <= span * 0.1, sentence: `${missing.toLocaleString('en-US')} of ${span.toLocaleString('en-US')} days (${((missing / span) * 100).toFixed(1)}%) lack use or temperature; at most 10% may.` });
    return { ok: checks.every((c) => c.ok), obs: obs.filter((o) => o.means.length === 1), checks };
  }
  const limit = bimonthly ? 70 : 35;
  const kept = obs.filter((o) => o.days <= limit);
  const dropped = obs.length - kept.length;
  if (dropped) checks.push({ ok: true, sentence: `${dropped} billing period${dropped === 1 ? '' : 's'} longer than ${limit} days ${dropped === 1 ? 'was' : 'were'} left out.` });
  checks.push({ ok: kept.length >= 11, sentence: kept.length >= 11 ? `${kept.length} billing periods, at least the 11 a baseline needs.` : `A baseline from bills needs at least 11 billing periods. This one has ${kept.length}.` });
  const noTemp = kept.filter((o) => o.means.length < o.days * 0.9).length;
  checks.push({ ok: noTemp === 0, sentence: noTemp ? `${noTemp} billing period${noTemp === 1 ? ' has' : 's have'} temperatures for fewer than 90% of its days.` : 'Every billing period has temperatures for at least 90% of its days.' });
  return { ok: checks.every((c) => c.ok), obs: kept, checks };
}

const NAMES = { flat: 'flat (no weather term)', hdd: 'heating only', cdd: 'cooling only', hdd_cdd: 'heating and cooling' };

/**
 * The four candidates across the balance-point grid, negative coefficients and too little weather rejected,
 * and the highest adjusted R² selected (spec weather/baseline-model).
 * @param {Obs[]} obs a sufficient baseline
 */
export function selectModel(obs) {
  const candidates = [];
  const flat = fit(obs, 'flat');
  candidates.push({ ...flat, status: 'accepted' });
  const heatOk = BALANCE_POINTS.filter((b) => enoughWeather(obs, b, 'hdd').ok);
  const coolOk = BALANCE_POINTS.filter((b) => enoughWeather(obs, b, 'cdd').ok);
  const best = (fits, type, why) => {
    const ok = fits.filter(Boolean).filter((f) => (f.coef.heating ?? 1) >= 0 && (f.coef.cooling ?? 1) >= 0);
    if (!fits.length) return { type, status: 'rejected', reason: why };
    if (!ok.length) {
      const top = fits.filter(Boolean).sort((a, b) => b.adjR2 - a.adjR2)[0];
      return { ...top, status: 'rejected', reason: `a negative ${top.coef.heating < 0 ? 'heating' : 'cooling'} coefficient at every balance point, which is physically implausible` };
    }
    return { ...ok.sort((a, b) => b.adjR2 - a.adjR2 || (a.heatingBalance ?? 0) - (b.heatingBalance ?? 0) || (a.coolingBalance ?? 0) - (b.coolingBalance ?? 0))[0], status: 'accepted' };
  };
  candidates.push(best(heatOk.map((b) => fit(obs, 'hdd', b)), 'hdd', 'too little heating weather in the period to measure'));
  candidates.push(best(coolOk.map((b) => fit(obs, 'cdd', undefined, b)), 'cdd', 'too little cooling weather in the period to measure'));
  const pairs = heatOk.flatMap((bh) => coolOk.filter((bc) => bc >= bh).map((bc) => [bh, bc]));
  candidates.push(best(pairs.map(([bh, bc]) => fit(obs, 'hdd_cdd', bh, bc)), 'hdd_cdd', 'too little heating or cooling weather in the period to measure'));
  const accepted = candidates.filter((c) => c.status === 'accepted').sort((a, b) => b.adjR2 - a.adjR2);
  const selected = accepted[0];
  const quality = fitQuality(selected, obs);
  // Disqualified above CV(RMSE) 1.0 unless OpenDSM's alternative, PNRMSE below 1.6, passes.
  const disqualified = quality.cvrmse > 1 && !(quality.pnrmse < 1.6);
  return {
    selected, quality, disqualified, weatherDriven: selected.type !== 'flat' && !disqualified,
    candidates: candidates.map((c) => ({ ...c, name: NAMES[c.type], ...(c.status === 'accepted' && c !== selected ? { reason: `adjusted R² ${c.adjR2.toFixed(3)}, below the selected ${selected.adjR2.toFixed(3)}` } : {}) })),
    why: `The ${NAMES[selected.type]} model fits best: adjusted R² ${selected.adjR2.toFixed(3)}, the highest of the candidates that survived.`,
  };
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/**
 * The three-part split of a change in use (spec weather/change-explainer): the weather part (the model on the
 * comparison weather less the model on the baseline weather), the use part (the comparison's actual use less
 * the model on its weather), and the baseline fit part (the model on the baseline weather less the baseline's
 * actual use). The three always sum to the total change.
 * @param {any} model a selected model @param {Obs[]} baseline @param {Obs[]} comparison
 */
export function splitChange(model, baseline, comparison) {
  const actualB = sum(baseline.map((o) => o.kwh));
  const actualC = sum(comparison.map((o) => o.kwh));
  const predB = sum(baseline.map((o) => predict(model, o)));
  const predC = sum(comparison.map((o) => predict(model, o)));
  const total = actualC - actualB;
  const parts = { weather: predC - predB, use: actualC - predC, fit: predB - actualB };
  return { actualB, actualC, predB, predC, total, parts, normalizedChange: predC ? (actualC - predC) / predC : 0 };
}

/**
 * The band on a normalized change from the model's own error: residuals summed by calendar month (so days that
 * miss together count together), scaled to the comparison's months at 90% confidence, never below the ±10% a
 * well-fitted meter supports.
 * @param {any} model @param {Obs[]} baseline @param {number} predicted the comparison's predicted kWh
 */
export function changeBand(model, baseline, predicted, comparisonMonths = 12) {
  const byMonth = new Map();
  for (const o of baseline) {
    const k = o.start.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + (o.kwh - predict(model, o)));
  }
  const r = [...byMonth.values()];
  const rmse = r.length ? Math.sqrt(sum(r.map((x) => x * x)) / r.length) : 0;
  const band = predicted ? (1.645 * rmse * Math.sqrt(comparisonMonths)) / predicted : Infinity;
  return Math.max(0.1, band);
}

/** Whether a normalized change is a finding: at least 5% and outside the model's band. */
export function tooSmall(change, band) {
  return Math.abs(change) < Math.max(0.05, band);
}

/**
 * Coverage of a station's days over a period, and runs of missing days longer than the gap floor. The floor,
 * 7 days, is gridprims' own: the documentation's 6-hour limit is for hourly models.
 * @param {Set<string> | Map<string, any>} have ISO dates with both temperatures @param {string} from @param {string} to inclusive
 */
export const GAP_FLOOR_DAYS = 7;
export function coverage(have, from, to) {
  const gaps = [];
  let present = 0;
  let total = 0;
  let run = null;
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY) {
    const d = new Date(t).toISOString().slice(0, 10);
    total++;
    if (have.has(d)) { present++; if (run) { if (run.days > GAP_FLOOR_DAYS) gaps.push(run); run = null; } continue; }
    run = run ? { ...run, to: d, days: run.days + 1 } : { from: d, to: d, days: 1 };
  }
  if (run && run.days > GAP_FLOOR_DAYS) gaps.push(run);
  return { share: total ? present / total : 0, present, total, gaps };
}

/** The ordinary causes to check when use changed, strongest first; never a diagnosis. */
export const CAUSES = [
  'Added equipment, such as a space heater, a second refrigerator, or a dehumidifier',
  'A new appliance or an electric vehicle',
  'More people at home, or more hours at home',
  'Longer operating hours',
  'A failing thermostat or heating element',
  'A pool or spa pump',
  'A change in rate or in the billing period\'s length',
];

/**
 * Separate baselines before and after a stated change (solar, a heat pump, an electric vehicle, or an
 * occupancy change), never one model across it (spec weather/baseline-model, "Retrofits and solar split or
 * stop the baseline"). Each side is checked for sufficiency and says which fails.
 * @param {Obs[]} obs @param {string} date ISO date the change began @param {{kind: 'daily' | 'bills', bimonthly?: boolean, what: string}} o
 */
export function splitAtChange(obs, date, { kind, bimonthly, what }) {
  // A billing period that spans the date belongs to neither side.
  const end = (o) => new Date(Date.parse(`${o.start}T00:00:00Z`) + (o.days - 1) * DAY).toISOString().slice(0, 10);
  const before = obs.filter((o) => end(o) < date);
  const after = obs.filter((o) => o.start >= date);
  const spanning = obs.length - before.length - after.length;
  const side = (part, label) => {
    const s = sufficiency(part, { kind, bimonthly });
    return { label, sufficiency: s, model: s.ok ? selectModel(s.obs) : null };
  };
  return { date, what, before: side(before, `before the ${what}`), after: side(after, `after the ${what}`), spanning };
}

/** The published bases nearest a balance point (NCEI's 1991–2020 daily normals). */
export const NORMAL_HEATING_BASES = [40, 45, 50, 55, 57, 60, 65];
export const NORMAL_COOLING_BASES = [40, 45, 50, 55, 57, 60, 65, 70, 72];
const nearest = (bases, b) => bases.reduce((best, x) => (Math.abs(x - b) < Math.abs(best - b) ? x : best));
export const NORMALS_CAVEAT = 'The normal year is NOAA\'s published 1991–2020 daily normals, which come from a smoothed fit of daily mean temperature, not an average of thirty years of actual degree days, so the degree days we compute from the station\'s daily history will not match them exactly.';

/**
 * The selected model on the normal year: use per day at each calendar day's published normal degree days, at
 * the published base nearest the model's balance point, summed over 365 days (February 29 left out).
 * @param {any} model @param {Array<Record<string, any>>} normals one station's rows (month, day, htdd_<base>, cldd_<base>)
 */
export function normalYear(model, normals) {
  const hb = model.coef.heating !== undefined ? nearest(NORMAL_HEATING_BASES, model.heatingBalance) : null;
  const cb = model.coef.cooling !== undefined ? nearest(NORMAL_COOLING_BASES, model.coolingBalance) : null;
  let kwh = 0;
  let hdd = 0;
  let cdd = 0;
  for (const r of normals) {
    if (r.month === 2 && r.day === 29) continue;
    const h = hb === null ? 0 : r[`htdd_${hb}`] ?? 0;
    const c = cb === null ? 0 : r[`cldd_${cb}`] ?? 0;
    kwh += model.coef.intercept + (model.coef.heating ?? 0) * h + (model.coef.cooling ?? 0) * c;
    hdd += h;
    cdd += c;
  }
  return { kwh, heatingBase: hb, coolingBase: cb, hdd, cdd, caveat: NORMALS_CAVEAT };
}

/** Degree days over a set of daily means at a base, for comparing a year with the normal year. */
export function totalDegreeDays(obs, base, kind) {
  return sum(obs.flatMap((o) => o.means.map((m) => (kind === 'hdd' ? Math.max(0, base - m) : Math.max(0, m - base)))));
}
