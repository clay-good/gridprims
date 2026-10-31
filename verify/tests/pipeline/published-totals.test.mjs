// The committed EIA snapshots sum to EIA's own published national totals
// (public grid data task 1.1). How each is summed: docs/reference-artifacts.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { readShard } from '../../../core/lib/shard.mjs';

const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eia-electric-power-annual-2025.json'), 'utf8')).values;
/** Every row of a committed table, across its state shards. */
const table = (dataset, name) => {
  const { version } = JSON.parse(readFileSync(join(ROOT, 'data', dataset, 'current.json'), 'utf8'));
  const dir = join(ROOT, 'data', dataset, version, name);
  return readdirSync(dir).flatMap((f) => readShard(readFileSync(join(dir, f))).rows());
};
const sum = (rows, f) => rows.reduce((n, r) => n + (f(r) ?? 0), 0);

test('EIA-861 retail sales, parts A, B, and D, match Table 2.2 to the MWh', () => {
  const sold = table('eia-861', 'sales').filter((r) => r.part !== 'C');
  assert.equal(Math.round(sum(sold, (r) => r.tot_sales)), ref.retailSalesMWh.value);
  assert.equal(Math.round(sum(sold, (r) => r.res_sales)), ref.residentialSalesMWh.value);
});

test('EIA-923 net generation matches Table 1.1 to the thousand MWh', () => {
  assert.equal(Math.round(sum(table('eia-923', 'generation'), (r) => r.net_generation_mwh) / 1000), ref.netGenerationThousandMWh.value);
});

test('EIA-860 operable summer capacity matches Table 4.2.A within 0.1 MW', () => {
  const mw = sum(table('eia-860', 'generators').filter((g) => g.category === 'operable'), (g) => g.summer_mw);
  // EIA rounds each energy source's subtotal; the sum of 27,918 generators lands on the other side of a 0.05.
  assert.ok(Math.abs(mw - ref.netSummerCapacityMW.value) <= 0.1, `${mw} MW`);
});

test('EIA-861 reliability, customer-weighted per index, matches Table 11.1', () => {
  const rows = table('eia-861', 'reliability');
  const weighted = (value, customers) => {
    let n = 0;
    let d = 0;
    for (const r of rows) {
      const v = value(r);
      const c = customers(r);
      if (v !== null && c) { n += v * c; d += c; }
    }
    return n / d;
  };
  const ieee = (p, m) => weighted((r) => r[`ieee_${p}_${m}`], (r) => r.ieee_customers);
  // "Any method": a utility's IEEE figures where it reports them, else its own standard's.
  const any = (p, m) => weighted((r) => (r.ieee_with_med_saidi !== null ? r[`ieee_${p}_${m}`] : r[`other_${p}_${m}`]), (r) => (r.ieee_with_med_saidi !== null ? r.ieee_customers : r.other_customers));
  const cases = [['ieeeWithMed', ieee, 'with_med'], ['ieeeWithoutMed', ieee, 'without_med'], ['ieeeLossOfSupplyRemoved', ieee, 'with_med_minus_los'], ['anyMethodWithMed', any, 'with_med'], ['anyMethodWithoutMed', any, 'without_med']];
  for (const [key, f, p] of cases) {
    const want = ref.reliability[key];
    const saidi = f(p, 'saidi');
    const saifi = f(p, 'saifi');
    assert.equal(Number(saidi.toFixed(1)), want.saidi, `${key} SAIDI`);
    assert.equal(Number(saifi.toFixed(3)), Number(want.saifi.toFixed(3)), `${key} SAIFI`);
    // EIA's CAIDI is the national SAIDI over SAIFI; its table rounds to 0.1 or to whole minutes.
    assert.ok(Math.abs(saidi / saifi - want.caidi) < 0.6, `${key} CAIDI ${saidi / saifi} vs ${want.caidi}`);
  }
});
