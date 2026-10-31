// Proposed rate impact (ratepayer tools tasks 1.1 and 1.2), each scenario as
// the proposed-rate-impact spec states it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annualize, copyTariff, impactOnIntervals, impactOnMonthly, tariffDifferences } from '../../../core/lib/rate-impact.mjs';
import { fromManual } from '../../../core/lib/tariff-record.mjs';

const schedule = (fn) => Array.from({ length: 12 }, (_, m) => Array.from({ length: 24 }, (_, h) => fn(m + 1, h)));
const year = (() => { const s = Date.parse('2025-01-01T00:00:00Z'); const startMs = Float64Array.from({ length: 8760 }, (_, i) => s + i * 3_600_000); return { startMs, kwh: Float64Array.from(startMs, () => 1), intervalMinutes: 60 }; })();

test('raising the fixed charge from $12.00 to $20.00 a month shows "Fixed charge: $12.00 → $20.00 per month"', () => {
  const current = fromManual({ fixedMonthly: 12, energyRate: 0.12 });
  const proposed = copyTariff(current);
  proposed.fixed.amount = 20;
  assert.deepEqual(tariffDifferences(current, proposed), ['Fixed charge: $12.00 → $20.00 per month']);
  assert.equal(current.fixed.amount, 12, 'the copy is separate');
  proposed.energy.periods[0].tiers[0].rate = 0.13;
  assert.deepEqual(tariffDifferences(current, proposed), ['Fixed charge: $12.00 → $20.00 per month', 'Energy: $0.12000 → $0.13000 per kWh']);
});

test('a year costing $1,640 now and $1,802 proposed is +$162 (+9.9%), with the largest contributing charge', () => {
  // 8,760 kWh a year: $12 a month and 17.0776... cents now; $20 a month and 17.8 cents proposed.
  const current = fromManual({ fixedMonthly: 12, energyRate: (1640 - 144) / 8760 });
  const proposed = fromManual({ fixedMonthly: 20, energyRate: (1802 - 240) / 8760 });
  const r = impactOnIntervals(year, current, proposed, { zone: 'UTC' });
  assert.deepEqual([Math.round(r.current), Math.round(r.proposed), Math.round(r.diff), r.pct], [1640, 1802, 162, 9.9]);
  assert.deepEqual(r.largest.component, 'fixed');
  assert.equal(r.byComponent.fixed, 96);
  assert.equal(r.monthly.length, 12);
  assert.equal(r.label, null);
});

test('8 months are labeled "8 months" and annualized only when asked, with the method', () => {
  const months = Array.from({ length: 8 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, kwh: 700 }));
  const cur = fromManual({ fixedMonthly: 12, energyRate: 0.12 });
  const r = impactOnMonthly(months, cur, { ...copyTariff(cur), fixed: { amount: 20, per: 'month' } });
  assert.deepEqual([r.label, r.diff, r.months], ['8 months', 64, 8]);
  assert.deepEqual(annualize(r), { diff: 96, method: '$64.00 over 8 months × 12 ÷ 8; seasons missing from the file are assumed to look like the months present.' });
});

test('monthly totals for a time-of-use proposal: fixed and tiered charges are priced, time-of-use is "needs interval data"', () => {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, kwh: 900 }));
  const cur = fromManual({ fixedMonthly: 12, energyRate: 0.1, tierKwh: 500, energyRate2: 0.14 });
  const tou = fromManual({ fixedMonthly: 15, energyRate: 0.08 });
  tou.energy = { periods: [{ tiers: [{ rate: 0.08, basis: 'kWh' }] }, { tiers: [{ rate: 0.3, basis: 'kWh' }] }], weekday: schedule((m, h) => (h >= 16 && h < 21 ? 1 : 0)), weekend: schedule(() => 0) };
  const r = impactOnMonthly(months, cur, tou);
  assert.deepEqual(r.needsIntervalData, ['time-of-use energy']);
  // Current: $12 + 500 × 10¢ + 400 × 14¢ = $118 a month, priced in full.
  assert.equal(r.current, 118 * 12);
});

test('three rates on three loads: each annual difference from current to proposed within 0.5% of PySAM Utilityrate5', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { readShard } = await import('../../../core/lib/shard.mjs');
  const { fromUrdb } = await import('../../../core/lib/tariff-record.mjs');
  const ROOT = join(import.meta.dirname, '../../..');
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/pysam-rate-impact.json'), 'utf8'));
  const DIR = join(ROOT, 'data/urdb/2026-10/rates');
  const rates = new Map(readdirSync(DIR).flatMap((f) => readShard(readFileSync(join(DIR, f))).rows()).map((r) => [r.label, r]));
  const load = (f) => { const l = readFileSync(join(ROOT, 'verify/fixtures/bill', f), 'utf8').trim().split('\n').slice(1); return { startMs: Float64Array.from(l, (x) => Date.parse(x.split(',')[0])), kwh: Float64Array.from(l, (x) => Number(x.split(',')[1])), intervalMinutes: 60 }; };
  // The same stated proposal as the PySAM run: fixed +$8 a month, energy × 1.07, demand × 1.10.
  const propose = (rec) => {
    const p = copyTariff(rec);
    p.fixed = { amount: (rec.fixed?.amount ?? 0) + 8, per: 'month' };
    for (const period of p.energy.periods) for (const t of period.tiers) t.rate *= 1.07;
    for (const period of p.flatDemand?.periods ?? []) for (const t of period.tiers) t.rate *= 1.1;
    return p;
  };
  assert.equal(ref.cases.length, 9);
  for (const c of ref.cases) {
    const rec = fromUrdb(rates.get(c.rate));
    const r = impactOnIntervals(load(c.load), rec, propose(rec), { zone: 'UTC' });
    assert.ok(Math.abs(r.diff / c.diff - 1) < 0.005, `${c.why} on ${c.load}: ${r.diff} against PySAM's ${c.diff}`);
  }
});
