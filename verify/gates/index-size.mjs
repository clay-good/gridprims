// The command index's size budget (siting/home-and-shell, design D7). The
// index is fetched whole the first time a visitor focuses the search bar, so it
// is measured like page JavaScript: compressed, against the 150 KB budget in
// docs/decisions-day-one.md §8. Places are what make it grow, so the gate is
// what keeps counties in it honest.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Bytes compressed, as a visitor on the reference profile downloads it. */
export const INDEX_LIMIT = 150 * 1024;

/** @param {string} distDir @returns {{bytes: number, compressed: number} | null} */
export function indexSize(distDir) {
  const file = join(distDir, 'command-index.json');
  if (!existsSync(file)) return null;
  const raw = readFileSync(file);
  return { bytes: raw.length, compressed: gzipSync(raw, { level: 9 }).length };
}

/**
 * @param {string} distDir the deploy root
 * @param {{limit?: number}} [opts]
 * @returns {string[]} errors
 */
export function checkIndexSize(distDir, opts = {}) {
  const limit = opts.limit ?? INDEX_LIMIT;
  const size = indexSize(distDir);
  if (!size) return [];
  return size.compressed > limit
    ? [`command-index.json: ${size.compressed.toLocaleString('en-US')} bytes compressed, over the budget of ${limit.toLocaleString('en-US')}`]
    : [];
}
