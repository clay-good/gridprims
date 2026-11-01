// The weekly GO 95 watch (add-overhead-line-checks D3): compare the official
// table pages with the stored captures and record what differs. A difference
// marks every fact from that table "needs review" on the health record, which
// pages read to show a chip. It blocks nothing and waits on nobody; a curated
// update with a new capture clears it.
//   node pipeline/go95-watch.mjs

import { fileURLToPath } from 'node:url';
import { checkGo95, tablesNeedingReview } from './lib/go95.mjs';
import { recordRun } from './lib/health.mjs';
import { ROOT } from './run.mjs';

/** @param {{root?: string, fetch?: typeof fetch, now?: () => string}} [o] */
export async function runGo95Watch(o = {}) {
  const root = o.root ?? ROOT;
  const started = (o.now ?? (() => new Date().toISOString()))();
  const results = await checkGo95(root, o.fetch ?? fetch);
  const review = tablesNeedingReview(results);
  const notes = results.map((r) => `GO 95 Table ${r.table}: ${r.changed ? `changed, ${r.reason}` : r.reason ?? 'matches its stored capture'}`);
  recordRun(root, {
    workflow: 'go95-watch', started, finished: (o.now ?? (() => new Date().toISOString()))(), ok: true, notes,
    curated: { 'go95-clearances': { needsReview: review, checked: started.slice(0, 10) } },
  });
  return { results, review, notes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { results, review } = await runGo95Watch();
  for (const r of results) console.log(`${r.changed ? 'CHANGED' : 'ok     '} GO 95 Table ${r.table}${r.reason ? `: ${r.reason}` : ''}`);
  console.log(review.length ? `facts from ${review.map((t) => `Table ${t}`).join(' and ')} now read "needs review"` : 'every table matches its stored capture');
}
