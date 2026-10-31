// The committed EIA snapshots against PUDL v2026.10.0 for report year 2025
// (public grid data task 1.1). PUDL's figures were computed with pyarrow by
// verify/tools/pudl-2025.py; every difference below is explained in
// docs/reference-artifacts.md, and any other difference fails.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { readShard } from '../../../core/lib/shard.mjs';

const pudl = JSON.parse(readFileSync(join(ROOT, 'verify/reference/pudl-v2026.10.0-2025.json'), 'utf8'));
const table = (dataset, name) => {
  const { version } = JSON.parse(readFileSync(join(ROOT, 'data', dataset, 'current.json'), 'utf8'));
  const dir = join(ROOT, 'data', dataset, version, name);
  return readdirSync(dir).flatMap((f) => readShard(readFileSync(join(dir, f))).rows());
};
const sum = (rows, f) => rows.reduce((n, r) => n + (f(r) ?? 0), 0);
/** The same digest the Python side writes: SHA-256 of the sorted list as compact JSON. */
const digest = (ids) => createHash('sha256').update(JSON.stringify(ids)).digest('hex');
const byPair = (a, b) => (a[0] - b[0]) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);

/** Plants PUDL lists for 2025 that EIA-860's 2025 Plant sheet does not: EIA-923 frame plants such as 8825. */
const PUDL_ONLY_PLANTS = [127, 1606, 2866, 7737, 8809, 8812, 8816, 8823, 8824, 8825, 8827, 8828, 8829, 8831, 8832, 8834, 8835, 8837, 8838, 8841, 8843, 8845, 8846, 8847, 8848, 8850, 8851, 8852, 8853, 8857, 8858, 8865, 8866, 8867, 8868, 8899, 10300, 10796, 50231, 50359, 50632, 54586, 55243, 56951, 58156];

test('plants: ours are EIA-860\'s Plant sheet; PUDL adds 45 plants known only from EIA-923', () => {
  const ours = table('eia-860', 'plants').map((p) => p.plant_id);
  assert.equal(ours.length + PUDL_ONLY_PLANTS.length, pudl.plants.count);
  assert.equal(digest([...ours, ...PUDL_ONLY_PLANTS].sort((a, b) => a - b)), pudl.plants.idsSha256);
});

test('operable generators: the same set once PUDL\'s ID cleanup is applied', () => {
  const ours = table('eia-860', 'generators').filter((g) => g.category === 'operable');
  // PUDL strips leading zeros from all-digit IDs ("001" becomes "1", "01-8N" stays) and reads the ID "NA"
  // as missing. That merges plant 56032's "0001" and "001" into "1", whose summer MW it leaves blank
  // because the two disagree (45.9 and 48.1).
  const cleaned = new Map();
  for (const g of ours) {
    if (g.generator_id === 'NA') continue;
    const key = [g.plant_id, /^\d+$/.test(g.generator_id) ? g.generator_id.replace(/^0+(?=\d)/, '') : g.generator_id];
    const seen = cleaned.get(key.join('|'));
    if (seen) seen.summer = seen.summer === g.summer_mw ? seen.summer : null;
    else cleaned.set(key.join('|'), { key, summer: g.summer_mw });
  }
  assert.equal(ours.length - cleaned.size, 2, 'one "NA" generator and one merged pair');
  assert.equal(cleaned.size, pudl.existingGenerators.count);
  assert.equal(digest([...cleaned.values()].map((x) => x.key).sort(byPair)), pudl.existingGenerators.idsSha256);
  const kept = sum([...cleaned.values()], (x) => x.summer);
  assert.ok(Math.abs(kept - pudl.existingGenerators.summerMW) < 0.01, `${kept} MW against PUDL's ${pudl.existingGenerators.summerMW}`);
});

test('reliability: the same 976 utility-state pairs; PUDL keeps one row per standard', () => {
  const ours = table('eia-861', 'reliability');
  assert.equal(ours.length, pudl.reliability.utilityStatePairs);
  assert.equal(pudl.reliability.rows, 2 * ours.length);
});

test('sales: PUDL keeps one of the three Texas "Withheld" rows; everything else matches to the MWh', () => {
  const ours = table('eia-861', 'sales');
  const sectors = (r) => (r.res_sales ?? 0) + (r.com_sales ?? 0) + (r.ind_sales ?? 0) + (r.trn_sales ?? 0);
  const withheld = sum(ours.filter((r) => r.utility_id === 88888 && r.state === 'TX' && r.service_type === 'Bundled'), sectors);
  assert.equal(Math.round(sum(ours, sectors) - withheld + pudl.sales.withheldTexasBundledMWh), pudl.sales.mwhAllParts);
});

test('net generation: PUDL drops EIA\'s state-fuel increments; the rest matches within 0.01 TWh', () => {
  const rows = table('eia-923', 'generation');
  assert.equal(pudl.stateFuelIncrementRows, 0);
  const plantsOnly = sum(rows.filter((r) => r.plant_id !== 99999), (r) => r.net_generation_mwh);
  assert.ok(Math.abs(plantsOnly - pudl.netGenerationMWh) < 10_000, `${plantsOnly} MWh against PUDL's ${pudl.netGenerationMWh}`);
});
