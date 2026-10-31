// Run the curated-fact rules (pipeline/lib/curated.mjs) over every record in
// data/curated/facts/, so a contribution learns what is missing before it merges.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { walk } from '../lib/walk.mjs';
import { checkRecord } from '../../pipeline/lib/curated.mjs';

/** @param {string} root */
export async function checkCurated(root) {
  const dir = join(root, 'data/curated/facts');
  if (!existsSync(dir)) return [];
  const errors = [];
  for (const f of walk(dir).filter((p) => p.endsWith('.mjs') && !p.split('/').pop().startsWith('_'))) {
    const record = (await import(pathToFileURL(join(dir, f)).href)).default;
    errors.push(...checkRecord(record, root).problems.map((p) => `data/curated/facts/${f}: ${p}`));
  }
  return errors;
}
