// gridprims_query_data over the committed EIA-861 snapshot (MCP task 2.4).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from '../../../mcp/protocol.mjs';
import { catalog } from '../../../mcp/data.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { ROOT, modern } from './mcp-helpers.mjs';

const q = (args) => createServer().handle(modern(1, 'tools/call', { name: 'gridprims_query_data', arguments: args }));

test('a state lookup returns the same rows the shard holds, with the source stamp', async () => {
  const r = (await q({ dataset: 'eia-861', filter: { state: 'VT' }, limit: 500 })).result;
  assert.equal(r.isError, false);
  const { dataset, rows, matched } = r.structuredContent;
  const shard = readShard(readFileSync(join(ROOT, 'data/eia-861/2026-10/sales/VT.bin'))).rows();
  assert.equal(matched, shard.length);
  assert.deepEqual(rows, shard);
  assert.equal(dataset.publisher, 'U.S. Energy Information Administration');
  assert.equal(dataset.asOf, '2026-10-07');
  assert.equal(dataset.dataPeriod, '2025');
  assert.match(dataset.attribution, /\(Oct 2026\)/);
});

test('exact-match filters across columns, with a limit and a truncation flag', async () => {
  const r = (await q({ dataset: 'eia-861', filter: { ownership: 'Cooperative' }, limit: 5 })).result.structuredContent;
  assert.equal(r.rows.length, 5);
  assert.ok(r.matched > 5);
  assert.equal(r.truncated, true);
  assert.ok(r.rows.every((x) => x.ownership === 'Cooperative'));
});

test('unknown datasets and columns name the fix', async () => {
  const none = (await q({ dataset: 'eia-999' })).result;
  assert.equal(none.isError, true);
  assert.match(none.content[0].text, /node pipeline\/get-data\.mjs or node pipeline\/build-data\.mjs/);
  const col = (await q({ dataset: 'eia-861', filter: { zip: '78701' } })).result;
  assert.match(col.content[0].text, /No column zip\. Columns: data_year, utility_id/);
});

test('the dataset catalog resource lists EIA-861 with its version, posture, and columns', async () => {
  const r = await createServer().handle(modern(1, 'resources/read', { uri: 'gridprims://datasets' }));
  const { datasets } = JSON.parse(r.result.contents[0].text);
  assert.deepEqual(datasets, catalog());
  const e = datasets.find((d) => d.id === 'eia-861');
  assert.equal(e.version, '2026-10');
  assert.equal(e.posture, 'mirror');
  assert.ok(e.tables[0].columns.some((c) => c.name === 'res_sales' && c.unit === 'MWh'));
});

test('a table argument reads that table; an unknown one lists the tables', async () => {
  const r = (await q({ dataset: 'eia-861', table: 'reliability', filter: { state: 'TX', utility_id: 44372 } })).result.structuredContent;
  assert.equal(r.table, 'reliability');
  assert.equal(r.matched, 1);
  assert.equal(r.rows[0].other_with_med_saidi, 232.05);
  assert.ok(r.columns.some((c) => c.name === 'ieee_with_med_saidi' && c.unit === 'minutes per year'));
  const counties = (await q({ dataset: 'eia-861', table: 'service_territory', filter: { state: 'TX', county: 'Travis' }, limit: 50 })).result.structuredContent;
  assert.ok(counties.rows.some((x) => x.utility_name === 'Austin Energy'));
  const bad = (await q({ dataset: 'eia-861', table: 'outages' })).result;
  assert.match(bad.content[0].text, /No table outages\. Tables: sales, delivery, reliability, service_territory\./);
});
