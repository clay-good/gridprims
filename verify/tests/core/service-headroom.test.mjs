// Service headroom (add-electrification-tools: service-headroom): the data
// period a file qualifies for, 15-minute re-averaging, and the spec's
// three-phase numbers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fifteenMinute, generationRule, headroom, maxDemand, sufficiency } from '../../../core/lib/service-headroom.mjs';

const ZONE = 'America/Chicago';
const START = Date.UTC(2025, 0, 1, 6); // local midnight, January 1, 2025

/** A flat series of `days` days at `minutes` resolution, with `drop(i)` intervals removed. */
function series(days, minutes = 15, { kw = 10, drop = () => false, from = START } = {}) {
  const step = minutes * 60_000;
  const n = Math.round((days * 86_400_000) / step);
  const startMs = [];
  const kwh = [];
  for (let i = 0; i < n; i++) if (!drop(i, from + i * step)) { startMs.push(from + i * step); kwh.push((kw * minutes) / 60); }
  return { startMs: Float64Array.from(startMs), kwh: Float64Array.from(kwh), intervalMinutes: minutes };
}

test('three-phase service: 120 kW at 0.95 on 480 V rated 400 A leaves 210.1 A (174.7 kVA)', () => {
  const h = headroom({ maxKw: 120, powerFactor: 0.95, volts: 480, phase: 3, ratingA: 400 });
  assert.equal(h.kva.toFixed(1), '126.3');
  assert.equal(h.kva125.toFixed(1), '157.9');
  assert.equal(h.amps.toFixed(1), '189.9');
  assert.equal(h.headroomA.toFixed(1), '210.1');
  assert.equal(h.headroomKva.toFixed(1), '174.7');
});

test('single-phase: kVA × 1,000 ÷ V, and a service over its rating has negative headroom', () => {
  const h = headroom({ maxKw: 40, powerFactor: 1, volts: 240, phase: 1, ratingA: 200 });
  assert.equal(h.amps.toFixed(1), '208.3');
  assert.equal(h.fits, false);
});

test('hourly file: refused, because hourly averages understate the 15-minute maximum', () => {
  const r = fifteenMinute(series(365, 60));
  assert.equal(r.status, 'refused');
  assert.match(r.reason, /Hourly data understates maximum demand/);
});

test('5-minute data is re-averaged into fixed 15-minute blocks; a block missing a reading is dropped', () => {
  const s = series(1, 5, { drop: (i) => i === 4 });
  s.kwh[0] = 3; // 36 kW for 5 minutes
  const r = fifteenMinute(s);
  assert.equal(r.reaveraged, true);
  assert.equal(r.dropped, 1);
  assert.equal(r.series.startMs.length, 95);
  assert.equal(maxDemand(r.series, -Infinity, Infinity).kw.toFixed(3), ((3 + 10 / 12 + 10 / 12) * 4).toFixed(3), 'a 5-minute spike averages down over its block');
});

test('too little data: 20 days of 15-minute data qualify for neither period', () => {
  const r = sufficiency(series(20), ZONE);
  assert.equal(r.status, 'refused');
  assert.match(r.reason, /20 days .* At least 30 days of 15-minute data, or 12 months, are needed/);
});

test('30 days in a row qualify for the 30-day period; a gap over an hour breaks the run', () => {
  assert.equal(sufficiency(series(31), ZONE).period, '30-day');
  const gap = sufficiency(series(31, 15, { drop: (i) => i >= 1000 && i < 1006 }), ZONE);
  assert.equal(gap.status, 'refused', 'six missing intervals are a 90-minute gap');
  assert.equal(sufficiency(series(31, 15, { drop: (i) => i >= 1000 && i < 1004 }), ZONE).period, '30-day', 'an hour exactly is allowed');
});

test('gappy month: a 12-month file with one month at 90% does not qualify for 12 months and names that month', () => {
  // Drop every tenth interval in March 2025 only.
  const march = [Date.UTC(2025, 2, 1, 6), Date.UTC(2025, 3, 1, 5)];
  const r = sufficiency(series(365, 15, { drop: (i, ms) => ms >= march[0] && ms < march[1] && i % 10 === 0 }), ZONE);
  assert.notEqual(r.period, '12-month');
  assert.deepEqual(r.short, ['2025-03']);
  assert.equal(r.period, '30-day', 'the months after March still hold 30 days in a row');
  assert.equal(sufficiency(series(365), ZONE).period, '12-month');
});

test('a full year across both daylight-saving changes has every month complete', () => {
  const r = sufficiency(series(365), ZONE);
  assert.equal(r.from, '2025-01');
  assert.equal(r.to, '2025-12');
  assert.deepEqual(r.short, []);
});

test('solar or peak shaving: the 30-day figure is withheld; the 12-month figure carries the inspector note', () => {
  assert.equal(generationRule('30-day', true).allowed, false);
  assert.match(generationRule('30-day', true).reason, /authority having jurisdiction/);
  assert.equal(generationRule('12-month', true).allowed, true);
  assert.match(generationRule('12-month', true).note, /inspector/);
  assert.equal(generationRule('30-day', false).allowed, true);
});

test('published examples: each exact result rounds to the article\'s printed whole amps', async () => {
  const { readFileSync } = await import('node:fs');
  const ref = JSON.parse(readFileSync(new URL('../../reference/nec-existing-load-examples.json', import.meta.url), 'utf8'));
  for (const ex of ref.examples) {
    const i = ex.inputs;
    // An example given in amps is expressed in kW at 480 V three-phase, unity power factor; the amps are the same at any voltage.
    const p = i.maxKw !== undefined ? i : { maxKw: (i.demandA * Math.sqrt(3) * 480) / 1000, powerFactor: 1, volts: 480, phase: 3, ratingA: i.ratingA };
    const h = headroom(p);
    const total = h.amps + i.newLoadA;
    assert.equal(Math.round(h.amps), ex.published.existingA, `${ex.id} existing load`);
    assert.equal(Math.round(total), ex.published.totalA, `${ex.id} total`);
    assert.equal(Math.round(i.ratingA - total), ex.published.spareA, `${ex.id} spare`);
  }
  const holt = headroom(ref.examples[0].inputs);
  assert.equal(holt.amps.toFixed(2), '123.23', 'the exact figure, not the article\'s rounded 123');
});
