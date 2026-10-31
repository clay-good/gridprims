// The dataset registry gate (platform/data-snapshots): every entry validates,
// has exactly one owning change that exists, and its served version's manifest
// matches the files committed beside it.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateEntry } from '../../pipeline/lib/registry.mjs';

/** @param {string} root */
export async function checkRegistry(root) {
  const errors = [];
  const dir = join(root, 'pipeline/registry');
  if (!existsSync(dir)) return errors;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.mjs'))) {
    const e = (await import(pathToFileURL(join(dir, f)).href)).default;
    errors.push(...validateEntry(e));
    if (`${e.id}.mjs` !== f) errors.push(`pipeline/registry/${f}: id ${e.id} does not match the file name`);
    if (e.owner && !existsSync(join(root, 'openspec/changes', e.owner))) errors.push(`${e.id}: owner ${e.owner} is not a change in openspec/changes`);
    const current = join(root, 'data', e.id, 'current.json');
    if (!existsSync(current)) continue;
    const { version } = JSON.parse(readFileSync(current, 'utf8'));
    const m = JSON.parse(readFileSync(join(root, 'data', e.id, version, 'manifest.json'), 'utf8'));
    for (const t of m.tables) {
      for (const file of [...t.shards, { path: t.download.path, sha256: t.download.sha256 }]) {
        const p = join(root, 'data', e.id, version, file.path);
        if (!existsSync(p)) { errors.push(`${e.id} ${version}: ${file.path} is missing`); continue; }
        if (createHash('sha256').update(readFileSync(p)).digest('hex') !== file.sha256) errors.push(`${e.id} ${version}: ${file.path} does not match its manifest checksum`);
      }
    }
  }
  return errors;
}
