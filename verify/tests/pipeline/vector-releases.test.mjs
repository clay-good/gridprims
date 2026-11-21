// Versioned bill test vector releases (add-tariff-conformance-suite 2.4): the committed releases are in
// order; a release edited after it was cut, a missing file, or vectors changed without a new release all
// fail by name.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RELEASES_DIR, VECTORS_DIR, changelog, checkReleases, releaseFile } from '../../../pipeline/lib/vector-releases.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

/** A scratch copy of the conformance folder to break. */
function scratch() {
  const root = mkdtempSync(join(tmpdir(), 'gp-releases-'));
  cpSync(join(ROOT, 'data/curated/conformance'), join(root, 'data/curated/conformance'), { recursive: true });
  return root;
}

test('the committed releases are frozen, in order, and the latest holds the committed vectors', () => {
  assert.deepEqual(checkReleases(ROOT), []);
  assert.ok(changelog(ROOT).length >= 1);
});

test('a release edited after it was cut fails, naming it', () => {
  const root = scratch();
  const [first] = changelog(root);
  const file = join(root, RELEASES_DIR, releaseFile(first.version));
  writeFileSync(file, readFileSync(file, 'utf8').replace('"summary": "', '"summary": "Edited. '));
  assert.ok(checkReleases(root).some((p) => p.includes('changed after it was cut')));
});

test('vectors changed without a new release fail, and so does a version that does not rise', () => {
  const root = scratch();
  const log = changelog(root);
  const vfile = join(root, VECTORS_DIR, JSON.parse(readFileSync(join(root, RELEASES_DIR, releaseFile(log[0].version)), 'utf8')).vectors[0].id + '.json');
  const v = JSON.parse(readFileSync(vfile, 'utf8'));
  v.tolerance.amount = 1;
  writeFileSync(vfile, JSON.stringify(v));
  assert.ok(checkReleases(root).some((p) => p.startsWith(`the vectors changed since ${log.at(-1).version}`)));
  writeFileSync(join(root, RELEASES_DIR, 'changelog.json'), JSON.stringify([...log, { ...log.at(-1), version: '2026.1.0' }]));
  assert.ok(checkReleases(root).some((p) => p.includes('2026.1.0: does not follow')));
});
