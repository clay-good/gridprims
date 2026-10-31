// EAGLE-I county outages (add-electrification-tools 1.5): yearly files
// streamed a line at a time from disk and hashed as they are read, the 1%
// rule on modeled customers, bridging across a missing hour and across New
// Year's Eve, and events in state shards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runRecipe } from '../../../pipeline/run.mjs';
import { validateEntry } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import entry from '../../../pipeline/registry/eaglei.mjs';
import { tempDir } from '../../lib/temp.mjs';

const v = entry.vintages[2025];
const small = {
  ...entry,
  vintages: { 2025: { ...v, files: Object.fromEntries(Object.entries(v.files).map(([k, f]) => [k, { ...f, sha256: null }])) } },
  tables: entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 1, max: 1000 } } : s)) })),
};
const HEADER = 'fips_code,county,state,customers_out,run_start_time';
const MCC = '﻿County_FIPS,Customers\n48453,10000\n1001,20000\n';
const COVERAGE = 'year,state,total_customers,min_covered,max_covered,min_pct_covered,max_pct_covered\n1/1/18,TX,100,80,90,0.8,0.9\n1/1/18,AL,100,40,45,0.4,0.45\n';

/** Year files on disk: Travis County, TX (48453), and Autauga County, AL (01001, written 01001). */
function yearFiles(dir) {
  const files = {};
  const body = {
    // One interval at 2%: an event of 0.25 hours. Then 1% at 23:30 and 23:45 on December 31, continuing in 2015.
    2014: ['48453,Travis,Texas,200,2014-11-01 04:00:00', '48453,Travis,Texas,50,2014-11-01 04:15:00', '48453,Travis,Texas,100,2014-12-31 23:30:00', '48453,Travis,Texas,100,2014-12-31 23:45:00'],
    // A missing hour (00:15 to 01:00) is bridged; 01:30 is under 1% and ends the run.
    2015: ['48453,Travis,Texas,150,2015-01-01 00:00:00', '48453,Travis,Texas,150,2015-01-01 01:15:00', '48453,Travis,Texas,10,2015-01-01 01:30:00', '01001,Autauga,Alabama,400,2015-06-01 12:00:00'],
  };
  for (let y = 2014; y <= 2025; y++) {
    const path = join(dir, `eaglei_outages_${y}.csv`);
    writeFileSync(path, `${[HEADER, ...(body[y] ?? [])].join('\n')}\n`);
    files[`y${y}`] = path;
  }
  return files;
}

test('the registry entry is valid', () => {
  assert.deepEqual(validateEntry(entry), []);
});

test('streamed from disk: events by the 1% rule, bridged across a missing hour and New Year\'s Eve, in state shards', async () => {
  const dir = tempDir('gridprims-eaglei-in-');
  const out = tempDir('gridprims-eaglei-out-');
  const input = { ...yearFiles(dir), mcc: new TextEncoder().encode(MCC), coverage: new TextEncoder().encode(COVERAGE) };
  const r = await runRecipe({ dataset: 'eaglei', year: 2025, retrieved: '2026-10-31', entry: small, input, outDir: out });
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  const rows = (table, shard) => readShard(readFileSync(join(out, 'eaglei/2026-10', table, `${shard}.bin`))).rows();
  assert.deepEqual(rows('events', 'TX'), [
    { state: 'TX', fips: '48453', start: '2014-11-01T04:00', year: 2014, hours: 0.25, peak_pct_out: 2 },
    { state: 'TX', fips: '48453', start: '2014-12-31T23:30', year: 2014, hours: 2, peak_pct_out: 1.5 },
  ]);
  assert.deepEqual(rows('events', 'AL'), [{ state: 'AL', fips: '01001', start: '2015-06-01T12:00', year: 2015, hours: 0.25, peak_pct_out: 2 }]);
  assert.deepEqual(rows('counties', 'TX'), [{ state: 'TX', fips: '48453', customers: 10000 }]);
  assert.deepEqual(rows('coverage', 'US').map((x) => [x.state, x.year, x.max_pct_covered]), [['TX', 2018, 90], ['AL', 2018, 45]]);
  // Each streamed file's hash and size are recorded, as if it had been fetched whole.
  const raw = r.manifest.raw.find((x) => x.file === 'y2014');
  assert.equal(raw.name, 'eaglei_outages_2014.csv');
  assert.equal(raw.sha256, createHash('sha256').update(readFileSync(input.y2014)).digest('hex'));
  assert.equal(raw.bytes, readFileSync(input.y2014).length);
});

test('a changed header is refused rather than misread', async () => {
  const dir = tempDir('gridprims-eaglei-in-');
  const input = { ...yearFiles(dir), mcc: new TextEncoder().encode(MCC), coverage: new TextEncoder().encode(COVERAGE) };
  writeFileSync(input.y2020, 'fips,county,state,out,time\n');
  const r = await runRecipe({ dataset: 'eaglei', year: 2025, retrieved: '2026-10-31', entry: small, input, outDir: tempDir('gridprims-eaglei-out-') });
  assert.equal(r.ok, false);
  assert.match(r.failures.join('\n'), /2020: header is "fips,county,state,out,time", without fips_code/);
});
