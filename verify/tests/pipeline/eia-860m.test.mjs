// EIA-860M, the monthly generator inventory (public grid data task 1.3): one
// workbook a month, read without a zip, watched month to month.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { checkDataset } from '../../../pipeline/check.mjs';
import { validateEntry } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { EXPECTED_HEADERS } from '../../../pipeline/normalize/eia-860m-generators.mjs';
import entry from '../../../pipeline/registry/eia-860m.mjs';
import { eia860mXlsx } from '../../fixtures/data/eia-860m/workbook.mjs';

const small = {
  ...entry,
  vintages: { '2026-09': { ...entry.vintages['2026-09'], sha256: null } },
  tables: entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) })),
};
const tmp = () => mkdtempSync(join(tmpdir(), 'gridprims-860m-'));
const run = (o) => runRecipe({ dataset: 'eia-860m', year: '2026-09', retrieved: '2026-10-31', entry: small, input: eia860mXlsx(), outDir: tmp(), ...o });

test('the workbook is read without a zip; each generator keeps its sheet as its category', async () => {
  const out = tmp();
  const r = await run({ outDir: out });
  assert.equal(r.ok, true, r.failures?.join('\n'));
  const t = r.manifest.tables[0];
  assert.deepEqual([t.rows, t.dataPeriod, t.shards.map((s) => s.state).join(' ')], [5, '2026-09', 'AZ KY TX']);
  assert.equal(r.manifest.raw[0].entries, undefined, 'no zip entries to list');
  assert.match(r.manifest.attribution, /Form EIA-860M \(Oct 2026\)/);
  const tx = readShard(readFileSync(join(out, 'eia-860m/2026-10/generators/TX.bin'))).rows();
  assert.deepEqual(tx.map((g) => [g.generator_id, g.category, g.status]), [['1', 'operating', 'OP'], ['BAT1', 'operating', 'SB'], ['2', 'retired', null]]);
  const battery = tx.find((g) => g.generator_id === 'BAT1');
  assert.equal(battery.status_description, '(SB) Standby/Backup: available for service but not normally used');
  assert.deepEqual([battery.energy_capacity_mwh, battery.planned_retirement_year], [200, null]);
  assert.equal(tx.find((g) => g.generator_id === '2').retirement_year, 2026);
  const [planned] = readShard(readFileSync(join(out, 'eia-860m/2026-10/generators/AZ.bin'))).rows();
  assert.deepEqual([planned.status, planned.planned_operation_month, planned.planned_operation_year], ['V', 9, 2026]);
});

test('coordinates and map links stay in EIA\'s file', async () => {
  const out = tmp();
  const r = await run({ outDir: out });
  assert.ok(!r.manifest.tables[0].columns.some((c) => /latitude|longitude|map/i.test(c.name)));
  const csv = gunzipSync(readFileSync(join(out, 'eia-860m/2026-10/generators.csv.gz'))).toString();
  assert.doesNotMatch(csv, /31\.7569|-106\.375|,Map,/);
});

test('a renamed column fails the release and names the sheet', async () => {
  const header = [...EXPECTED_HEADERS.Planned];
  header[19] = 'Expected Year';
  const r = await run({ input: eia860mXlsx({ header: { Planned: header } }) });
  assert.match(r.failures[0], /^generators: schema: Planned column 20 is "Expected Year", expected "Planned Operation Year"$/);
});

/** A stand-in EIA site answering HEAD and GET. */
const site = (files, calls = []) => async (url, init = {}) => {
  calls.push(`${init.method ?? 'GET'} ${url}`);
  if (url === entry.terms.url) return new Response(`<p>${entry.terms.text}</p>`, { status: 200 });
  const file = files[url];
  if (!file) return new Response('not found', { status: 404 });
  return new Response(init.method === 'HEAD' ? null : file, { status: 200, headers: { 'content-length': String(file.length), 'last-modified': 'Tue, 24 Nov 2026 15:00:00 GMT' } });
};

test('release watch: the next month\'s file refreshes; December rolls to January', async () => {
  const out = tmp();
  await run({ outDir: out });
  const oct = 'https://www.eia.gov/electricity/data/eia860m/xls/october_generator2026.xlsx';
  const r = await checkDataset({ dataset: 'eia-860m', entry: small, outDir: out, today: '2026-11-24', fetch: site({ [oct]: eia860mXlsx() }) });
  assert.equal(r.failure, undefined);
  assert.deepEqual([r.refreshed, r.version, r.found], [true, '2026-11', 'new month 2026-10']);
  const m = JSON.parse(readFileSync(join(out, 'eia-860m/2026-11/manifest.json'), 'utf8'));
  assert.equal(m.tables[0].dataPeriod, '2026-10');
  const dec = { ...small, vintages: { '2026-12': small.vintages['2026-09'] } };
  const calls = [];
  await checkDataset({ dataset: 'eia-860m', entry: dec, outDir: tmp(), today: '2027-01-25', fetch: site({}, calls) });
  assert.ok(calls.includes('HEAD https://www.eia.gov/electricity/data/eia860m/xls/january_generator2027.xlsx'), calls.join('\n'));
});

test('registry: EIA-860M passes the CEII screen and is on the daily watch', async () => {
  assert.deepEqual(validateEntry(entry), []);
  const { WORKFLOWS } = await import('../../../pipeline/workflows.mjs');
  assert.ok(WORKFLOWS.find((w) => w.id === 'refresh-eia').datasets.includes('eia-860m'));
  const m = JSON.parse(readFileSync(join(ROOT, 'data/eia-860m/2026-10/manifest.json'), 'utf8'));
  assert.deepEqual([m.tables[0].rows, m.tables[0].dataPeriod, m.raw[0].sha256], [39908, '2026-09', entry.vintages['2026-09'].sha256]);
});
