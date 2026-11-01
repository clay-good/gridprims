// Snapshot diffs (add-data-continuity-ledger 2.1 to 2.5): a dropped column
// named, the largest changes and revision magnitudes, neutral wording, a diff
// kept beside each version as JSON with both versions, and a breaking change
// to a column a page reads pinning only that dataset to its previous version.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runRecipe } from '../../../pipeline/run.mjs';
import { breakingChanges, columnChanges, diffManifests, magnitudes } from '../../../core/lib/snapshot-diff.mjs';
import { tempDir } from '../../lib/temp.mjs';

test('columns: added, removed, renamed in place, and a unit change', () => {
  const before = [{ name: 'id', type: 'str' }, { name: 'mw', type: 'f64', unit: 'MW' }, { name: 'old', type: 'str' }];
  const after = [{ name: 'id', type: 'str' }, { name: 'mw', type: 'f64', unit: 'kW' }, { name: 'new', type: 'str' }, { name: 'extra', type: 'f64' }];
  assert.deepEqual(columnChanges(before, after), { added: ['extra'], removed: [], renamed: [{ from: 'old', to: 'new' }], unit: [{ name: 'mw', from: 'MW', to: 'kW' }] });
});

test('revision magnitudes: median, 90th percentile, and maximum by nearest rank', () => {
  assert.deepEqual(magnitudes([1, -2, 3, 4, 5, 6, 7, 8, 9, -10]), { count: 10, median: 5, p90: 9, max: 10 });
  assert.equal(magnitudes([]), null);
});

/** A tiny dataset recipe over a JSON input, with a principal measure and a column a tool reads. */
const entry = (schemaCols) => ({
  id: 'tiny', title: 'Tiny', publisher: 'Agency', sourceUrl: 'https://example.gov', terms: { url: 'https://example.gov/terms', text: 'public domain' }, redistributionBasis: { kind: 'public domain' },
  attribution: 'Agency ({asOfMonth})', cadence: { every: 'monthly' }, ceii: { infrastructure: false }, owner: 'add-data-continuity-ledger', description: { contains: 'x', excludes: 'y' },
  vintages: { '2026-10': { url: 'https://example.gov/a.json', asOf: '2026-10-01' }, '2026-11': { url: 'https://example.gov/a.json', asOf: '2026-11-01' } },
  recipe: [{ step: 'fetch', url: '{vintage.url}' }],
  tables: [{ name: 't', title: 'T', changelog: { column: 'mw', period: 'year' }, uses: ['id', 'mw'], recipe: [{ step: 'read-json' }, { step: 'normalize', module: `../../verify/fixtures/tiny-normalizer` }, { step: 'validate', key: ['id'], rows: { min: 1, max: 100, maxDropPct: 90, maxRisePct: 900 } }, { step: 'partition', by: null }, { step: 'write-shards' }, { step: 'write-csv-gz' }] }],
  _cols: schemaCols,
});
const input = (rows) => new TextEncoder().encode(JSON.stringify(rows));

test('a second version writes its diff beside it: largest changes, revisions, and both versions; neutral words', async () => {
  const out = tempDir('gridprims-diff-');
  const e = entry();
  assert.equal((await runRecipe({ dataset: 'tiny', year: '2026-10', retrieved: '2026-10-05', entry: e, input: input([{ id: 'a', year: 2024, mw: 10 }, { id: 'b', year: 2025, mw: 20 }]), outDir: out })).ok, true);
  const r = await runRecipe({ dataset: 'tiny', year: '2026-11', retrieved: '2026-11-05', entry: e, input: input([{ id: 'a', year: 2024, mw: 13 }, { id: 'b', year: 2025, mw: 20 }, { id: 'c', year: 2025, mw: 5 }]), outDir: out });
  assert.equal(r.ok, true);
  const diff = JSON.parse(readFileSync(join(out, 'tiny/2026-11/diff.json'), 'utf8'));
  assert.deepEqual([diff.from.version, diff.to.version], ['2026-10', '2026-11']);
  assert.equal(diff.files.changed.length + diff.files.added.length > 0, true);
  const t = diff.tables[0];
  assert.deepEqual(t.rows, { before: 2, after: 3, delta: 1 });
  assert.deepEqual(t.changes.largest, [{ key: 'a', from: 10, to: 13 }]);
  assert.deepEqual(t.changes.revisions, { count: 1, median: 3, p90: 3, max: 3, periods: [2024] });
  assert.doesNotMatch(JSON.stringify(diff), /error|mistake|correction/i);
  assert.equal(JSON.parse(readFileSync(join(out, 'tiny/current.json'), 'utf8')).version, '2026-11');
});

test('a renamed column a tool reads pins the dataset to the version it served, keeps the new one, and fails nothing', async () => {
  const out = tempDir('gridprims-diff-');
  const e = entry();
  await runRecipe({ dataset: 'tiny', year: '2026-10', retrieved: '2026-10-05', entry: e, input: input([{ id: 'a', year: 2024, mw: 10 }]), outDir: out });
  // The publisher renames mw to capacity.
  const r = await runRecipe({ dataset: 'tiny', year: '2026-11', retrieved: '2026-11-05', entry: e, input: input([{ id: 'a', year: 2024, capacity: 10, rename: true }]), outDir: out });
  assert.equal(r.ok, true);
  assert.deepEqual(r.pinned, { held: '2026-10', attempted: '2026-11', breaking: [{ table: 't', column: 'mw', change: 'renamed to capacity' }] });
  assert.equal(JSON.parse(readFileSync(join(out, 'tiny/current.json'), 'utf8')).version, '2026-10', 'still serving the version before');
  assert.ok(existsSync(join(out, 'tiny/2026-11/diff.json')), 'the new version and its diff are kept for inspection');
  assert.deepEqual(breakingChanges(diffManifests({ tables: [{ name: 't', columns: [{ name: 'x', type: 'f64' }], shards: [] }] }, { tables: [{ name: 't', columns: [{ name: 'x', type: 'f64' }], shards: [] }] }), { t: ['x'] }), []);
});
