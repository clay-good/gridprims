// Weather normalization (add-weather-normalization): degree days at any base,
// the four candidates with the balance-point search and rejections, the
// sufficiency and weather-variation rules, fit reporting and disqualification,
// the three-part split, the band and the too-small rule, gaps, and stations.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE_POINTS, changeBand, coverage, degreeDays, enoughWeather, selectModel, splitChange, sufficiency, tooSmall } from '../../../core/lib/weather-model.mjs';
import { dailyMeans, miles, rankStations } from '../../../core/lib/weather-stations.mjs';

const DAY = 86_400_000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
/** A year of days from `from`, each with a mean temperature from a seasonal curve (°F). */
function year(from, { mean = 55, swing = 25, days = 365 } = {}) {
  return Array.from({ length: days }, (_, i) => ({ start: iso(Date.parse(`${from}T00:00:00Z`) + i * DAY), days: 1, means: [mean - swing * Math.cos((2 * Math.PI * i) / 365)] }));
}
/** Use per day: base + heating slope below bh + cooling slope above bc, with a small deterministic wobble. */
const use = (obs, { base = 20, heat = 0, bh = 60, cool = 0, bc = 70, wobble = 0.5 } = {}) => obs.map((o, i) => ({ ...o, kwh: base + heat * Math.max(0, bh - o.means[0]) + cool * Math.max(0, o.means[0] - bc) + wobble * Math.sin(i * 1.7) }));

test('base 65: a day of 80 and 56 °F has a mean of 68 °F, 3 cooling degree days and no heating', () => {
  assert.deepEqual(degreeDays(80, 56, 65), { hdd: 0, cdd: 3 });
});

test('the balance points run 30 to 90 °F, 3 °F apart', () => {
  assert.equal(BALANCE_POINTS[0], 30);
  assert.equal(BALANCE_POINTS.at(-1), 90);
  assert.ok(BALANCE_POINTS.every((b, i) => !i || b - BALANCE_POINTS[i - 1] <= 3));
});

test('a gas-heated home: winter flat, summer rising, so cooling only is selected', () => {
  const obs = use(year('2025-01-01'), { cool: 1.2, bc: 66 });
  const m = selectModel(obs);
  assert.equal(m.selected.type, 'cdd');
  assert.equal(m.selected.coolingBalance, 66);
  assert.ok(Math.abs(m.selected.coef.cooling - 1.2) < 0.02);
  assert.equal(m.weatherDriven, true);
  assert.equal(m.candidates.length, 4);
  assert.match(m.why, /cooling only model fits best/);
});

test('an electric-heated home in a mixed climate selects heating and cooling', () => {
  const m = selectModel(use(year('2025-01-01'), { heat: 0.9, bh: 57, cool: 1.1, bc: 72 }));
  assert.equal(m.selected.type, 'hdd_cdd');
  assert.deepEqual([m.selected.heatingBalance, m.selected.coolingBalance], [57, 72]);
});

test('a negative coefficient is rejected as implausible and named', () => {
  // Use falls as it gets hotter: every cooling fit has a negative slope.
  const obs = year('2025-01-01').map((o, i) => ({ ...o, kwh: 40 - 0.3 * Math.max(0, o.means[0] - 50) + 0.4 * Math.sin(i) }));
  const m = selectModel(obs);
  const cdd = m.candidates.find((c) => c.type === 'cdd');
  assert.equal(cdd.status, 'rejected');
  assert.match(cdd.reason, /negative cooling coefficient/);
});

test('weather does not explain an apartment with electric cooking only: flat wins', () => {
  const obs = year('2025-01-01').map((o, i) => ({ ...o, kwh: 9 + ((i * 7919) % 13) / 4 }));
  const m = selectModel(obs);
  assert.equal(m.selected.type, 'flat');
  assert.equal(m.weatherDriven, false);
});

test('280 days is not a baseline: the message names the days found', () => {
  const s = sufficiency(year('2025-01-01', { days: 280 }).map((o) => ({ ...o, kwh: 1 })), { kind: 'daily' });
  assert.equal(s.ok, false);
  assert.match(s.checks[0].sentence, /A baseline needs a year of use: 365 days\. This one has 280\./);
});

