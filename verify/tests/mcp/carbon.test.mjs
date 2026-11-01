// Hourly carbon through the MCP server (add-hourly-carbon 3.2): the load-shift
// worked examples give the website's numbers, a region-year of EIA-930 comes
// back from one shard, and hourly emissions computed from those rows equal
// the website's, which reads the same shard.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from '../../../mcp/protocol.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { intakeFile } from '../../../core/intake/index.mjs';
import { gridHours, hourlyEmissions, toHours } from '../../../core/lib/hourly-carbon.mjs';
import { ROOT, modern } from './mcp-helpers.mjs';

const built = existsSync(join(ROOT, 'data/eia-930/current.json'));

test('every load-shift worked example gives the website\'s numbers through the server', async () => {
  const { manifest, impl } = getTool('carbon.load-shift.estimate');
  const s = createServer();
  let id = 0;
  for (const ex of manifest.examples) {
    const r = await s.handle(modern(++id, 'tools/call', { name: 'gridprims_run', arguments: { tool: manifest.id, inputs: ex.inputs } }));
    assert.equal(r.result.isError, false, ex.id);
    assert.deepEqual(r.result.structuredContent, runTool(manifest, impl, ex.inputs), ex.id);
  }
});

test('a region-year of hourly grid data reads one shard, and emissions from it equal the website\'s', { skip: !built && 'eia-930 is not built' }, async () => {
  const { version } = JSON.parse(readFileSync(join(ROOT, 'data/eia-930/current.json'), 'utf8'));
  // A year of hours, 500 rows a page.
  const s = createServer();
  const rows = [];
  let page;
  do {
    page = (await s.handle(modern(1, 'tools/call', { name: 'gridprims_query_data', arguments: { dataset: 'eia-930', table: 'hourly', filter: { ba: 'ERCO', year: 2026 }, limit: 500, offset: rows.length } }))).result;
    assert.equal(page.isError, false, page.content[0].text);
    rows.push(...page.structuredContent.rows);
  } while (page.structuredContent.truncated);
  const shard = readShard(readFileSync(join(ROOT, 'data/eia-930', version, 'hourly/ERCO-2026.bin'))).rows();
  assert.equal(page.structuredContent.matched, shard.length);
  assert.deepEqual(rows, shard);
  // The workbench's sample office file in ERCOT, June 2026.
  const file = await intakeFile(new Uint8Array(readFileSync(join(ROOT, 'site/samples/sample-office-15min.csv'))), { name: 'sample-office-15min.csv' }, { zone: 'America/Chicago' });
  const load = toHours(file.series[0]).hours;
  const fromMcp = hourlyEmissions({ load, grid: gridHours(rows), zone: 'America/Chicago', ba: 'ERCO' });
  const fromSite = hourlyEmissions({ load, grid: gridHours(shard), zone: 'America/Chicago', ba: 'ERCO' });
  assert.deepEqual(fromMcp, fromSite);
  assert.ok(fromSite.t > 0 && fromSite.excluded.hours < load.size);
});
