// URDB residential rates as the bill engine reads them (household bill check
// task 1.2): conditions from the rate name, and 21 rates from the served snapshot, each classified by hand from
// its URDB fields, and the tariffs converted from the ones totals can price.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../../core/lib/shard.mjs';
import { priceTotals } from '../../../core/lib/bill-totals.mjs';
import { classify, toTariff } from '../../../core/lib/urdb-tariff.mjs';

const DIR = join(import.meta.dirname, '../../../data/urdb/2026-10/rates');
const rates = new Map(readdirSync(DIR).flatMap((f) => readShard(readFileSync(join(DIR, f))).rows()).map((r) => [r.label, r]));
const rate = (label) => rates.get(label) ?? assert.fail(`${label} is not in the snapshot`);

// [label, who, service, totals, tou, demand], read by hand from each rate's schedules and structures.
const HAND = [
  ['539f6a55ec4f024411ec8e3d', 'Sauk City Rg-1: one flat rate', 'bundled', true, false, false],
  ['539f6b92ec4f024411ec9ecd', 'Madison NJ: two tiers at 600 kWh', 'bundled', true, false, false],
  ['539f6aadec4f024411ec932d', 'United Electric Coop: $1.50 and $7.50 per kW', 'bundled', false, false, true],
  ['59f2314d5457a3ff610d792e', 'Seattle REC: daily allowances, two seasons', 'bundled', true, false, false],
  ['539fb8d2ec4f024bc1dc1b83', 'Four County TOU: off-peak nights, a demand charge', 'bundled', false, true, true],
  ['5a94ceaa5457a3f552a199a0', 'SDG&E TOU-DR-P: peak 4 to 9 pm', 'bundled', false, true, false],
  ['539f6abbec4f024411ec9349', 'North Central TOD: weekday peaks only', 'bundled', false, true, false],
  ['5963ede55457a385144c9f92', 'Ohio Power RS with standard offer', 'delivery-standard-offer', true, false, false],
  ['59652cb35457a34a4a4c9f95', 'Pepco AE with standard offer: summer and winter', 'delivery-standard-offer', true, false, false],
  ['67b4fe07e5073ed70b0e5512', 'Con Edison Rate IV: demand-based', 'delivery-standard-offer', false, false, true],
  ['5b845df35457a39a34edfe03', 'DTE D1 low income: a $32.50 monthly credit', 'delivery-standard-offer', true, false, false],
  ['63fe46eabe0533c55c0afaae', 'PacifiCorp Schedule 6 TOU, three phase', 'delivery-standard-offer', false, true, true],
  ['5964e4615457a3803e4c9f92', 'Ohio Power RS-TOD', 'delivery-standard-offer', false, true, false],
  ['5964d9025457a3863c4c9f92', 'Ohio Power RS, delivery only', 'delivery', true, false, false],
  ['596678ce5457a393704c9f93', 'Pepco AE, delivery only', 'delivery', true, false, false],
  ['5bbe4a0e5457a32e16135b53', 'NH Electric Coop EV TOU', 'delivery', false, true, true],
  ['5978fc0e5457a3fc3123732c', 'Penelec NY TOU', 'delivery', false, true, false],
  ['59c9391b5457a39615c8c1a9', 'NYPA SL-2: energy only', 'energy-only', true, false, false],
  ['59c3eb595457a32b23bbb27b', 'NYPA SC 62: a zero flat demand charge', 'energy-only', true, false, false],
  ['539f6a0aec4f024411ec8acb', 'Delaware Coop space heating: winter tiers', 'not-stated', true, false, false],
  ['539fc3a1ec4f024c27d8be49', 'Wheatland: tiers in kWh per kW', 'not-stated', false, false, true],
];

test('21 residential rates classify as read by hand', () => {
  for (const [label, who, service, totals, tou, demand] of HAND) {
    const c = classify(rate(label));
    assert.deepEqual({ service: c.service, totals: c.totals, tou: c.tou, demand: c.demand, residential: c.residential }, { service, totals, tou, demand, residential: true }, who);
    assert.equal(toTariff(rate(label))?.tou ?? null, totals ? false : c.touByPeriod ? true : null, who);
    if (!totals) assert.ok(c.reasons.length, `${who} says why totals cannot price it`);
  }
});

test('conditions come from the rate name: low income, elderly or disabled, EV, space heating, all-electric', () => {
  const cond = (label) => classify(rate(label)).conditions;
  assert.deepEqual(cond('5b845df35457a39a34edfe03'), ['low-income']);
  assert.deepEqual(cond('59f2314d5457a3ff610d792e'), ['elderly-or-disabled']);
  assert.deepEqual(cond('5bbe4a0e5457a32e16135b53'), ['electric-vehicle']);
  assert.deepEqual(cond('539f6a0aec4f024411ec8acb'), ['space-heating']);
  assert.deepEqual(cond('59652cb35457a34a4a4c9f95'), ['all-electric']);
  for (const plain of ['539f6a55ec4f024411ec8e3d', '539f6b92ec4f024411ec9ecd', '5963ede55457a385144c9f92', '59c9391b5457a39615c8c1a9']) assert.deepEqual(cond(plain), [], plain);
});

