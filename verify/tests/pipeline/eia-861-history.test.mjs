// EIA-861 over five years (public grid data task 2.1, trends): the same sheet
// from each year's zip, normalized as the current year is, stacked by year.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import entry from '../../../pipeline/registry/eia-861-history.mjs';
import { eia861Zip, sampleRows } from '../../fixtures/data/eia-861/workbook.mjs';
import { tempDir } from '../../lib/temp.mjs';

const two = {
  ...entry,
  vintages: { 2025: { ...entry.vintages[2025], files: { 2024: { url: 'https://example.test/f8612024.zip', sha256: null }, 2025: { url: 'https://example.test/f8612025.zip', sha256: null } } } },
  tables: entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'unzip' ? { ...s, files: ['2024', '2025'] } : s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) })),
};
const tmp = () => tempDir('gridprims-861h-');
const run = (o) => runRecipe({ dataset: 'eia-861-history', year: 2025, retrieved: '2026-10-31', entry: two, input: { 2024: eia861Zip({ year: 2024 }), 2025: eia861Zip() }, outDir: tmp(), ...o });

test('the same sheet from each year\'s zip stacks into one table keyed by year', async () => {
  const out = tmp();
  const r = await run({ outDir: out });
  assert.equal(r.ok, true, r.failures?.join('\n'));
  assert.deepEqual(r.manifest.tables.map((t) => [t.name, t.rows, t.dataPeriod]), [['sales', 10, '2024-2025'], ['delivery', 6, '2024-2025']]);
  assert.deepEqual(r.manifest.raw.map((x) => x.file), ['2024', '2025']);
  const tx = readShard(readFileSync(join(out, 'eia-861-history/2026-10/sales/TX.bin'))).rows();
  assert.deepEqual([...new Set(tx.map((x) => x.data_year))], [2024, 2025]);
});

test('a missing year fails the release and writes nothing; so does a sheet whose rows say another year', async () => {
  const out = tmp();
  const missing = await run({ outDir: out, input: { 2024: eia861Zip({ year: 2024, omit: ['Sales_Ult_Cust'] }), 2025: eia861Zip() } });
  assert.match(missing.failures.join('\n'), /^sales: 2024: Sales_Ult_Cust_2024\.xlsx is not in the download$/m);
  const mislabeled = await run({ outDir: out, input: { 2024: eia861Zip({ year: 2024, rows: sampleRows(2023) }), 2025: eia861Zip() } });
  assert.match(mislabeled.failures.join('\n'), /sales: schema: 2024: 5 rows say another data year/);
  assert.ok(!existsSync(join(out, 'eia-861-history')));
});

test('the committed history\'s 2025 rows are the current EIA-861 sales rows, value for value', () => {
  const read = (dataset, table) => {
    const dir = join(ROOT, 'data', dataset, '2026-10', table);
    return readdirSync(dir).flatMap((f) => readShard(readFileSync(join(dir, f))).rows());
  };
  const key = (r) => [r.utility_id, r.part, r.service_type, r.state, r.ba_code, r.seq].join('|');
  const now = new Map(read('eia-861', 'sales').map((r) => [key(r), r]));
  const h2025 = read('eia-861-history', 'sales').filter((r) => r.data_year === 2025);
  assert.equal(h2025.length, now.size);
  for (const r of h2025) assert.deepEqual(r, now.get(key(r)), key(r));
  const m = JSON.parse(readFileSync(join(ROOT, 'data/eia-861-history/2026-10/manifest.json'), 'utf8'));
  assert.deepEqual(m.raw.map((x) => x.sha256), Object.values(entry.vintages[2025].files).map((f) => f.sha256));
});
