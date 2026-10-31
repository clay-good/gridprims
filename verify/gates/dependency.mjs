// The dependency gate (platform/zero-dependency): no package dependencies, no
// node_modules, no import of anything but our own files and Node built-ins, and
// every third-party file listed in docs/reference-artifacts.md with its checksum.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importSpecifiers, tableRows, walk } from '../lib/walk.mjs';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'bundleDependencies', 'bundledDependencies'];
const FONT = /\.(woff2?|ttf|otf)$/i;
const THIRD_PARTY_DIRS = ['verify/reference/', 'site/fonts/'];
const CODE = /\.(mjs|js|cjs)$/;

/**
 * @param {string} root
 * @returns {string[]} errors
 */
export function checkDependencies(root) {
  const errors = [];
  const files = walk(root, { dirs: true });

  for (const f of files) {
    if (f.endsWith('node_modules/')) errors.push(`${f}: a node_modules directory is committed or present`);
  }
  for (const f of files.filter((p) => p.endsWith('package.json') || p.endsWith('package-lock.json'))) {
    if (f.endsWith('package-lock.json')) { errors.push(`${f}: a lockfile means packages were installed`); continue; }
    const pkg = JSON.parse(readFileSync(join(root, f), 'utf8'));
    for (const field of DEP_FIELDS) {
      if (pkg[field] && Object.keys(pkg[field]).length) errors.push(`${f}: declares ${field} (${Object.keys(pkg[field]).join(', ')})`);
    }
  }

  for (const f of files.filter((p) => CODE.test(p))) {
    const src = readFileSync(join(root, f), 'utf8');
    for (const spec of importSpecifiers(src)) {
      if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:')) continue;
      errors.push(`${f}: imports "${spec}", which is a package or an unprefixed built-in (use node:${spec} for built-ins)`);
    }
  }

  const listPath = join(root, 'docs/reference-artifacts.md');
  const listed = existsSync(listPath) ? tableRows(readFileSync(listPath, 'utf8')) : new Map();
  for (const f of files.filter((p) => !p.endsWith('/'))) {
    const thirdParty = FONT.test(f) || THIRD_PARTY_DIRS.some((d) => f.startsWith(d) && !f.endsWith('README.md'));
    if (!thirdParty) continue;
    const row = listed.get(f);
    if (!row) { errors.push(`${f}: third-party file is not listed in docs/reference-artifacts.md`); continue; }
    const want = row[row.length - 1].replace(/`/g, '').toLowerCase();
    const got = createHash('sha256').update(readFileSync(join(root, f))).digest('hex');
    if (want !== got) errors.push(`${f}: SHA-256 is ${got}, but docs/reference-artifacts.md records ${want}`);
  }
  return errors;
}
