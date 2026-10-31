// Result versioning (platform/tool-contract, "Stable, versioned results"):
// each tool's worked-example results are snapshotted with its version. A
// changed result at the same version fails; a new version needs a changelog
// entry. Refresh snapshots with GRIDPRIMS_RECORD=1 after bumping the version.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runTool } from '../../core/contract/run.mjs';

/** @param {{manifest: any, impl: any}} tool */
export const snapshotOf = ({ manifest, impl }) => ({
  toolId: manifest.id,
  version: manifest.version,
  results: manifest.examples.map((ex) => ({ example: ex.id, result: runTool(manifest, impl, ex.inputs) })),
});

/**
 * @param {string} root
 * @param {{record?: boolean}} [opts]
 * @returns {Promise<string[]>}
 */
export async function checkVersions(root, opts = {}) {
  const { TOOLS } = await import(pathToFileURL(join(root, 'core/tools/index.mjs')).href);
  const changelogPath = join(root, 'data/curated/changelog.mjs');
  const changelog = existsSync(changelogPath) ? (await import(pathToFileURL(changelogPath).href)).default : [];
  const errors = [];
  for (const tool of TOOLS) {
    const { id, version } = tool.manifest;
    if (!changelog.some((e) => e.toolId === id && e.version === version)) errors.push(`${id}: version ${version} has no entry in data/curated/changelog.mjs`);
    const file = join(root, 'verify/fixtures/results', `${id}.json`);
    const now = snapshotOf(tool);
    if (opts.record) { writeFileSync(file, JSON.stringify(now, null, 2) + '\n'); continue; }
    if (!existsSync(file)) { errors.push(`${id}: no result snapshot; run GRIDPRIMS_RECORD=1 npm run check`); continue; }
    const before = JSON.parse(readFileSync(file, 'utf8'));
    if (JSON.stringify(before.results) === JSON.stringify(now.results)) {
      if (before.version !== version) errors.push(`${id}: version changed from ${before.version} to ${version} but no result changed; refresh the snapshot with GRIDPRIMS_RECORD=1`);
      continue;
    }
    if (before.version === version) {
      const changed = now.results.find((r, i) => JSON.stringify(r) !== JSON.stringify(before.results[i]));
      errors.push(`${id}: example ${changed?.example ?? '?'} changed its result without a version bump (still ${version}); bump the version and add a changelog entry`);
    } else {
      errors.push(`${id}: results changed with the bump to ${version}; refresh the snapshot with GRIDPRIMS_RECORD=1 once the changelog entry is written`);
    }
  }
  return errors;
}
