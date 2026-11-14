// The curated-changes gate (add-trust-and-continuity task 2.3): a published
// curated figure never moves silently. If the values the terms page publishes
// differ from the snapshot, the change must be logged first, by
// pipeline/record-curated.mjs, which dates it and records both values.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** @param {string} root */
export async function checkCuratedChanges(root, today = new Date().toISOString().slice(0, 10)) {
  const { termsData } = await import(pathToFileURL(join(root, 'site/entities/large-load-terms.mjs')).href);
  const { diffPublished, publishedValues } = await import(pathToFileURL(join(root, 'core/lib/curated-changes.mjs')).href);
  const snapPath = join(root, 'data/curated/large-load-tariffs/_published.json');
  if (!existsSync(snapPath)) return ['data/curated/large-load-tariffs/_published.json is missing; run node pipeline/record-curated.mjs'];
  const now = publishedValues(termsData(root, Date.parse(`${today}T00:00:00Z`)).entries);
  const changes = diffPublished(JSON.parse(readFileSync(snapPath, 'utf8')), now);
  return changes.map((c) => `${c.key}: the published ${c.kind === 'withdrawal' ? `value "${c.old}" was removed` : `value changed from "${c.old}" to "${c.new}"`} without a log entry; run node pipeline/record-curated.mjs`);
}
