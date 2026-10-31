// The EIA-861 pipeline (foundation tasks 1.6, 2.2, 2.3, 7.1 to 7.4, 10.2, 10.3, 10.11).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { matchPosture, postureOf, validateEntry } from '../../../pipeline/lib/registry.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { EXPECTED_HEADER } from '../../../pipeline/normalize/eia-861-sales.mjs';
import entry from '../../../pipeline/registry/eia-861.mjs';
import { eia861Zip, sampleRows } from '../../fixtures/data/eia-861/workbook.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');
/** The real recipe with row bounds that suit the small fixture. */
const small = { ...entry, vintages: { 2025: { ...entry.vintages[2025], sha256: null }, 2026: { ...entry.vintages[2025], sha256: null } }, recipe: entry.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) };
const run = (o) => runRecipe({ dataset: 'eia-861', year: 2025, retrieved: '2026-10-31', entry: small, input: eia861Zip(), ...o });

test('the fixture runs end to end: shards, a CSV download, and a manifest with credits', async () => {
  const out = mkdtempSync(join(tmpdir(), 'gridprims-data-'));
  const r = await run({ outDir: out });
  assert.equal(r.ok, true, r.failures?.join('\n'));
  const dir = join(out, 'eia-861', '2026-10');
  assert.deepEqual(readdirSync(join(dir, 'sales')).sort(), ['MS.bin', 'TX.bin', 'VA.bin']);
  const t = r.manifest.tables[0];
  assert.equal(t.rows, 5);
  assert.match(r.manifest.attribution, /Form EIA-861 \(Oct 2026\)/, 'EIA asks for the publication date');
  assert.match(t.credits[0].note, /Modified by gridprims/);
  for (const s of t.shards) assert.equal(sha(readFileSync(join(dir, s.path))), s.sha256);
  const csv = gunzipSync(readFileSync(join(dir, 'sales.csv.gz'))).toString();
  assert.equal(csv.split('\n')[0].split(',')[0], 'data_year');
  assert.match(csv, /,84,A & N Electric Coop,A,Bundled,O,VA,Cooperative,PJM,40,400,4,50,500,5,,,,0,0,0,90,900,9,0\n/, '"." becomes empty, never 0');
});

test('missing values stay missing; blank text is null; the withheld quirk keeps every row', async () => {
  const out = mkdtempSync(join(tmpdir(), 'gridprims-data-'));
  await run({ outDir: out });
  const tx = readShard(readFileSync(join(out, 'eia-861/2026-10/sales/TX.bin'))).rows();
  const withheld = tx.filter((r) => r.utility_id === 88888);
  assert.deepEqual(withheld.map((r) => [r.seq, r.tot_customers, r.res_revenue]), [[0, 2, null], [1, 11, null]]);
  const unknown = tx.find((r) => r.utility_id === 99);
  assert.equal(unknown.ownership, null);
  assert.equal(unknown.ba_code, null);
});

test('the quirk fixture from the real 2025 file still holds', () => {
  const pinned = JSON.parse(readFileSync(join(ROOT, 'verify/fixtures/data/eia-861/withheld.json'), 'utf8'));
  const real = readShard(readFileSync(join(ROOT, 'data/eia-861/2026-10/sales/TX.bin'))).rows().filter((r) => r.utility_id === 88888);
  assert.deepEqual(real, pinned.rows);
});

test('re-running with unchanged input reproduces every checksum', async () => {
  const a = await run({ outDir: mkdtempSync(join(tmpdir(), 'gridprims-data-')) });
  const b = await run({ outDir: mkdtempSync(join(tmpdir(), 'gridprims-data-')) });
  assert.deepEqual(a.manifest, b.manifest);
});

test('a truncated download fails its row bounds, writes nothing, and keeps the previous version', async () => {
  const out = mkdtempSync(join(tmpdir(), 'gridprims-data-'));
  assert.equal((await run({ outDir: out, input: eia861Zip({ rows: sampleRows(2025, 40) }) })).ok, true);
  const before = readFileSync(join(out, 'eia-861/current.json'), 'utf8');
  const bad = await run({ outDir: out, retrieved: '2026-11-30', input: eia861Zip({ rows: sampleRows(2025).slice(0, 3) }) });
  assert.equal(bad.ok, false);
  assert.match(bad.failures.join('\n'), /rows dropped 93\.3% from 45, more than 5%/);
  assert.equal(readFileSync(join(out, 'eia-861/current.json'), 'utf8'), before);
  assert.ok(!existsSync(join(out, 'eia-861/2026-11')));
});

