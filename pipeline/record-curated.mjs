// Log every change to a published curated figure, then move the snapshot
// (add-trust-and-continuity task 2.3). Run it in the same change that edits a
// record; the curated-changes gate fails a build whose published values moved
// without a log entry. A withdrawal can carry its cause:
//   node pipeline/record-curated.mjs [--cause "record.field=why it was removed"]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { termsData } from '../site/entities/large-load-terms.mjs';
import { diffPublished, logEntries, publishedValues } from '../core/lib/curated-changes.mjs';
import { ROOT } from './run.mjs';

export const SNAPSHOT = 'data/curated/large-load-tariffs/_published.json';
export const LOG = 'data/curated/curated-changes.json';

/** @param {{root?: string, out?: string, today?: string, causes?: Record<string, string>, records?: any[]}} [o] out holds the snapshot and log (the repository by default) */
export function recordCurated(o = {}) {
  const root = o.root ?? ROOT;
  const today = o.today ?? new Date().toISOString().slice(0, 10);
  const data = termsData(root, Date.parse(`${today}T00:00:00Z`), o.records);
  const now = publishedValues(data.entries);
  const snapPath = join(o.out ?? root, SNAPSHOT);
  const logPath = join(o.out ?? root, LOG);
  mkdirSync(dirname(snapPath), { recursive: true });
  const snapshot = existsSync(snapPath) ? JSON.parse(readFileSync(snapPath, 'utf8')) : {};
  const log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : [];
  const added = logEntries(diffPublished(snapshot, now), data.entries, today, o.causes);
  writeFileSync(logPath, JSON.stringify([...log, ...added], null, 2) + '\n');
  writeFileSync(snapPath, JSON.stringify(Object.fromEntries(Object.entries(now).sort()), null, 2) + '\n');
  return added;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { values } = parseArgs({ options: { cause: { type: 'string', multiple: true } } });
  const causes = Object.fromEntries((values.cause ?? []).map((c) => { const i = c.indexOf('='); return [c.slice(0, i), c.slice(i + 1)]; }));
  const added = recordCurated({ causes });
  for (const a of added) console.log(`${a.date} ${a.kind} ${a.record}.${a.field}: ${a.old} -> ${a.new ?? '(removed)'}`);
  console.log(added.length ? `logged ${added.length} change(s) in ${LOG}` : 'no published value changed');
}
