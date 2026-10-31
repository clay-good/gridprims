// FERC Form 714 annual peaks through PUDL (public grid data task 1.3): the
// peak skips PUDL's flagged hours, every row carries PUDL's crosswalk to EIA
// ids, and ten sampled peaks match pyarrow's reading of PUDL's own table.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { checkDataset } from '../../../pipeline/check.mjs';
import { validateEntry } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import entry from '../../../pipeline/registry/pudl-ferc714.mjs';

const FIX = join(ROOT, 'verify/fixtures/data/pudl-ferc714');
const files = () => ({ hourly: new Uint8Array(readFileSync(join(FIX, 'hourly.parquet'))), respondents: new Uint8Array(readFileSync(join(FIX, 'respondents.parquet'))) });
const v = entry.vintages[2025];
const small = {
  ...entry,
  vintages: { 2025: { ...v, files: Object.fromEntries(Object.entries(v.files).map(([k, f]) => [k, { ...f, sha256: null }])) } },
  tables: entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) })),
};
const tmp = () => mkdtempSync(join(tmpdir(), 'gridprims-714-'));
const run = (o) => runRecipe({ dataset: 'pudl-ferc714', year: 2025, retrieved: '2026-10-31', entry: small, input: files(), outDir: tmp(), ...o });

test('two Parquet files build one table of peaks, partitioned by year, credited to PUDL', async () => {
  const out = tmp();
  const r = await run({ outDir: out });
  assert.equal(r.ok, true, r.failures?.join('\n'));
  const t = r.manifest.tables[0];
  assert.deepEqual([t.name, t.rows, t.dataPeriod, t.shards.map((s) => s.state).join(' ')], ['annual_peaks', 4, '2024-2025', '2024 2025']);
  assert.deepEqual(r.manifest.raw.map((x) => [x.file, x.name]), [['hourly', 'out_ferc714__hourly_planning_area_demand.parquet'], ['respondents', 'out_ferc714__summarized_demand.parquet']]);
  assert.equal(r.manifest.release, 'v2026.10.0');
  assert.equal(r.manifest.attribution, 'Catalyst Cooperative, Public Utility Data Liberation (PUDL) v2026.10.0, CC BY 4.0, from FERC Form 714.');
  assert.equal(t.license, 'CC-BY-4.0');
  assert.match(t.credits[0].note, /Modified by gridprims/);
});

test('the peak skips flagged hours; the unfiltered maximum and the flagged count stay beside it', async () => {
  const out = tmp();
  await run({ outDir: out });
  const rows = readShard(readFileSync(join(out, 'pudl-ferc714/2026-10/annual_peaks/2025.bin'))).rows();
  const alabama = rows.find((x) => x.respondent_id_ferc714 === 2);
  assert.deepEqual([alabama.peak_mw, alabama.peak_hour_utc, alabama.reported_max_mw, alabama.hours_reported, alabama.hours_flagged], [150.25, '2025-07-01T02:00:00Z', 900, 3, 1]);
  assert.deepEqual([alabama.utility_id_eia, alabama.respondent_type, alabama.timezone], [195, 'utility', 'America/Chicago']);
  const chattanooga = rows.find((x) => x.respondent_id_ferc714 === 55);
  assert.deepEqual([chattanooga.peak_mw, chattanooga.peak_hour_utc, chattanooga.reported_max_mw, chattanooga.hours_flagged], [null, null, 549, 2], 'every hour flagged: no peak');
  const spp = rows.find((x) => x.respondent_id_ferc714 === 146);
  assert.deepEqual([spp.peak_mw, spp.utility_id_eia, spp.balancing_authority_code_eia, spp.eia_code], [59048.93, null, 'SWPP', 59504]);
  assert.ok(!rows.some((x) => x.respondent_id_ferc714 === 999), 'a respondent with no hourly data has no peak row');
});

test('the flagged-hours quirk fixture from the real release still holds', () => {
  const pinned = JSON.parse(readFileSync(join(FIX, 'peaks.json'), 'utf8')).rows;
  const real = readShard(readFileSync(join(ROOT, 'data/pudl-ferc714/2026-10/annual_peaks/2025.bin'))).rows().filter((x) => [55, 91, 146].includes(x.respondent_id_ferc714));
  assert.deepEqual(real, pinned);
});

test('ten sampled peaks match pyarrow\'s reading of PUDL\'s hourly table', () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/pudl-v2026.10.0-ferc714-peaks.json'), 'utf8'));
  assert.equal(ref.sha256, v.files.hourly.sha256, 'the sample was computed from the pinned file');
  assert.equal(ref.peaks.length, 10);
  for (const want of ref.peaks) {
    const [got] = readShard(readFileSync(join(ROOT, `data/pudl-ferc714/2026-10/annual_peaks/${want.year}.bin`))).rows().filter((x) => x.respondent_id_ferc714 === want.respondent_id_ferc714);
    assert.deepEqual([got.peak_mw, got.peak_hour_utc, got.hours_reported], [want.peak_mw, want.peak_hour_utc, want.hours_reported], `${want.respondent_id_ferc714} ${want.year}`);
  }
});

test('a missing column or a respondent-year with no crosswalk fails and writes nothing', async () => {
  const out = tmp();
  const swapped = await run({ outDir: out, input: { hourly: files().respondents, respondents: files().hourly } });
  assert.match(swapped.failures.join('\n'), /^annual_peaks: schema: hourly has no column datetime_utc$/m);
  const unmatched = await run({ outDir: out, input: { ...files(), respondents: new Uint8Array(readFileSync(join(FIX, 'respondents-without-146.parquet'))) } });
  assert.deepEqual(unmatched.failures, ['annual_peaks: schema: respondent 146 has 2025 hours but no crosswalk row']);
  assert.ok(!existsSync(join(out, 'pudl-ferc714')));
});

test('registry: PUDL is CC BY 4.0, pinned to one release, and not on the daily watch', async () => {
  assert.deepEqual(validateEntry(entry), []);
  assert.equal(entry.terms.license, 'CC-BY-4.0');
  const r = await checkDataset({ dataset: 'pudl-ferc714', entry, outDir: tmp(), fetch: () => { throw new Error('no network'); } });
  assert.deepEqual([r.checked, r.refreshed, r.waiting], [false, false, 'pinned to a release; a new one is bumped by hand']);
  const bad = { ...entry, tables: [{ ...entry.tables[0], recipe: entry.tables[0].recipe.map((s) => (s.step === 'read-parquet' ? { ...s, files: ['hourly', 'plants'] } : s)) }] };
  assert.match(validateEntry(bad).join('\n'), /read-parquet names file "plants", which a vintage does not list/);
});