test('a changed header fails the schema check and names the column', async () => {
  const header = [...EXPECTED_HEADER];
  header[10] = 'Gigawatthours';
  const r = await run({ outDir: mkdtempSync(join(tmpdir(), 'gridprims-data-')), input: eia861Zip({ header }) });
  assert.equal(r.ok, false);
  assert.match(r.failures[0], /schema: column 11 is "Gigawatthours", expected "Megawatthours"/);
});

test('a raw file that does not match the pinned checksum is refused', async () => {
  const r = await runRecipe({ dataset: 'eia-861', year: 2025, retrieved: '2026-10-31', input: eia861Zip(), outDir: mkdtempSync(join(tmpdir(), 'gridprims-data-')) });
  assert.equal(r.ok, false);
  assert.match(r.failures[0], /raw file SHA-256 .* differs from the registry's/);
});

test('the committed real snapshot matches its manifest, and no file is over 20 MiB', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'data/eia-861/2026-10/manifest.json'), 'utf8'));
  const t = m.tables[0];
  assert.equal(t.rows, 2869);
  assert.equal(t.shards.reduce((n, s) => n + s.rows, 0), 2869);
  for (const s of t.shards) {
    const bytes = readFileSync(join(ROOT, 'data/eia-861/2026-10', s.path));
    assert.equal(sha(bytes), s.sha256, s.path);
    assert.ok(bytes.length <= 20 * 1024 * 1024);
  }
  assert.equal(m.raw[0].sha256, entry.vintages[2025].sha256);
});

test('registry: a dataset without a redistribution basis fails, naming it', () => {
  const { redistributionBasis, ...noBasis } = entry;
  assert.match(validateEntry(noBasis).join('\n'), /^eia-861: redistributionBasis is missing/m);
  assert.match(validateEntry({ ...entry, redistributionBasis: { kind: 'probably fine' } }).join('\n'), /does not ship/);
});

test('registry: a dataset without a recipe, or a quirk without a fixture, fails', () => {
  const { recipe, ...noRecipe } = entry;
  assert.match(validateEntry(noRecipe).join('\n'), /recipe is missing/);
  const quirk = { ...entry, recipe: [...entry.recipe, { step: 'quirk', name: 'hour-ending', note: 'EIA-930 stamps hour ending' }] };
  assert.match(validateEntry(quirk).join('\n'), /quirk "hour-ending" has no fixture/);
  assert.match(validateEntry({ ...entry, recipe: [{ step: 'download-and-pray' }] }).join('\n'), /recipe\[0\]\.step must be one of/);
});

test('CEII: an infrastructure dataset without a completed screen fails', () => {
  const lines = { ...entry, id: 'lines', ceii: { infrastructure: true, checklist: { publicSourceOnly: true } } };
  const errors = validateEntry(lines).join('\n');
  assert.match(errors, /lines: ceii\.checklist\.noPlanningModels is not confirmed/);
  assert.match(errors, /noSubstationPoints/);
  assert.deepEqual(validateEntry(entry), []);
});

test('posture: recognized terms mirror, unclear terms derive, restrictive terms derive or link, and never block', () => {
  assert.equal(matchPosture({ text: 'Licensed under CC BY 4.0.' }).posture, 'mirror');
  assert.equal(matchPosture({ text: 'Please cite us.', factual: true }).posture, 'derive');
  assert.equal(matchPosture({ text: 'Please cite us.', factual: false }).posture, 'link');
  assert.equal(matchPosture({ text: 'For non-commercial use only.', factual: true }).posture, 'derive');
  assert.equal(matchPosture({ text: 'For educational use only.', factual: false }).posture, 'link');
  const p = postureOf(entry);
  assert.equal(p.posture, 'mirror');
  assert.equal(p.agrees, true, 'the matcher agrees with the hand-set posture for EIA-861');
});
