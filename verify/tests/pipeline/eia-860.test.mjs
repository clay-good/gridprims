// The EIA-860 pipeline (public grid data task 1.1): plants and generators from
// one release, location kept at the county (design D2).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { validateEntry } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { EXPECTED_HEADER } from '../../../pipeline/normalize/eia-860-plants.mjs';
import entry from '../../../pipeline/registry/eia-860.mjs';
import { eia860Zip, generatorRows, smallTables } from '../../fixtures/data/eia-860/workbook.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const small = { ...entry, vintages: { 2025: { ...entry.vintages[2025], sha256: null } }, tables: smallTables(entry) };
const run = (o) => runRecipe({ dataset: 'eia-860', year: 2025, retrieved: '2026-10-31', entry: small, input: eia860Zip(), outDir: mkdtempSync(join(tmpdir(), 'gridprims-860-')), ...o });

test('plants and generators build from one release, partitioned by state', async () => {
  const r = await run();
  assert.equal(r.ok, true, r.failures?.join('\n'));
  assert.deepEqual(r.manifest.tables.map((t) => [t.name, t.rows, t.shards.map((s) => s.state).join(' ')]), [['plants', 3, 'AL TX'], ['generators', 5, 'AL TX']]);
  assert.match(r.manifest.attribution, /Form EIA-860 \(Sep 2026\)/);
});

test('generators keep each sheet\'s dates in their own columns, and EIA\'s blanks become null', async () => {
  const r = await run();
  const dir = r.manifest.tables[1].shards.find((s) => s.state === 'TX').path;
  const out = mkdtempSync(join(tmpdir(), 'gridprims-860-'));
  const again = await run({ outDir: out });
  const tx = readShard(readFileSync(join(out, 'eia-860/2026-10', dir))).rows();
  assert.deepEqual(again.manifest, { ...r.manifest }, 'a re-run reproduces the manifest');
  const copper1 = tx.find((g) => g.plant_id === 9 && g.generator_id === '1');
  assert.deepEqual([copper1.category, copper1.operating_year, copper1.planned_retirement_year, copper1.retirement_year], ['operable', 1980, 2028, null]);
  const retired = tx.find((g) => g.category === 'retired_or_canceled');
  assert.deepEqual([retired.status, retired.retirement_month, retired.retirement_year, retired.planned_retirement_year], ['RE', 2, 2023, null]);
  assert.equal(tx.find((g) => g.generator_id === 'GT5').planned_retirement_month, null, 'a " " month is not reported');
  assert.equal(tx.find((g) => g.generator_id === '6').energy_source_2, 'DFO');
  const al = readShard(readFileSync(join(out, 'eia-860/2026-10/generators/AL.bin'))).rows();
  assert.deepEqual([al[0].category, al[0].planned_operation_month, al[0].planned_operation_year, al[0].operating_year], ['proposed', 11, 2029, null]);
  assert.equal(r.manifest.tables[1].columns.find((c) => c.name === 'nameplate_mw').unit, 'MW');
});

test('no coordinate, street address, city, ZIP, or grid voltage reaches a shard or download', async () => {
  const out = mkdtempSync(join(tmpdir(), 'gridprims-860-'));
  const r = await run({ outDir: out });
  const names = r.manifest.tables.flatMap((t) => t.columns.map((c) => c.name));
  for (const banned of ['latitude', 'longitude', 'street_address', 'city', 'zip', 'grid_voltage']) assert.ok(!names.some((n) => n.includes(banned)), banned);
  const csv = gunzipSync(readFileSync(join(out, 'eia-860/2026-10/plants.csv.gz'))).toString();
  assert.doesNotMatch(csv, /39\.8017|-89\.6436|Power Plant Way|Springfield|62701/);
  assert.match(csv, /^plant_id,plant_name,utility_id,utility_name,state,county,/);
  for (const s of r.manifest.tables[0].shards) assert.doesNotMatch(Buffer.from(readFileSync(join(out, 'eia-860/2026-10', s.path))).toString('latin1'), /Power Plant Way|Springfield/);
});

test('a generator with no state, a repeated generator, or a renamed column fails the release and writes nothing', async () => {
  const g = generatorRows();
  g.Operable[0][4] = ' ';
  const out = mkdtempSync(join(tmpdir(), 'gridprims-860-'));
  const noState = await run({ outDir: out, input: eia860Zip({ generators: g }) });
  assert.deepEqual(noState.failures, ['generators: 1 rows have no state to partition by']);
  const twice = generatorRows();
  twice.Operable.push(twice.Operable[1]);
  assert.match((await run({ outDir: out, input: eia860Zip({ generators: twice }) })).failures[0], /^generators: duplicate key 10\|GT5\|operable$/);
  const header = [...EXPECTED_HEADER];
  header[9] = 'Lat';
  assert.match((await run({ outDir: out, input: eia860Zip({ plantHeader: header }) })).failures[0], /^plants: schema: column 10 is "Lat", expected "Latitude"$/);
  assert.ok(!existsSync(join(out, 'eia-860')));
});

test('the committed real 2025 snapshot matches its manifest and EIA\'s pinned file', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'data/eia-860/2026-10/manifest.json'), 'utf8'));
  assert.deepEqual(m.tables.map((t) => [t.name, t.rows]), [['plants', 17349], ['generators', 36573]]);
  assert.equal(m.raw[0].sha256, entry.vintages[2025].sha256);
  for (const t of m.tables) {
    assert.equal(t.shards.reduce((n, s) => n + s.rows, 0), t.rows);
    for (const s of t.shards) assert.equal(sha(readFileSync(join(ROOT, 'data/eia-860/2026-10', s.path))), s.sha256, s.path);
  }
});

test('registry: EIA-860 passes the CEII screen as infrastructure, owned by add-public-grid-data', () => {
  assert.deepEqual(validateEntry(entry), []);
  assert.equal(entry.ceii.infrastructure, true);
  assert.equal(entry.owner, 'add-public-grid-data');
  const { checklist, ...rest } = entry.ceii;
  assert.match(validateEntry({ ...entry, ceii: rest }).join('\n'), /ceii\.checklist\.publicSourceOnly is not confirmed/);
});