test('bills: 11 periods are needed, and a period over 35 days is dropped', () => {
  const bills = Array.from({ length: 12 }, (_, i) => ({ start: `2025-${String(i + 1).padStart(2, '0')}-01`, days: i === 3 ? 40 : 30, kwh: 900, means: new Array(i === 3 ? 40 : 30).fill(50) }));
  const s = sufficiency(bills, { kind: 'bills' });
  assert.equal(s.obs.length, 11);
  assert.equal(s.ok, true);
  assert.match(s.checks[0].sentence, /1 billing period longer than 35 days was left out/);
  assert.equal(sufficiency(bills.slice(0, 10), { kind: 'bills' }).ok, false);
});

test('a mild climate: 14 heating degree days in the year is too little to measure', () => {
  const obs = year('2025-01-01', { mean: 72, swing: 4 });
  const w = enoughWeather(obs, 65, 'hdd');
  assert.equal(w.ok, false);
  assert.ok(w.perYear < 20);
  // Where no balance point up to 90 °F finds heating weather, there is no heating candidate at all.
  assert.match(selectModel(year('2025-01-01', { mean: 100, swing: 3 }).map((o, i) => ({ ...o, kwh: 10 + Math.sin(i) }))).candidates.find((c) => c.type === 'hdd').reason, /too little heating weather/);
});

test('fit quality in numbers and words, and a poor fit disqualified with no split', () => {
  const good = selectModel(use(year('2025-01-01'), { cool: 1.2, bc: 66 }));
  assert.ok(good.quality.cvrmse < 0.25);
  assert.equal(good.quality.words, 'closely');
  // Use that swings wildly regardless of weather.
  const wild = year('2025-01-01').map((o, i) => ({ ...o, kwh: i % 9 === 0 ? 400 : 2 }));
  const m = selectModel(wild);
  assert.ok(m.quality.cvrmse > 1);
  assert.ok(m.quality.pnrmse >= 1.6);
  assert.equal(m.disqualified, true);
  assert.equal(m.weatherDriven, false);
});

test('the three parts always sum to the total change: a colder comparison winter', () => {
  const base = use(year('2024-01-01'), { heat: 1, bh: 60 });
  const model = selectModel(base).selected;
  // The comparison year is 6 °F colder and uses 1 kWh a day more for other reasons.
  const comp = use(year('2025-01-01', { mean: 49 }), { heat: 1, bh: 60, base: 21 });
  const s = splitChange(model, base, comp);
  assert.ok(Math.abs(s.parts.weather + s.parts.use + s.parts.fit - s.total) < 0.01);
  assert.ok(s.parts.weather > 0, 'the colder winter adds use');
  assert.ok(Math.abs(s.parts.use - 365) < 40, `about 365 kWh came from something else: ${s.parts.use}`);
});

test('a 3% change inside a ±12% band is too small to call; the band never goes below 10%', () => {
  assert.equal(tooSmall(0.03, 0.12), true);
  assert.equal(tooSmall(0.2, 0.12), false);
  assert.equal(tooSmall(0.04, 0), true, 'nothing under 5% is a finding');
  const base = use(year('2024-01-01'), { cool: 1, bc: 66, wobble: 0 });
  assert.equal(changeBand(selectModel(base).selected, base, 10_000), 0.1);
});

test('a station missing 9 days in a row is reported against the 7-day floor', () => {
  const have = new Set(Array.from({ length: 60 }, (_, i) => iso(Date.UTC(2025, 0, 1) + i * DAY)).filter((d) => !(d >= '2025-01-10' && d <= '2025-01-18')));
  const c = coverage(have, '2025-01-01', '2025-03-01');
  assert.deepEqual(c.gaps, [{ from: '2025-01-10', to: '2025-01-18', days: 9 }]);
  assert.equal(c.present, 51);
});