test('tiers: URDB max is cumulative, the engine wants each tier\'s own allowance, and adj is added to the rate', () => {
  const { tariff, notes } = toTariff(rate('5963ede55457a385144c9f92'));
  assert.deepEqual(tariff, { fixedMonthly: 11.83, seasons: [{ name: 'all year', from: '01-01', tiers: [{ rate: 0.118961, upTo: 2000 }, { rate: 0.118501, upTo: 13000 }, { rate: 0.117941 }] }] });
  assert.match(notes[0], /adjustment/);
});

test('seasons come from the months, and December running into January makes one season', () => {
  // Delaware Coop: period 0 October to May, period 1 June to September.
  const { tariff } = toTariff(rate('539f6a0aec4f024411ec8acb'));
  assert.deepEqual(tariff.seasons.map((s) => [s.name, s.from, s.tiers.length]), [['October to May', '10-01', 3], ['June to September', '06-01', 1]]);
  const winter = priceTotals({ start: '2026-01-01', end: '2026-01-31', kwh: 1500 }, tariff);
  // $7.95 + 700 × 11.9148¢ + 500 × 10.3748¢ + 300 × 9.3748¢ = $7.95 + $83.40 + $51.87 + $28.12
  assert.equal(winter.totalCents, 795 + 8340 + 5187 + 2812);
  const summer = priceTotals({ start: '2026-07-01', end: '2026-07-31', kwh: 1500 }, tariff);
  assert.equal(summer.totalCents, 795 + 18615);
});

test('daily allowances: Seattle\'s 10 kWh a day in summer gives a 30-day period 300 kWh in the first tier', () => {
  const { tariff } = toTariff(rate('59f2314d5457a3ff610d792e'));
  assert.deepEqual(tariff.seasons[1], { name: 'April to September', from: '04-01', tiers: [{ rate: 0.027901, upToDaily: 10 }, { rate: 0.051724 }] });
  const r = priceTotals({ start: '2026-06-01', end: '2026-06-30', kwh: 500 }, tariff);
  assert.deepEqual(r.lines.filter((l) => l.kwh).map((l) => l.kwh), [300, 200]);
  // $2.00 + 300 × 2.7901¢ + 200 × 5.1724¢ = $2.00 + $8.37 + $10.34
  assert.equal(r.totalCents, 200 + 837 + 1034);
});

test('kWh by time-of-use period: Penelec NY prices 300 peak and 500 off-peak kWh at its two rates, with the hours named', () => {
  const t = toTariff(rate('5978fc0e5457a3fc3123732c'));
  assert.equal(t.tou, true);
  assert.deepEqual(t.tariff.seasons, [{ name: 'all year', from: '01-01', periods: [
    { name: 'period 1', rate: 0.068912, hours: 'weekdays 8 am to 8 pm' },
    { name: 'period 2', rate: 0.022752, hours: 'weekdays 8 pm to 8 am, weekends all day' },
  ] }]);
  const r = priceTotals({ start: '2026-03-01', end: '2026-03-30', kwh: 800, tou: { 'period 1': 300, 'period 2': 500 } }, t.tariff);
  // 300 × 6.8912¢ + 500 × 2.2752¢ = $20.67 + $11.38, above the $9.18 minimum.
  assert.equal(r.totalCents, 2067 + 1138);
  assert.throws(() => priceTotals({ start: '2026-03-01', end: '2026-03-30', kwh: 800 }, t.tariff), /time-of-use period/);
  // A TOU rate with tiered periods cannot be priced from kWh by period alone.
  assert.equal(toTariff(rate('5a94ceaa5457a3f552a199a0')), null);
});

test('a time-of-use period crossing a season splits each period\'s kWh by days', () => {
  const tariff = { seasons: [
    { name: 'winter', from: '10-01', periods: [{ name: 'peak', rate: 0.20 }, { name: 'off-peak', rate: 0.10 }] },
    { name: 'summer', from: '06-01', periods: [{ name: 'peak', rate: 0.30 }, { name: 'off-peak', rate: 0.10 }] },
  ] };
  const r = priceTotals({ start: '2026-05-17', end: '2026-06-15', kwh: 900, tou: { peak: 300, 'off-peak': 600 } }, tariff);
  // 15 winter days and 15 summer: peak 150 at 20¢ and 150 at 30¢, off-peak 300 and 300 at 10¢.
  assert.deepEqual(r.lines.map((l) => [l.label, l.kwh, l.cents]), [['winter peak', 150, 3000], ['summer peak', 150, 4500], ['winter off-peak', 300, 3000], ['summer off-peak', 300, 3000]]);
  assert.match(r.method, /15 days at winter rates, 15 days at summer rates/);
});

test('across the snapshot: every residential rate classifies, and every one totals can price converts and prices', () => {
  const res = [...rates.values()].filter((r) => r.sector === 'Residential');
  let priced = 0;
  for (const r of res) {
    const t = toTariff(r);
    if (!t) continue;
    priced++;
    const tou = t.tou ? Object.fromEntries(t.tariff.seasons[0].periods.map((p) => [p.name, 100])) : undefined;
    // Within one season: the season's own periods.
    const { totalCents } = priceTotals({ start: '2026-03-01', end: '2026-03-30', kwh: 900, tou }, t.tariff.seasons.length === 1 || !t.tou ? t.tariff : { ...t.tariff, seasons: [t.tariff.seasons[0]] });
    assert.ok(Number.isFinite(totalCents), r.label);
  }
  assert.ok(priced / res.length > 0.6, `${priced} of ${res.length} price from totals`);
});
