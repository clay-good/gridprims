// The dataset registry gate (platform/data-snapshots): every entry validates,
// has exactly one owning change that exists, and its served version's manifest
// matches the files committed beside it.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateEntry } from '../../pipeline/lib/registry.mjs';
import { ceiiScreen } from '../../pipeline/lib/ceii.mjs';

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
    // Permanent versions are cut at most monthly: one version folder per YYYY-MM, matching its manifest.
    const versionDirs = existsSync(join(root, 'data', e.id)) ? readdirSync(join(root, 'data', e.id), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
    const months = new Map();
    for (const v of versionDirs) {
      if (!/^\d{4}-\d{2}$/.test(v)) { errors.push(`${e.id}: version folder ${v} is not a YYYY-MM month`); continue; }
      const mv = JSON.parse(readFileSync(join(root, 'data', e.id, v, 'manifest.json'), 'utf8'));
      const month = mv.retrieved?.slice(0, 7);
      if (mv.version !== v) errors.push(`${e.id}: folder ${v} holds manifest version ${mv.version}`);
      if (months.has(month)) errors.push(`${e.id}: versions ${months.get(month)} and ${v} were both cut in ${month}; permanent versions are cut at most monthly`);
      months.set(month, v);
    }
    const current = join(root, 'data', e.id, 'current.json');
    if (!existsSync(current)) continue;
    const { version } = JSON.parse(readFileSync(current, 'utf8'));
    const m = JSON.parse(readFileSync(join(root, 'data', e.id, version, 'manifest.json'), 'utf8'));
    // The CEII screen record each served version carries must pass and match a fresh screen of the registry entry.
    const fresh = ceiiScreen(e, m.tables, m.retrieved);
    if (!m.ceiiScreen) errors.push(`${e.id} ${version}: no CEII screen record; re-run the recipe`);
    else if (!m.ceiiScreen.passed) errors.push(`${e.id} ${version}: the CEII screen did not pass (${[...m.ceiiScreen.flagged, ...m.ceiiScreen.unconfirmed].join(', ')})`);
    else if (JSON.stringify(m.ceiiScreen) !== JSON.stringify(fresh)) errors.push(`${e.id} ${version}: the CEII screen record is stale against the registry entry; re-run the recipe`);
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