test('stations ranked by distance, and flagged values left out of daily means', () => {
  // Phoenix Sky Harbor and Tucson from downtown Phoenix.
  const stations = [{ station: 'USW00023160', lat: 32.1313, lon: -110.9552 }, { station: 'USW00023183', lat: 33.4278, lon: -112.0039 }];
  const r = rankStations({ lat: 33.4484, lon: -112.074 }, stations);
  assert.equal(r[0].station, 'USW00023183');
  assert.ok(r[0].miles < 5 && Math.abs(r[1].miles - 108) < 5, `${r[1].miles}`);
  assert.ok(Math.abs(miles({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) - 69.09) < 0.05);
  const d = dailyMeans([{ station: 'X', day: 20089, tmax: 26.7, tmin: 13.3, qflag_tmax: null, qflag_tmin: null }, { station: 'X', day: 20090, tmax: 30, tmin: 10, qflag_tmax: 'I', qflag_tmin: null }], 'X');
  assert.equal(d.flagged, 1);
  assert.ok(Math.abs(d.means.get('2025-01-01') - 68.0) < 0.01);
});

test('ten reference meters: model form and balance points match OpenEEmeter exactly, coefficients within 1%', async () => {
  const { readFileSync } = await import('node:fs');
  const ref = JSON.parse(readFileSync(new URL('../../reference/eemeter-10-meters.json', import.meta.url), 'utf8'));
  assert.equal(ref.cases.length, 10);
  const off = [];
  for (const c of ref.cases) {
    const obs = c.inputs.map((d) => ({ start: d.date, days: 1, kwh: d.kwh, means: [d.meanF] }));
    const m = selectModel(obs).selected;
    const e = c.expected;
    if (m.type !== e.type || m.heatingBalance !== e.heatingBalance || m.coolingBalance !== e.coolingBalance) { off.push(`${c.id}: ${m.type} ${m.heatingBalance}/${m.coolingBalance} against ${e.type} ${e.heatingBalance}/${e.coolingBalance}`); continue; }
    for (const [k, want] of [['intercept', e.intercept], ['heating', e.heating], ['cooling', e.cooling]]) {
      if (want === null) continue;
      if (Math.abs(m.coef[k] - want) > Math.abs(want) * 0.01) off.push(`${c.id} ${k}: ${m.coef[k]} against ${want}`);
    }
  }
  assert.deepEqual(off, []);
});

test('a heat pump in October of a 24-month period: separate baselines, none spanning the date', async () => {
  const { splitAtChange } = await import('../../../core/lib/weather-model.mjs');
  const before = use(year('2024-01-01', { days: 640 }), { heat: 0.4, bh: 60 }).filter((o) => o.start < '2025-10-01');
  const after = use(year('2025-10-01', { days: 400 }), { heat: 1.5, bh: 55 });
  const s = splitAtChange([...before, ...after], '2025-10-01', { kind: 'daily', what: 'heat pump' });
  assert.equal(s.before.sufficiency.ok, true);
  assert.equal(s.after.sufficiency.ok, true);
  assert.ok(s.before.model.selected.coef.heating < 0.6 && s.after.model.selected.coef.heating > 1.3);
  // With only seven months after, the after side says it is short.
  const short = splitAtChange([...before, ...after.slice(0, 210)], '2025-10-01', { kind: 'daily', what: 'heat pump' });
  assert.equal(short.after.model, null);
  assert.match(short.after.sufficiency.checks[0].sentence, /This one has 210/);
});

test('the normal year at the published base nearest the balance point, with the caveat', async () => {
  const { normalYear } = await import('../../../core/lib/weather-model.mjs');
  const normals = Array.from({ length: 366 }, (_, i) => { const d = new Date(Date.UTC(2024, 0, 1) + i * DAY); return { month: d.getUTCMonth() + 1, day: d.getUTCDate(), htdd_55: 10, htdd_57: 12, htdd_60: 15, cldd_70: 2, cldd_72: 1 }; });
  const n = normalYear({ coef: { intercept: 20, heating: 1, cooling: 2 }, heatingBalance: 58, coolingBalance: 72 }, normals);
  assert.deepEqual([n.heatingBase, n.coolingBase], [57, 72]);
  assert.equal(n.kwh, 365 * (20 + 12 + 2));
  assert.match(n.caveat, /smoothed fit of daily mean temperature/);
});
