// The change explainer's five fixtures (add-weather-normalization task 3.6):
// heating-dominated, cooling-dominated, flat, retrofit-split, and bills-only,
// built on OpenEEmeter's reference meters. In each, the weather, use, and
// baseline fit parts sum to the total change within 0.01 kWh, and the
// normalized annual figure is within 2% of the same normal year priced on the
// reference implementation's own fitted model.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalYear, selectModel, splitAtChange, splitChange } from '../../../core/lib/weather-model.mjs';

const ref = JSON.parse(readFileSync(new URL('../../reference/eemeter-10-meters.json', import.meta.url), 'utf8'));
const DAY = 86_400_000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const daily = (c) => c.inputs.map((d) => ({ start: d.date, days: 1, kwh: d.kwh, means: [d.meanF] }));

/** A normal year in NOAA's published layout (month, day, htdd_<base>, cldd_<base>), from a meter's own temperatures. */
const normalsFrom = (obs) => obs.flatMap((o, i) => o.means.map((m, j) => {
  const d = new Date(Date.parse(`${o.start}T00:00:00Z`) + j * DAY);
  const row = { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  for (const b of [40, 45, 50, 55, 57, 60, 65]) row[`htdd_${b}`] = Math.max(0, b - m);
  for (const b of [40, 45, 50, 55, 57, 60, 65, 70, 72]) row[`cldd_${b}`] = Math.max(0, m - b);
  return row;
}));

/** The reference implementation's fitted model, in our model's shape. */
const refModel = (c) => {
  const e = c.expected;
  const coef = { intercept: e.intercept };
  if (e.heating !== null) coef.heating = e.heating;
  if (e.cooling !== null) coef.cooling = e.cooling;
  return { type: e.type, coef, heatingBalance: e.heatingBalance, coolingBalance: e.coolingBalance };
};

/** Next year: the same days a year on, with the weather moved and use scaled. */
const nextYear = (obs, { dF = 0, scale = 1 }) => obs.map((o) => ({ ...o, start: iso(Date.parse(`${o.start}T00:00:00Z`) + 365 * DAY), means: o.means.map((m) => m + dF), kwh: o.kwh * scale }));

/** Calendar-month bills from daily rows: each period's days, total use, and its daily means. */
function bills(obs) {
  const by = new Map();
  for (const o of obs) {
    const k = o.start.slice(0, 7);
    const b = by.get(k) ?? by.set(k, { start: o.start, days: 0, kwh: 0, means: [] }).get(k);
    b.days += 1;
    b.kwh += o.kwh;
    b.means.push(...o.means);
  }
  return [...by.values()];
}

function check(name, model, baseline, comparison, reference) {
  const s = splitChange(model, baseline, comparison);
  const sum = s.parts.weather + s.parts.use + s.parts.fit;
  assert.ok(Math.abs(sum - s.total) < 0.01, `${name}: parts ${sum} against total ${s.total}`);
  const normals = normalsFrom(baseline);
  const ours = normalYear(model, normals).kwh;
  const theirs = normalYear(reference, normals).kwh;
  assert.ok(Math.abs(ours - theirs) <= 0.02 * theirs, `${name}: normal year ${ours.toFixed(1)} kWh against the reference's ${theirs.toFixed(1)} kWh`);
  return s;
}

const byId = (id) => ref.cases.find((c) => c.id === id);

test('heating-dominated: a colder year raises the weather part, and the parts sum', () => {
  const c = byId('boston-heat');
  const base = daily(c);
  const m = selectModel(base).selected;
  assert.equal(m.type, 'hdd');
  const s = check('heating', m, base, nextYear(base, { dF: -4, scale: 1.03 }), refModel(c));
  assert.ok(s.parts.weather > 0, 'four degrees colder is more heating');
});

test('cooling-dominated: a hotter year raises the weather part, and the parts sum', () => {
  const c = byId('phoenix-cool');
  const base = daily(c);
  const m = selectModel(base).selected;
  assert.equal(m.type, 'cdd');
  const s = check('cooling', m, base, nextYear(base, { dF: 3, scale: 0.98 }), refModel(c));
  assert.ok(s.parts.weather > 0, 'three degrees hotter is more cooling');
});

test('flat: weather explains nothing, so the weather part is zero and the parts still sum', () => {
  const c = byId('sandiego-flat');
  const base = daily(c);
  const m = selectModel(base).selected;
  assert.equal(m.type, 'flat');
  const s = check('flat', m, base, nextYear(base, { dF: 2, scale: 1.1 }), refModel(c));
  assert.equal(s.parts.weather, 0);
});

test('retrofit-split: no model spans the date, and the after side splits its own change', () => {
  const c = byId('chicago-heat');
  const before = daily(c);
  // After a heat pump, the same home on the next year's days: heating per degree day doubles.
  const m0 = selectModel(before).selected;
  const after = nextYear(before, {}).map((o) => ({ ...o, kwh: o.kwh + m0.coef.heating * Math.max(0, m0.heatingBalance - o.means[0]) }));
  const later = nextYear(after, { dF: -3 });
  const s = splitAtChange([...before, ...after], after[0].start, { kind: 'daily', what: 'heat pump' });
  assert.equal(s.spanning, 0);
  assert.ok(s.before.model && s.after.model);
  assert.ok(s.after.model.selected.coef.heating > 1.8 * s.before.model.selected.coef.heating);
  // The reference fitted the before side; the after side has no reference, so its normal year is checked
  // against the before side's reference with the doubled heating it was built with.
  const r = refModel(c);
  const afterRef = { ...r, coef: { ...r.coef, heating: 2 * r.coef.heating } };
  check('retrofit', s.after.model.selected, after, later, afterRef);
});

test('bills-only: monthly totals give the same normal year within 2%, and the parts sum', () => {
  const c = byId('minneapolis-heat');
  const base = bills(daily(c));
  assert.equal(base.length, 12);
  const m = selectModel(base).selected;
  assert.equal(m.type, 'hdd');
  check('bills', m, base, bills(nextYear(daily(c), { dF: -5, scale: 1.02 })), refModel(c));
});
