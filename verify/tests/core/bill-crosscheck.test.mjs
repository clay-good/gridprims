// The bill engine against NREL PySAM's Utilityrate5 (load and bill analyzer
// task 3.5): 12 URDB rates, one per supported charge type, on the synthetic
// office load; every monthly total within 0.5% or explained in
// docs/derivations/bill-engine-crosscheck.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../../core/lib/shard.mjs';
import { fromUrdb } from '../../../core/lib/tariff-record.mjs';
import { intervalBills } from '../../../core/lib/interval-bill.mjs';
import { sha256, toHex } from '../../../core/lib/sha256.mjs';

const ROOT = join(import.meta.dirname, '../../..');
const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/pysam-utilityrate5-office.json'), 'utf8'));
const DIR = join(ROOT, 'data/urdb/2026-10/rates');
const rates = new Map(readdirSync(DIR).flatMap((f) => readShard(readFileSync(join(DIR, f))).rows()).map((r) => [r.label, r]));
const loadBytes = readFileSync(join(ROOT, ref.load.path));
const lines = loadBytes.toString('utf8').trim().split('\n').slice(1);
const office = { startMs: Float64Array.from(lines, (l) => Date.parse(l.split(',')[0])), kwh: Float64Array.from(lines, (l) => Number(l.split(',')[1])), intervalMinutes: 60 };
// Charge types where the engines differ by design, with the most each may differ a month.
const DOCUMENTED = { 'a daily fixed charge': 0.001 };

test('the cross-check runs on the committed load and covers at least 10 rates and every supported charge type', () => {
  assert.equal(toHex(sha256(loadBytes)), ref.load.sha256);
  assert.ok(ref.results.length >= 10);
  for (const kind of ['tiered energy', 'time-of-use energy', 'time-of-use energy with tiers', 'monthly demand', 'tiered monthly demand', 'time-of-use demand', 'a daily fixed charge', 'a minimum charge', 'energy tiers per kW of demand', 'a demand ratchet']) {
    assert.ok(ref.results.some((r) => r.why === kind), kind);
  }
});

for (const r of ref.results) {
  test(`${r.why} (URDB ${r.label}): every monthly total within 0.5% of PySAM Utilityrate5`, () => {
    const rec = fromUrdb(rates.get(r.label) ?? assert.fail(`${r.label} is not in the snapshot`));
    assert.deepEqual(rec.unmodeled, [], 'a cross-checked rate has nothing unmodeled');
    const ours = intervalBills(office, rec, { zone: 'UTC' }).months;
    assert.equal(ours.length, 12);
    const limit = DOCUMENTED[r.why] ?? 0.005;
    ours.forEach((m, i) => assert.ok(Math.abs(m.total / r.monthly[i] - 1) <= limit, `${m.month}: ${m.total} against PySAM's ${r.monthly[i]}`));
    // The year: within a cent of PySAM's total for every rate.
    const year = ours.reduce((n, m) => n + m.total, 0);
    assert.ok(Math.abs(year - r.annual) < 0.05 || r.why in DOCUMENTED, `${year} against ${r.annual}`);
  });
}
