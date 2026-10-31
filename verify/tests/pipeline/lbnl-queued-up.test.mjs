// LBNL Queued Up (public grid data tasks 1.3 and 5.2): every request as LBNL
// lists it, the posture derived from the captured terms, and active capacity
// by type matching LBNL's own summary tab within 0.5%.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { postureOf } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { EXPECTED_HEADER, excelDate } from '../../../pipeline/normalize/lbnl-queue.mjs';
import { writeXlsx } from '../../lib/zip-writer.mjs';
import entry from '../../../pipeline/registry/lbnl-queued-up.mjs';
import { tempDir } from '../../lib/temp.mjs';

const req = (f) => EXPECTED_HEADER.map((h) => (h in f ? f[h] : null));
const base = { q_status: 'active', q_date: 43511, county: 'Coconino', state: 'AZ', fips_code: 4005, poi_name: 'Twin Arrows 69kV Substation', region: 'West', utility: 'Arizona Public Service', service: 'ERIS', project_type: 'Generation', type_1: 'Solar', type_clean: 'Solar', mw_1: 20, q_year: 2019 };
const book = (rows, header = EXPECTED_HEADER) => writeXlsx({ Introduction: [[]], '03. Complete Queue Data': [['RETURN TO CONTENTS'], header, ...rows] });
const sample = () => book([
  req({ ...base, q_id: 'Q1', entity: 'APS' }),
  req({ ...base, q_id: 1, entity: 'Duke', state: 'FL', county: 'Polk', fips_code: 12105, q_status: 'operational', on_date: 35521, type_clean: 'Gas', mw_1: 300 }),
  req({ ...base, q_id: 1, entity: 'Duke', state: null, county: null, fips_code: null, q_status: 'operational', on_date: 35521, type_clean: 'Gas', mw_1: 300 }),
  req({ ...base, q_id: 'W7', entity: 'MISO', state: 'IA', county: 'Story', fips_code: 19169, q_status: 'withdrawn', wd_date: 45000, type_clean: 'Wind', mw_1: 150.5 }),
]);
const small = { ...entry, vintages: { 2025: { ...entry.vintages[2025], sha256: null } }, tables: entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) })) };
const tmp = () => tempDir('gridprims-queue-');
const run = (o) => runRecipe({ dataset: 'lbnl-queued-up', year: 2025, retrieved: '2026-10-31', entry: small, input: sample(), outDir: tmp(), ...o });
const shard = (out, s) => readShard(readFileSync(join(out, 'lbnl-queued-up/2026-10/requests', `${s}.bin`))).rows();

test('every request is kept; a repeated id is numbered; a request with no state has its own shard', async () => {
  const out = tmp();
  const r = await run({ outDir: out });
  assert.equal(r.ok, true, r.failures?.join('\n'));
  const t = r.manifest.tables[0];
  assert.deepEqual([t.rows, t.unmatched, t.shards.map((s) => s.state).join(' ')], [4, 1, 'AZ FL IA no_state']);
  assert.deepEqual([shard(out, 'FL')[0].seq, shard(out, 'no_state')[0].seq], [0, 1]);
});

test('dates become ISO, FIPS codes keep their zero, and substation names stay in LBNL\'s file', async () => {
  const out = tmp();
  const r = await run({ outDir: out });
  const [aps] = shard(out, 'AZ');
  assert.deepEqual([aps.q_id, aps.q_date, aps.fips_code, aps.mw_1, aps.type_clean], ['Q1', '2019-02-15', '04005', 20, 'Solar']);
  assert.deepEqual([shard(out, 'IA')[0].wd_date, shard(out, 'FL')[0].on_date, shard(out, 'FL')[0].q_id], ['2023-03-15', '1997-04-01', '1']);
  assert.ok(!r.manifest.tables[0].columns.some((c) => c.name.startsWith('poi')));
  assert.deepEqual([excelDate(61), excelDate(43466), excelDate(null)], ['1900-03-01', '2019-01-01', null]);
});

test('the posture comes from the captured terms: CC BY 4.0 is recognized, so it mirrors, with LBNL and GridTracker credited', async () => {
  assert.equal(entry.posture, undefined, 'no hand-set posture');
  assert.deepEqual(postureOf(entry), { posture: 'mirror', advisory: { posture: 'mirror', license: 'CC-BY-4.0', reason: 'recognized CC-BY-4.0' }, agrees: true });
  const r = await run();
  assert.equal(r.manifest.posture, 'mirror');
  assert.match(r.manifest.attribution, /^Lawrence Berkeley National Laboratory and GridTracker\./);
  assert.equal(r.manifest.tables[0].license, 'CC-BY-4.0');
  const unrecognized = postureOf({ ...entry, terms: { ...entry.terms, license: undefined, text: 'Please contact us before reusing this file.' } });
  assert.equal(unrecognized.posture, 'derive', 'terms that are not a recognized license still build, as derived values');
});

test('a changed field name fails and writes nothing', async () => {
  const out = tmp();
  const header = [...EXPECTED_HEADER];
  header[25] = 'capacity_mw';
  const r = await run({ outDir: out, input: book([req({ ...base, q_id: 'Q1', entity: 'APS' })], header) });
  assert.match(r.failures[0], /column 26 is "capacity_mw", expected "mw_1"/);
  assert.ok(!existsSync(join(out, 'lbnl-queued-up')));
});

test('active capacity by type matches LBNL\'s own 2025 summary within 0.5%', () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/lbnl-queued-up-2026-active-capacity.json'), 'utf8'));
  const dir = join(ROOT, 'data/lbnl-queued-up/2026-10/requests');
  const active = readdirSync(dir).flatMap((f) => readShard(readFileSync(join(dir, f))).rows()).filter((r) => r.q_status === 'active');
  for (const want of ref.standalone2025) {
    const gw = active.filter((r) => want.rows.includes(r.type_clean)).reduce((n, r) => n + (r.mw_1 ?? 0), 0) / 1000;
    assert.ok(Math.abs(gw - want.gw) / want.gw < 0.005, `${want.type}: ${gw.toFixed(3)} GW against LBNL's ${want.gw.toFixed(3)}`);
  }
});

test('the repeated-id quirk fixture from the real file still holds', () => {
  const pinned = JSON.parse(readFileSync(join(ROOT, 'verify/fixtures/data/lbnl-queued-up/repeated.json'), 'utf8')).rows;
  const real = ['FL', 'no_state'].flatMap((s) => readShard(readFileSync(join(ROOT, `data/lbnl-queued-up/2026-10/requests/${s}.bin`))).rows()).filter((r) => r.q_id === '1' && r.entity === 'Duke');
  assert.deepEqual(real, pinned);
});
