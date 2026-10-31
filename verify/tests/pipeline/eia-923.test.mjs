// The EIA-923 pipeline (public grid data task 1.1): plant generation and fuel
// from the final annual file, and a release watch that waits for it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { checkDataset } from '../../../pipeline/check.mjs';
import { validateEntry } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { isBlankFrameRow } from '../../../pipeline/normalize/eia-923-generation.mjs';
import entry from '../../../pipeline/registry/eia-923.mjs';
import { eia923Zip, sampleRows, smallTables } from '../../fixtures/data/eia-923/workbook.mjs';

const small = { ...entry, vintages: { 2025: { ...entry.vintages[2025], sha256: null } }, tables: smallTables(entry) };
const tmp = () => mkdtempSync(join(tmpdir(), 'gridprims-923-'));
const run = (o) => runRecipe({ dataset: 'eia-923', year: 2025, retrieved: '2026-10-31', entry: small, input: eia923Zip(), outDir: tmp(), ...o });
const shard = (out, st) => readShard(readFileSync(join(out, 'eia-923/2026-10/generation', `${st}.bin`))).rows();

test('the final workbook builds, found by pattern even when EIA renames it "_Final_Revision"', async () => {
  const out = tmp();
  const r = await run({ outDir: out });
  assert.equal(r.ok, true, r.failures?.join('\n'));
  assert.deepEqual(r.manifest.raw[0].entries, ['EIA923_Schedules_2_3_4_5_M_12_2025_Final_Revision.xlsx']);
  assert.deepEqual(r.manifest.tables.map((t) => [t.name, t.rows, t.shards.map((s) => s.state).join(' ')]), [['generation', 7, 'AK IA NC SC']]);
  const [nuke] = shard(out, 'SC');
  assert.deepEqual([nuke.nuclear_unit_id, nuke.net_generation_mwh, nuke.net_generation_mwh_07], ['2', 6000000, 500000]);
  assert.equal(shard(out, 'AK')[0].nuclear_unit_id, null, 'EIA\'s "." is not reported');
  assert.equal(r.manifest.tables[0].columns.find((c) => c.name === 'net_generation_mwh_12').unit, 'MWh');
});

test('a CHP status change and the state-fuel increments keep every row; pumped storage stays negative', async () => {
  const out = tmp();
  await run({ outDir: out });
  assert.deepEqual(shard(out, 'IA').map((g) => [g.chp, g.net_generation_mwh]), [['Y', 120], ['N', 720]]);
  const nc = shard(out, 'NC');
  assert.deepEqual(nc.filter((g) => g.plant_id === 99999).map((g) => g.sector), [2, 1]);
  assert.equal(nc.find((g) => g.prime_mover === 'PS').net_generation_mwh, -120000);
});

test('the blank frame row is dropped; a stateless row with values fails the release', async () => {
  const pinned = JSON.parse(readFileSync(join(ROOT, 'verify/fixtures/data/eia-923/blank-frame-row.json'), 'utf8')).cells.map((v) => (v === null ? null : { value: v }));
  assert.equal(isBlankFrameRow(pinned), true);
  const rows = sampleRows();
  const withValue = [...rows.at(-1)];
  withValue[95] = 5;
  const out = tmp();
  const bad = await run({ outDir: out, input: eia923Zip({ rows: [...rows.slice(0, -1), withValue] }) });
  assert.deepEqual(bad.failures, ['generation: 1 rows have no state to partition by']);
  assert.ok(!existsSync(join(out, 'eia-923')));
});

test('the state-fuel increment quirk fixture from the real 2025 file still holds', () => {
  const pinned = JSON.parse(readFileSync(join(ROOT, 'verify/fixtures/data/eia-923/increments.json'), 'utf8')).rows;
  const real = readShard(readFileSync(join(ROOT, 'data/eia-923/2026-10/generation/CA.bin'))).rows().filter((r) => r.plant_id === 99999 && r.prime_mover === 'BA');
  assert.deepEqual(real, pinned);
  assert.equal(new Set(pinned.map((r) => r.sector)).size, pinned.length, 'the increments differ only by sector');
});

test('the committed real 2025 snapshot matches EIA\'s pinned file', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'data/eia-923/2026-10/manifest.json'), 'utf8'));
  assert.equal(m.tables[0].rows, 18888);
  assert.equal(m.raw[0].sha256, entry.vintages[2025].sha256);
  assert.deepEqual(validateEntry(entry), []);
});

/** A stand-in EIA site answering HEAD and GET. */
const site = (files) => async (url, init = {}) => {
  if (url === entry.terms.url) return new Response(`<p>${entry.terms.text}</p>`, { status: 200 });
  const file = files[url];
  if (!file) return new Response('not found', { status: 404 });
  return new Response(init.method === 'HEAD' ? null : file, { status: 200, headers: { 'content-length': String(file.length), 'last-modified': 'Thu, 22 Oct 2026 13:06:37 GMT' } });
};
const URL26 = 'https://www.eia.gov/electricity/data/eia923/xls/f923_2026.zip';

test('release watch: next year\'s year-to-date file is not looked at before August of the year after', async () => {
  const out = tmp();
  await run({ outDir: out });
  const calls = [];
  const f = site({ [URL26]: eia923Zip({ year: 2026, final: false }) });
  const r = await checkDataset({ dataset: 'eia-923', entry: small, outDir: out, today: '2026-10-31', fetch: (u, i) => { calls.push(u); return f(u, i); } });
  assert.deepEqual([r.refreshed, r.failure, r.waiting], [false, undefined, undefined]);
  assert.ok(!calls.includes(URL26), 'the 2026 file is not requested in 2026');
});

test('release watch: from August a year-to-date file is waited on, and a final one refreshes', async () => {
  const out = tmp();
  await run({ outDir: out });
  const waiting = await checkDataset({ dataset: 'eia-923', entry: small, outDir: out, today: '2027-08-15', fetch: site({ [URL26]: eia923Zip({ year: 2026, final: false }) }) });
  assert.deepEqual([waiting.refreshed, waiting.failure, waiting.waiting], [false, undefined, 'the 2026 file is not final yet']);
  const final = await checkDataset({ dataset: 'eia-923', entry: small, outDir: out, today: '2027-09-20', fetch: site({ [URL26]: eia923Zip({ year: 2026 }) }) });
  assert.equal(final.failure, undefined);
  assert.deepEqual([final.refreshed, final.version, final.found], [true, '2027-09', 'new data year 2026']);
});
