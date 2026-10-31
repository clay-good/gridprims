// The bill engine's tariff record (load and bill analyzer task 3.1): 50 URDB
// rates sampled across every unit and charge type normalize as the stored
// expectations say, with unmodeled items named, and a daily fixed charge is
// converted with its arithmetic shown.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../../core/lib/shard.mjs';
import { fixedFor, fromManual, fromUrdb, minimumFor } from '../../../core/lib/tariff-record.mjs';

const ROOT = join(import.meta.dirname, '../../..');
const DIR = join(ROOT, 'data/urdb/2026-10/rates');
const rates = new Map(readdirSync(DIR).flatMap((f) => readShard(readFileSync(join(DIR, f))).rows()).map((r) => [r.label, r]));
const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/urdb-normalize-sample.json'), 'utf8'));

/** The record in the shape the expectations are written in. */
function summary(rec) {
  const units = (e) => [...new Set(e.periods.flatMap((p) => p.tiers.map((t) => ({ kWh: 'kWh', 'kWh per day': 'kWh daily', 'kWh per kW': 'kWh/kW' })[t.basis])))].sort();
  return {
    fixed: rec.fixed && [rec.fixed.amount, rec.fixed.per],
    minimum: rec.minimum && [rec.minimum.amount, rec.minimum.per],
    energy: rec.energy && { periods: rec.energy.periods.length, tiers: rec.energy.periods.map((p) => p.tiers.length), units: units(rec.energy) },
    demand: rec.demand && [rec.demand.unit, rec.demand.daily, rec.demand.periods.length],
    flatDemand: rec.flatDemand && [rec.flatDemand.unit, rec.flatDemand.daily, rec.flatDemand.periods.length],
    ratchet: rec.ratchet !== null,
    window: [rec.demandWindowMinutes, rec.demandWindowStated],
    kvar: rec.reactivePowerCharge,
    unmodeled: [...rec.unmodeled].sort(),
  };
}

test('50 sampled URDB rates normalize as expected, across every unit and charge type, with unmodeled items named', () => {
  assert.equal(ref.rates.length, 50);
  for (const { label, why, expect } of ref.rates) {
    const row = rates.get(label) ?? assert.fail(`${label} is not in the snapshot`);
    assert.deepEqual(summary(fromUrdb(row)), expect, `${label} (${why})`);
  }
  const named = new Set(ref.rates.flatMap((r) => r.expect.unmodeled));
  for (const kind of ['coincident demand charge', 'export (sell) rates', 'monthly fuel adjustments']) assert.ok(named.has(kind), kind);
  assert.ok([...named].some((u) => / in hp$/.test(u)), 'a demand charge per horsepower');
  assert.ok([...named].some((u) => /^energy tiers in kWh\/(kVA|hp)$/.test(u)), 'tiers per kVA or horsepower');
});

test('a fixed charge of $0.50 a day over a 31-day period is $15.50, with "31 days × $0.50/day" shown', () => {
  const rec = fromUrdb({ label: 'x', fixed_charge: 0.5, fixed_charge_units: '$/day' });
  assert.deepEqual(fixedFor(rec, 31), { amount: 15.5, text: '31 days × $0.50/day' });
  assert.match(rec.conversions[0], /\$0\.50 a day, times the days in each billing period/);
  // A yearly minimum is a twelfth each month; a daily one is times the days.
  assert.deepEqual(minimumFor(fromUrdb({ label: 'y', min_charge: 120, min_charge_units: '$/year' }), 30), { amount: 10, text: '$120.00 a year ÷ 12' });
  assert.deepEqual(minimumFor(fromUrdb({ label: 'z', min_charge: 0.25, min_charge_units: '$/day' }), 30), { amount: 7.5, text: '30 days × $0.25/day' });
});

test('every URDB rate in the snapshot normalizes, and no rate reads as anything but a number', () => {
  let n = 0;
  for (const r of new Map([...rates].map(([k, v]) => [k, v])).values()) {
    const rec = fromUrdb(r);
    for (const part of [rec.energy, rec.demand, rec.flatDemand].filter(Boolean)) for (const p of part.periods) for (const t of p.tiers) assert.ok(Number.isFinite(t.rate), r.label);
    n++;
  }
  assert.ok(n > 30000, `${n} rates`);
});

test('the manual form makes the same record shape: two energy tiers and a monthly demand charge', () => {
  const rec = fromManual({ fixedMonthly: 10, energyRate: 0.12, tierKwh: 500, energyRate2: 0.15, demandRate: 8 });
  assert.deepEqual(rec.energy.periods, [{ tiers: [{ rate: 0.12, upTo: 500, basis: 'kWh' }, { rate: 0.15, basis: 'kWh' }] }]);
  assert.deepEqual(rec.fixed, { amount: 10, per: 'month' });
  assert.deepEqual(rec.flatDemand.periods, [{ tiers: [{ rate: 8 }] }]);
  assert.equal(rec.energy.weekday.length, 12);
  assert.ok(rec.energy.weekday.every((m) => m.length === 24 && m.every((p) => p === 0)));
  assert.deepEqual(Object.keys(rec).sort(), Object.keys(fromUrdb([...rates.values()][0])).sort());
});
