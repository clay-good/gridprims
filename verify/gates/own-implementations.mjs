// Every general-purpose module has an entry in docs/own-implementations.md
// (platform/zero-dependency, "Own implementations are tested like dependencies").

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walk } from '../lib/walk.mjs';

/** Folders that hold general-purpose modules (replacements for common libraries). */
export const GENERAL_PURPOSE_DIRS = ['parsers/', 'core/lib/', 'verify/lib/', 'site/lib/', 'pipeline/lib/'];

/**
 * @param {string} root
 * @returns {string[]} errors
 */
export function checkOwnImplementations(root) {
  const docPath = join(root, 'docs/own-implementations.md');
  const doc = existsSync(docPath) ? readFileSync(docPath, 'utf8') : '';
  return walk(root)
    .filter((f) => GENERAL_PURPOSE_DIRS.some((d) => f.startsWith(d)) && /\.(mjs|js)$/.test(f))
    .filter((f) => !doc.includes('`' + f + '`'))
    .map((f) => `${f}: general-purpose module has no entry in docs/own-implementations.md`);
}
