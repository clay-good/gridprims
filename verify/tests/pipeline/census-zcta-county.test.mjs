// The Census 2020 ZCTA-to-county file (public grid data task 1.3): land
// overlap only, blank ZCTAs dropped, each county's share of the ZCTA's land,
// partitioned by state for the on-device lookup.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { EXPECTED_HEADER } from '../../../pipeline/normalize/census-zcta-county.mjs';
import entry from '../../../pipeline/registry/census-zcta-county.mjs';
import { tempDir } from '../../lib/temp.mjs';

const row = (zcta, zland, county, name, part) => ['1', zcta, zcta ? `ZCTA5 ${zcta}` : '', zland, '0', 'G6350', 'B5', 'S', '2', county, name, '9', '0', 'G4020', 'H1', 'A', part, '0'].join('|');
/** Census writes a UTF-8 byte-order mark, a header, and CRLF-free lines with a trailing newline. */
const file = (lines, header = EXPECTED_HEADER) => new TextEncoder().encode(`﻿${[header.join('|'), ...lines].join('\n')}\n`);
const sample = () => file([
  row('', '', '01003', 'Baldwin County', '339765765'), // county land outside every ZCTA
  row('78701', '4000000', '48453', 'Travis County', '4000000'),
  row('82716', '1000', '56005', 'Campbell County', '750'), row('82716', '1000', '56011', 'Crook County', '250'),
  row('55313', '279048950', '27053', 'Hennepin County', '0'), // water only
  row('86515', '600', '04001', 'Apache County', '400'), row('86515', '600', '35031', 'McKinley County', '200'), // a ZCTA in two states
  row('00601', '166659789', '72001', 'Adjuntas Municipio', '166659789'),
]);
const small = { ...entry, vintages: { 2020: { ...entry.vintages[2020], sha256: null } }, tables: entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) })) };
const tmp = () => tempDir('gridprims-zcta-');
const run = (o) => runRecipe({ dataset: 'census-zcta-county', year: 2020, retrieved: '2026-10-31', entry: small, input: sample(), outDir: tmp(), ...o });

test('land overlap only: blank ZCTAs and water-only rows are dropped; leading zeros survive', async () => {
  const out = tmp();
  const r = await run({ outDir: out });
  assert.equal(r.ok, true, r.failures?.join('\n'));
  assert.deepEqual(r.manifest.tables[0].shards.map((s) => s.state).join(' '), 'AZ NM PR TX WY');
  assert.equal(r.manifest.tables[0].rows, 6);
  const [pr] = readShard(readFileSync(join(out, 'census-zcta-county/2026-10/zcta_counties/PR.bin'))).rows();
  assert.deepEqual([pr.zcta, pr.county_fips, pr.state_fips], ['00601', '72001', '72']);
});

test('a ZCTA across counties or states lists each with its share of the ZCTA\'s land', async () => {
  const out = tmp();
  await run({ outDir: out });
  const wy = readShard(readFileSync(join(out, 'census-zcta-county/2026-10/zcta_counties/WY.bin'))).rows();
  assert.deepEqual(wy.map((x) => [x.county_name, x.share_of_zcta_land]), [['Campbell County', 0.75], ['Crook County', 0.25]]);
  const shards = ['AZ', 'NM'].map((st) => readShard(readFileSync(join(out, `census-zcta-county/2026-10/zcta_counties/${st}.bin`))).rows()[0]);
  assert.deepEqual(shards.map((x) => [x.zcta, x.state, x.share_of_zcta_land]), [['86515', 'AZ', 0.666667], ['86515', 'NM', 0.333333]]);
});

test('a changed header or an unknown state fails and writes nothing', async () => {
  const out = tmp();
  const header = [...EXPECTED_HEADER];
  header[16] = 'AREALAND';
  assert.match((await run({ outDir: out, input: file([row('78701', '1', '48453', 'Travis County', '1')], header) })).failures[0], /column 17 is "AREALAND", expected "AREALAND_PART"/);
  const bad = await run({ outDir: out, input: file([row('78701', '1', '48453', 'Travis County', '1'), row('99999', '1', '99001', 'Nowhere', '1'), row('78702', '1', '48453', 'Travis County', '1'), row('78703', '1', '48453', 'Travis County', '1')]) });
  assert.match(bad.failures.join('\n'), /ZCTA "99999", county "99001" is not a five-digit pair in a known state/);
  assert.ok(!existsSync(join(out, 'census-zcta-county')));
});

test('the committed 2020 file: 46,953 land-sharing rows, every share between 0 and 1, and shares summing to 1 per ZCTA', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'data/census-zcta-county/2026-10/manifest.json'), 'utf8'));
  assert.equal(m.tables[0].rows, 46953);
  assert.equal(m.raw[0].sha256, entry.vintages[2020].sha256);
  const sums = new Map();
  for (const s of m.tables[0].shards) {
    for (const x of readShard(readFileSync(join(ROOT, 'data/census-zcta-county/2026-10', s.path))).rows()) {
      assert.ok(x.share_of_zcta_land > 0 && x.share_of_zcta_land <= 1, `${x.zcta} ${x.county_fips}`);
      sums.set(x.zcta, (sums.get(x.zcta) ?? 0) + x.share_of_zcta_land);
    }
  }
  assert.equal(sums.size, 33791);
  for (const [z, total] of sums) assert.ok(Math.abs(total - 1) < 1e-5, `${z} shares sum to ${total}`);
});
