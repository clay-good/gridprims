// What would last year have cost on a different rate? (load and bill
// analyzer tasks 4.1 to 4.4), each scenario as the tariff-comparison spec
// states it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareRates, ineligibility, shiftLoad } from '../../../core/lib/rate-compare.mjs';
import { fromManual } from '../../../core/lib/tariff-record.mjs';

const schedule = (fn) => Array.from({ length: 12 }, (_, m) => Array.from({ length: 24 }, (_, h) => fn(m + 1, h)));
function series(startIso, hours, kwOf) {
  const start = Date.parse(`${startIso}Z`);
  const startMs = Float64Array.from({ length: hours }, (_, i) => start + i * 3_600_000);
  return { startMs, kwh: Float64Array.from(startMs, (ms) => kwOf(new Date(ms))), intervalMinutes: 60 };
}
const flat = (id, rate, extra = {}) => ({ ...fromManual({ energyRate: rate }), id, name: id, ...extra });
const tou = (id, peak, off) => {
  const r = flat(id, off);
  r.energy = { periods: [{ tiers: [{ rate: off, basis: 'kWh' }] }, { tiers: [{ rate: peak, basis: 'kWh' }] }], weekday: schedule((m, h) => (h >= 14 && h < 19 ? 1 : 0)), weekend: schedule(() => 0) };
  return r;
};
const weekday = (d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6;

test('a rate that requires peak demand above 500 kW is listed under "Not eligible" for a 180 kW load, with the reason', () => {
  const s = series('2026-09-01T00:00:00', 30 * 24, (d) => (d.getUTCHours() === 15 ? 180 : 60));
  const big = flat('large-power', 0.06, { eligibility: { demandMinKw: 500 } });
  const r = compareRates(s, [flat('general', 0.1), big], { zone: 'UTC', currentId: 'general', asOf: '2026-10-30' });
  assert.deepEqual(r.notEligible.map((x) => [x.rec.id, x.reason]), [['large-power', 'requires peak demand of at least 500 kW; your load peaks at 180 kW']]);
  assert.deepEqual(r.ranked.map((x) => x.rec.id), ['general']);
  assert.equal(ineligibility({ eligibility: { demandMaxKw: 100 } }, { peakKw: 180 }), 'allows peak demand up to 100 kW; your load peaks at 180 kW');
  // The rate you are on is always priced, with a note when the load is outside its limits.
  const mine = compareRates(s, [flat('general', 0.1), big], { zone: 'UTC', currentId: 'large-power', asOf: '2026-10-30' });
  assert.equal(mine.current.rec.id, 'large-power');
  assert.match(mine.current.outsideLimits, /requires peak demand of at least 500 kW/);
});

test('a time-of-use winner: the sentence names the share of energy in its off-peak periods', () => {
  // 10 kW overnight (8 pm to 8 am) and 2 kW by day: mostly off-peak.
  const s = series('2026-09-01T00:00:00', 30 * 24, (d) => (d.getUTCHours() >= 20 || d.getUTCHours() < 8 ? 10 : 2));
  const r = compareRates(s, [flat('flat', 0.12), tou('tou', 0.25, 0.08)], { zone: 'UTC', currentId: 'flat', asOf: '2026-10-30' });
  assert.deepEqual(r.ranked.map((x) => x.rec.id), ['tou', 'flat']);
  const winner = r.ranked[0];
  // Peak is 2 pm to 7 pm on 22 weekdays at 2 kW: 220 kWh of 30 × 144 = 4,320 kWh, so 94.9% is off-peak.
  assert.equal(Math.round(winner.offPeakShare * 1000) / 10, 94.9);
  assert.equal(winner.sentence, 'cheaper because 95% of your energy falls in its off-peak periods');
  assert.equal(winner.annual, Math.round(winner.months.reduce((n, m) => n + m.total, 0) * 100) / 100, 'the annual total is the sum of the monthly bills');
  assert.deepEqual([winner.diff, winner.pct], [Math.round((winner.annual - r.current.annual) * 100) / 100, Math.round(((winner.annual - r.current.annual) / r.current.annual) * 1000) / 10]);
  assert.deepEqual(Object.keys(winner.components), ['fixed', 'energy', 'demand']);
});

test('shifting 100 kW of chillers from 2–6 pm to 1–5 pm on weekdays updates every rate and re-sorts the ranking', () => {
  // September 2026: 22 weekdays and 8 weekend days. A 50 kW base, and 100 kW of chillers from 2 to 6 pm on weekdays.
  const s = series('2026-09-01T00:00:00', 30 * 24, (d) => 50 + (weekday(d) && d.getUTCHours() >= 14 && d.getUTCHours() < 18 ? 100 : 0));
  const rates = [flat('flat', 0.1), tou('tou', 0.22, 0.05)];
  const before = compareRates(s, rates, { zone: 'UTC', currentId: 'flat', asOf: '2026-10-30' });
  const moved = shiftLoad(s, { kw: 100, from: [14, 18], to: [13, 17], days: 'weekdays', zone: 'UTC' });
  const after = compareRates(moved, rates, { zone: 'UTC', currentId: 'flat', asOf: '2026-10-30' });
  assert.ok(Math.abs(moved.kwh.reduce((a, b) => a + b, 0) - s.kwh.reduce((a, b) => a + b, 0)) < 1e-6, 'the shift moves energy; it does not remove it');
  // By hand: flat is 0.10 × (22 × 1,600 + 8 × 1,200) = $4,480 both times; TOU is 22 × (650 × 0.22 + 950 × 0.05) + 8 × 1,200 × 0.05
  // = $4,671 before, and 22 × (550 × 0.22 + 1,050 × 0.05) + 480 = $4,297 after.
  const cost = (r, id) => r.ranked.find((x) => x.rec.id === id).annual;
  assert.deepEqual([cost(before, 'flat'), cost(before, 'tou')], [4480, 4671]);
  assert.deepEqual([cost(after, 'flat'), cost(after, 'tou')], [4480, 4297]);
  assert.deepEqual(before.ranked.map((x) => x.rec.id), ['flat', 'tou']);
  assert.deepEqual(after.ranked.map((x) => x.rec.id), ['tou', 'flat'], 'the ranking flips');
});

test('stale rates: the newest rate last updated more than 24 months ago warns and links the tariff page; counts and dates are stated', () => {
  const s = series('2026-09-01T00:00:00', 24, () => 5);
  const old = [flat('a', 0.1, { lastRevised: '2023-05-01', source: 'https://example.org/tariff-2023.pdf' }), flat('b', 0.11, { lastRevised: '2024-01-15', source: 'https://example.org/tariff-2024.pdf' })];
  const r = compareRates(s, old, { zone: 'UTC', asOf: '2026-10-30' });
  assert.deepEqual([r.data.count, r.data.oldest, r.data.newest, r.data.stale, r.data.tariffPage], [2, '2023-05-01', '2024-01-15', true, 'https://example.org/tariff-2024.pdf']);
  assert.match(r.data.note, /maintained by hand and may contain errors/);
  assert.equal(compareRates(s, [flat('c', 0.1, { lastRevised: '2026-01-01' })], { zone: 'UTC', asOf: '2026-10-30' }).data.stale, false);
});
