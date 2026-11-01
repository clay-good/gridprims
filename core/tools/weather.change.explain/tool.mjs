// weather.change.explain: was the change in my bills the weather? Billing
// periods from 12 to 24 bills and a nearby station's daily temperatures, the
// CalTRACK billing-period model on the earlier bills, and the latest year's
// change split into the weather part, the use part, and the model's own miss
// on its baseline (add-weather-normalization: change explainer).

import { parsePeriods } from '../../lib/bill-entry.mjs';
import { CAUSES, changeBand, normalYear, selectModel, splitAtChange, splitChange, sufficiency, tooSmall, totalDegreeDays } from '../../lib/weather-model.mjs';

const DAY = 86_400_000;
const kwh = (x) => `${Math.round(x).toLocaleString('en-US')} kWh`;
const signed = (x) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x)).toLocaleString('en-US')} kWh`;
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const clean = (x) => (Math.abs(x) < 1e-6 ? 0 : x);

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

const CHANGES = ['solar', 'heat pump', 'electric vehicle', 'occupancy change'];

/** @param {{periods: string, weather: string, change: string}} v change: "none", or "heat pump from 2025-10-01" */
export function compute({ periods: text, weather, change: changeText }) {
  const cm = /^\s*(none|solar|heat pump|electric vehicle|occupancy change)(?:\s+(?:from|on|since)\s+(\d{4}-\d{2}-\d{2}))?\s*$/i.exec(changeText ?? '');
  if (!cm || (cm[1].toLowerCase() !== 'none' && !cm[2])) return { status: 'invalid', errors: [{ field: 'change', message: `Enter none, or the change and the date it began, as heat pump from 2025-10-01. Changes: ${CHANGES.join(', ')}.` }] };
  const change = cm[1].toLowerCase();
  const changeDate = cm[2];
  const parsed = parsePeriods(text);
  if (parsed.errors.length) return { status: 'invalid', errors: parsed.errors.map((message) => ({ field: 'periods', message })) };
  const missingKwh = parsed.periods.filter((p) => p.kwh === null).length;
  if (missingKwh) return { status: 'invalid', errors: [{ field: 'periods', message: `${missingKwh} billing period${missingKwh === 1 ? ' has' : 's have'} no kWh.` }] };
  if (parsed.periods.length < 12) return { status: 'invalid', errors: [{ field: 'periods', message: `Enter 12 to 24 billing periods; there are ${parsed.periods.length}.` }] };
  const w = readWeather(weather);
  if (w.error) return { status: 'invalid', errors: [{ field: 'weather', message: w.error }] };
  if (!w.means.size) return { status: 'invalid', errors: [{ field: 'weather', message: 'Choose a weather station, or enter its daily mean temperatures.' }] };
  const obs = [...parsed.periods].sort((a, b) => (a.start < b.start ? -1 : 1)).map((p) => {
    const from = Date.parse(`${p.start}T00:00:00Z`);
    const days = Math.round((Date.parse(`${p.end}T00:00:00Z`) - from) / DAY) + 1;
    const means = [];
    for (let i = 0; i < days; i++) { const t = w.means.get(iso(from + i * DAY)); if (t !== undefined) means.push(t); }
    return { start: p.start, end: p.end, days, kwh: p.kwh, means };
  });
  const station = w.station ? `${w.station.name} (${w.station.id})` : 'the temperatures entered';
  const steps = [`Billing periods: ${obs.length}, from ${obs[0].start} to ${obs.at(-1).end}, labeled as bills, not interval data. Interval data from your utility gives a tighter answer.`, `Weather: daily mean temperatures at ${station}.`];

  // A stated retrofit, solar, vehicle, or occupancy change: separate baselines, never one across it.
  if (change !== 'none') {
    const s = splitAtChange(obs, changeDate, { kind: 'bills', what: change });
    const cap = (x) => x[0].toUpperCase() + x.slice(1);
    const side = (x) => (x.model ? `${cap(x.label)}: the ${x.model.candidates.find((c) => c.type === x.model.selected.type).name} model, ${kwh(x.sufficiency.obs.reduce((n, o) => n + o.kwh, 0))} over ${x.sufficiency.obs.length} periods.` : `${cap(x.label)}: no model, because ${x.sufficiency.checks.filter((c) => !c.ok).map((c) => c.sentence).join(' ')}`);
    return { status: 'refused', reason: `A ${change} began on ${changeDate}, so one model cannot span it. ${side(s.before)} ${side(s.after)}${s.spanning ? ` ${s.spanning} billing period${s.spanning === 1 ? ' spans' : 's span'} the date and ${s.spanning === 1 ? 'is' : 'are'} left out.` : ''}` };
  }

  // The latest year is compared with the bills before it.
  const lastEnd = Date.parse(`${obs.at(-1).end}T00:00:00Z`);
  const cut = iso(lastEnd - 364 * DAY);
  const comparison = obs.filter((o) => o.start >= cut);
  const suff = sufficiency(obs.filter((o) => o.start < cut), { kind: 'bills' });
  steps.push(...suff.checks.map((c) => c.sentence));
  if (!suff.ok) return { status: 'refused', reason: `There is not enough baseline before the latest year. ${suff.checks.filter((c) => !c.ok).map((c) => c.sentence).join(' ')}` };
  const m = selectModel(suff.obs);
  steps.push(...m.candidates.map((c) => `${c.name}: ${c.status === 'accepted' ? `adjusted R² ${c.adjR2.toFixed(3)}${c.heatingBalance ? `, heating from ${c.heatingBalance} °F` : ''}${c.coolingBalance ? `, cooling from ${c.coolingBalance} °F` : ''}` : 'rejected'}${c.reason ? `: ${c.reason}` : ''}.`), m.why);
  steps.push(`Fit: CV(RMSE) ${m.quality.cvrmse.toFixed(2)}, normalized mean bias error ${pct(m.quality.nmbe)}; the model tracks the meter ${m.quality.words}.`);
  if (m.disqualified) return { status: 'refused', reason: `The use is too irregular to separate weather from other causes: CV(RMSE) ${m.quality.cvrmse.toFixed(2)} is above 1.0, and the alternative test (PNRMSE ${m.quality.pnrmse.toFixed(2)}) is not below 1.6.` };
  if (m.selected.type === 'flat') return { status: 'refused', reason: 'Weather does not explain this use over this period: the model with no weather term fits best. Compare the two years directly instead.' };
  if (m.selected.type === 'cdd') steps.push('Heating does not show in this electricity use: it may be gas, oil, or another fuel.');

  const s = splitChange(m.selected, suff.obs, comparison);
  const band = changeBand(m.selected, suff.obs, s.predC, comparison.length);
  const small = tooSmall(s.normalizedChange, band);
  steps.push(
    `Weather part = the model on the latest year's weather − the model on the baseline's weather = ${kwh(s.predC)} − ${kwh(s.predB)} = ${signed(s.parts.weather)}.`,
    `Use part = the latest year's actual use − the model on its weather = ${kwh(s.actualC)} − ${kwh(s.predC)} = ${signed(s.parts.use)}.`,
    `Baseline fit part = the model on the baseline's weather − the baseline's actual use = ${kwh(s.predB)} − ${kwh(s.actualB)} = ${signed(s.parts.fit)}: the model's own miss on the bills it was fitted to.`,
    `${signed(s.parts.weather)} + ${signed(s.parts.use)} + ${signed(s.parts.fit)} = ${signed(s.total)}, the total change.`,
    `The model's band on the use change is ±${pct(band)}; a well-fitted meter supports roughly 10% to 20% accuracy on an annual normalized change, and nothing below 5% is a finding.`,
  );
  if (s.parts.use > 0 && !small) steps.push(`Things to check, most common first: ${CAUSES.join('; ')}. These are things to look at, not a diagnosis.`);
  let normal = null;
  if (w.normals.length) {
    normal = normalYear(m.selected, w.normals);
    const kind = m.selected.coef.heating !== undefined ? 'hdd' : 'cdd';
    const base = kind === 'hdd' ? normal.heatingBase : normal.coolingBase;
    const actualDd = totalDegreeDays(comparison, base, kind);
    const normalDd = kind === 'hdd' ? normal.hdd : normal.cdd;
    steps.push(`The latest year had ${Math.round(actualDd).toLocaleString('en-US')} ${kind === 'hdd' ? 'heating' : 'cooling'} degree days at base ${base} °F against ${Math.round(normalDd).toLocaleString('en-US')} in the normal year (${pct(normalDd ? (actualDd - normalDd) / normalDd : 0)}). In a normal-weather year this home would use about ${kwh(normal.kwh)}.`, normal.caveat);
  }
  const weatherMatters = Math.abs(s.parts.weather) >= Math.abs(s.total) * 0.1;
  const sentence = small
    ? (weatherMatters
      ? `About ${kwh(Math.abs(s.parts.weather))} of the ${kwh(Math.abs(s.total))} change was the weather; the rest is too small to tell from the model's own error.`
      : `The change is too small to tell from the model's own error: the use part is ${pct(s.normalizedChange)} against a band of ±${pct(band)}.`)
    : (weatherMatters
      ? `About ${kwh(Math.abs(s.parts.weather))} of the ${kwh(Math.abs(s.total))} change was the weather, and about ${kwh(Math.abs(s.parts.use))} was something else.`
      : `The weather was about the same; the change came from how much power was used: about ${kwh(Math.abs(s.parts.use))} ${s.parts.use >= 0 ? 'more' : 'less'}.`);
  return {
    status: 'ok',
    // A part that is zero but for floating-point noise reads 0, not −0.
    outputs: { total: clean(s.total), weather: clean(s.parts.weather), use: clean(s.parts.use), fit: clean(s.parts.fit), usePct: s.normalizedChange * 100, band: band * 100, normalKwh: normal ? normal.kwh : undefined },
    sentence: () => sentence,
    steps,
  };
}
