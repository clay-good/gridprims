// The deployable file-count gate (platform/data-snapshots, "Version cadence and
// file budget"): at most 80,000 files in the deploy root, 20% under the host's
// 100,000-file limit.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const FILE_LIMIT = 80_000;

/** @param {string} dir */
function count(dir) {
  let n = 0;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    n += ent.isDirectory() ? count(join(dir, ent.name)) : 1;
  }
  return n;
}

/**
 * @param {string} distDir the deploy root
 * @param {{limit?: number}} [opts]
 * @returns {string[]} errors
 */
export function checkFileCount(distDir, opts = {}) {
  const limit = opts.limit ?? FILE_LIMIT;
  if (!existsSync(distDir)) return [];
  const n = count(distDir);
  return n > limit ? [`${distDir}: ${n.toLocaleString('en-US')} deployable files, over the limit of ${limit.toLocaleString('en-US')}`] : [];
}
