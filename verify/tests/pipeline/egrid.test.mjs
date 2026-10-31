// EPA eGRID and the Power Profiler ZIP lookup (public grid data task 1.3):
// two workbooks, three tables, location kept to the county.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { validateEntry } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import entry from '../../../pipeline/registry/egrid.mjs';
import { COLUMNS as PLANT_COLUMNS, normalize as normalizePlants } from '../../../pipeline/normalize/egrid-plants.mjs';
import { egridFiles, plants } from '../../fixtures/data/egrid/workbook.mjs';
import { tempDir } from '../../lib/temp.mjs';

const v = entry.vintages[2023];
const small = {
  ...entry,
  vintages: { 2023: { ...v, files: Object.fromEntries(Object.entries(v.files).map(([k, f]) => [k, { ...f, sha256: null }])) } },
  tables: entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) })),
};
const tmp = () => tempDir('gridprims-egrid-');
const run = (o) => runRecipe({ dataset: 'egrid', year: 2023, retrieved: '2026-10-31', entry: small, input: egridFiles(), outDir: tmp(), ...o });
const rows = (out, table, shard) => readShard(readFileSync(join(out, 'egrid/2026-10', table, `${shard}.bin`))).rows();

test('two workbooks build three tables; small ones are one national shard', async () => {
  const out = tmp();
  const r = await run({ outDir: out });
  assert.equal(r.ok, true, r.failures?.join('\n'));
  assert.deepEqual(r.manifest.tables.map((t) => [t.name, t.rows, t.partition, t.shards.map((s) => s.state).join(' ')]), [
    ['plants', 3, 'state', 'AK TX WY'], ['subregions', 3, null, 'US'], ['zip_subregions', 6, null, 'US']]);
  assert.deepEqual(r.manifest.raw.map((x) => x.file), ['data', 'zips']);
  assert.match(r.manifest.attribution, /eGRID\), eGRID2023 \(revision 2\), Jun 2025\. https:\/\/www\.epa\.gov\/egrid$/);
});

test('plants keep EPA\'s units and "--" is not reported; coordinates stay in EPA\'s file', async () => {
  const out = tmp();
  const r = await run({ outDir: out });
  const [parish] = rows(out, 'plants', 'TX');
  assert.deepEqual([parish.plant_id, parish.subregion, parish.co2_tons, parish.co2_rate_lb_mwh, parish.fips_county], [3470, 'ERCT', 14000000.5, 1866.67, '157']);
  const [alakanuk] = rows(out, 'plants', 'AK');
  assert.deepEqual([alakanuk.co2_rate_lb_mwh, alakanuk.co2_tons, alakanuk.fips_county], [null, null, null]);
  const cols = r.manifest.tables[0].columns;
  assert.equal(cols.find((c) => c.name === 'co2_tons').unit, 'short tons', 'pages convert to metric tons; the table keeps EPA\'s unit');
  assert.ok(!cols.some((c) => /^(lat|lon|latitude|longitude)$/.test(c.name)));
  assert.doesNotMatch(gunzipSync(readFileSync(join(out, 'egrid/2026-10/plants.csv.gz'))).toString(), /31\.7569|-106\.375/);
});

test('subregions carry total output and non-baseload rates in lb/MWh', async () => {
  const out = tmp();
  await run({ outDir: out });
  const subs = rows(out, 'subregions', 'US');
  const erct = subs.find((s) => s.subregion === 'ERCT');
  assert.deepEqual([erct.co2_rate_lb_mwh, erct.nonbaseload_co2_rate_lb_mwh, erct.co2e_rate_lb_mwh], [733.862, 1242.733, 736.629]);
  assert.equal(subs.find((s) => s.subregion === 'HIMS').nonbaseload_co2_rate_lb_mwh, null);
});

test('ZIPs stay five-digit text, list up to three subregions, and drop EPA\'s blank rows', async () => {
  const out = tmp();
  await run({ outDir: out });
  const zips = rows(out, 'zip_subregions', 'US');
  assert.deepEqual(zips.map((z) => z.zip), ['00001', '00002', '00501', '30525', '78701', '82716']);
  assert.deepEqual(zips.find((z) => z.zip === '00002'), { zip: '00002', subregion_1: 'AKMS', subregion_2: null, subregion_3: null, subregions: 1 });
  assert.deepEqual(zips.find((z) => z.zip === '30525'), { zip: '30525', subregion_1: 'SRTV', subregion_2: 'SRSO', subregion_3: 'SRVC', subregions: 3 });
});

test('a missing code, a bad ZIP, or a repeated plant fails the release and writes nothing', async () => {
  const cells = (r) => r.map((value) => ({ value }));
  const allBut = (code) => PLANT_COLUMNS.map(([, c]) => c).filter((c) => c !== code);
  const missing = normalizePlants([cells(allBut('PLCO2AN')), cells(allBut('PLCO2AN')), cells([3470])], 2).problems;
  assert.deepEqual(missing, ['no column PLCO2AN'], 'only the codes we read are required');
  const out = tmp();
  const files = egridFiles({ zips: [['7870', 'ERCT', null, null], ['78701', 'ERCT', null, null], ['78702', 'ERCT', null, null], ['78703', 'ERCT', null, null]] });
  const bad = await run({ outDir: out, input: files });
  assert.match(bad.failures.join('\n'), /zip_subregions: schema: row with ZIP "7870" is not five digits/);
  const twice = await run({ outDir: out, input: egridFiles({ plants: [...plants(), plants()[1]] }) });
  assert.match(twice.failures.join('\n'), /^plants: duplicate key 3470$/m);
  assert.ok(!existsSync(join(out, 'egrid')));
});

test('every registry entry carries its terms, license basis, and credit text', async () => {
  const dir = join(ROOT, 'pipeline/registry');
  for (const f of readdirSync(dir)) {
    const e = (await import(pathToFileURL(join(dir, f)).href)).default;
    assert.deepEqual(validateEntry(e), [], e.id);
    assert.ok(e.terms.text.length > 40 && /^\d{4}-\d{2}-\d{2}$/.test(e.terms.captured), `${e.id} terms`);
    assert.ok(['public domain', 'named license'].includes(e.redistributionBasis.kind), `${e.id} basis`);
    assert.match(e.attribution, /\S{20,}|.{40,}/, `${e.id} credit`);
    const cur = join(ROOT, 'data', e.id, 'current.json');
    if (existsSync(cur)) {
      const m = JSON.parse(readFileSync(join(ROOT, 'data', e.id, JSON.parse(readFileSync(cur, 'utf8')).version, 'manifest.json'), 'utf8'));
      assert.doesNotMatch(m.attribution, /\{asOfMonth\}|\{release\}/, `${e.id} credit is filled in`);
      for (const t of m.tables) assert.ok(t.license && t.credits.length, `${e.id} ${t.name} license and credits`);
    }
  }
});
