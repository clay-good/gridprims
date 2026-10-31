// The platform-API gate (platform/zero-dependency, "Declared runtime versions"):
// every Node built-in the code imports is listed in docs/platform-apis.md as
// Stable in the supported Node line. Experimental and release-candidate APIs fail.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importSpecifiers, tableRows, walk } from '../lib/walk.mjs';

/**
 * @param {string} root
 * @returns {string[]} errors
 */
export function checkPlatformApis(root) {
  const errors = [];
  const rows = tableRows(readFileSync(join(root, 'docs/platform-apis.md'), 'utf8'));
  for (const f of walk(root).filter((p) => /\.(mjs|js)$/.test(p))) {
    const src = readFileSync(join(root, f), 'utf8');
    for (const api of importSpecifiers(src).filter((s) => s.startsWith('node:'))) {
      // A subpath such as node:assert/strict is covered by its module's row.
      const row = rows.get(api) ?? rows.get(api.split('/')[0]);
      if (!row) errors.push(`${f}: uses ${api}, which docs/platform-apis.md does not list`);
      else if (!/^stable$/i.test(row[1])) errors.push(`${f}: uses ${api}, which docs/platform-apis.md marks "${row[1]}"; only Stable APIs may be required`);
    }
  }
  return [...new Set(errors)];
}
