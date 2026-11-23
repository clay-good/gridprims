// The measured emissions through gridprims_query_data (add-measured-plant-emissions
// 4.1): the same unit, plant, and regional figures the pages show, with EPA's
// own terms on the dataset, from the clone alone and with no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from '../../../mcp/protocol.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { catalog } from '../../../mcp/data.mjs';
import { plantPages } from '../../../site/entities/plants.mjs';
import { loadComparison } from '../../../site/entities/estimated-vs-measured.mjs';
import { ROOT, modern } from './mcp-helpers.mjs';

const q = (args) => createServer().handle(modern(1, 'tools/call', { name: 'gridprims_query_data', arguments: args }));
const built = existsSync(join(ROOT, 'data/epa-camd/current.json'));
const skip = !built && 'epa-camd is not built';

test('the dataset is in the catalog with EPA\'s own terms and its three tables', { skip }, () => {
  const d = catalog().find((x) => x.id === 'epa-camd');
  assert.ok(d, 'epa-camd is in the catalog');
  assert.equal(d.posture, 'derive');
  assert.match(d.publisher, /Environmental Protection Agency/);
  assert.match(d.attribution, /Clean Air Markets Program Data/);
  assert.deepEqual(d.tables.map((t) => t.name).sort(), ['region_hourly', 'units', 'units_monthly']);
  for (const t of d.tables) assert.equal(t.dataPeriod, '2024-2025');
});

test('a plant\'s monthly rows through the server are the rows its page shows', { skip }, async () => {
  const plants = plantPages(join(ROOT, 'data'));
  const plant = plants.plants.find((p) => p.measured && p.measured.units.length > 1);
  const r = (await q({ dataset: 'epa-camd', table: 'units_monthly', filter: { plant_id: plant.id }, limit: 500 })).result;
  assert.equal(r.isError, false);
  const rows = r.structuredContent.rows.filter((x) => x.year === plant.measured.latest.year);
  const tonnes = rows.reduce((n, x) => n + x.co2_tonnes, 0);
  // The page's annual figure is the sum of these rows, to the rounding the page shows.
  assert.ok(Math.abs(tonnes - plant.measured.latest.co2_tonnes) < 0.01, `${tonnes} against ${plant.measured.latest.co2_tonnes}`);
  assert.equal(new Set(rows.map((x) => x.unit_id)).size, plant.measured.units.filter((u) => u.reported).length);
  assert.match(r.structuredContent.dataset.attribution, /EPA/);
});

test('a region\'s hours through the server are the hours the comparison priced', { skip }, async () => {
  const comparison = loadComparison(join(ROOT, 'data'));
  const row = comparison.rows.find((x) => x.informative);
  // The server answers in pages of at most 500 rows, so the count is checked against the whole
  // year and the values against the first page.
  const r = (await q({ dataset: 'epa-camd', table: 'region_hourly', filter: { region: row.region, year: row.year }, limit: 500 })).result;
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.matched, row.hours + row.unmatchedHours);
  assert.equal(r.structuredContent.truncated, true);
  const rows = r.structuredContent.rows;
  const shard = readShard(readFileSync(join(ROOT, 'data/epa-camd', JSON.parse(readFileSync(join(ROOT, 'data/epa-camd/current.json'), 'utf8')).version, 'region_hourly', `${row.region}-${row.year}.bin`))).rows();
  assert.deepEqual(rows, shard.slice(0, 500));
  // Gross load splits into the fuel columns the comparison prices.
  const byFuel = ['load_col_mwh', 'load_ng_mwh', 'load_oil_mwh', 'load_oth_mwh'].reduce((n, c) => n + rows.reduce((a, x) => a + x[c], 0), 0);
  assert.ok(Math.abs(byFuel - rows.reduce((n, x) => n + x.gross_load_mwh, 0)) / byFuel < 1e-4);
});

test('the units table places each unit in its plant and region, by id', { skip }, async () => {
  const r = (await q({ dataset: 'epa-camd', table: 'units', filter: { state: 'DE' }, limit: 200 })).result;
  assert.equal(r.isError, false);
  const rows = r.structuredContent.rows;
  assert.ok(rows.length > 0);
  for (const u of rows) {
    assert.equal(typeof u.plant_id, 'number');
    assert.ok(['yes', 'no'].includes(u.apportioned));
    assert.ok(['yes', 'no'].includes(u.egrid_match));
    assert.ok(!('latitude' in u) && !('longitude' in u));
  }
});
