// One scheduled run (platform/automation): re-enable any workflow the host
// disabled, check each of this workflow's datasets and refresh what changed,
// open an issue for each failure, and republish the health record. The same
// script runs on a laptop; only the credentials differ.
//   node pipeline/scheduled.mjs refresh-eia-861

import { fileURLToPath } from 'node:url';
import { checkDataset } from './check.mjs';
import { readHealth, recordRun } from './lib/health.mjs';
import { github } from './lib/github.mjs';
import { ROOT } from './run.mjs';
import { stalled, WORKFLOWS } from './workflows.mjs';

/**
 * @param {string} workflowId
 * @param {{root?: string, outDir?: string, fetch?: typeof fetch, host?: ReturnType<typeof github>, now?: () => Date, entries?: Record<string, any>}} [o]
 */
export async function scheduledRun(workflowId, o = {}) {
  const root = o.root ?? ROOT;
  const now = o.now ?? (() => new Date());
  const host = o.host ?? github();
  const w = WORKFLOWS.find((x) => x.id === workflowId);
  if (!w) throw new Error(`no workflow ${workflowId}`);
  const started = now().toISOString();
  const notes = [];

  // The load-bearing defense against the host's inactivity rule: every run re-enables the others.
  let enabledEvents = [];
  if (host.available) {
    try { enabledEvents = await host.reenableInactive(); } catch (e) { notes.push(`self-heal could not read workflow states: ${e.message}`); }
  } else notes.push('no host token: self-heal and issues skipped (local run)');

  // The watchdog is itself watched: a stale heartbeat is reported by every in-host run.
  const beat = WORKFLOWS.find((x) => x.id === 'heartbeat');
  const lastBeat = readHealth(root).workflows.find((x) => x.id === 'heartbeat')?.lastSuccess;
  if (lastBeat && stalled(beat, lastBeat, Date.parse(started))) {
    notes.push(`the watchdog's heartbeat is stale (last ${lastBeat})`);
    if (host.available) { try { await host.openIssue('Pipeline: the Worker watchdog heartbeat is stale', `The last heartbeat was ${lastBeat}. The Worker's scheduled handler may have stopped; in-host self-heal is still running.`); } catch { /* recorded in notes */ } }
  }

  const datasets = [];
  for (const id of w.datasets) {
    // Each dataset stands alone: one failing never stops the others.
    const r = await checkDataset({ dataset: id, entry: o.entries?.[id], outDir: o.outDir, fetch: o.fetch, today: started.slice(0, 10) });
    datasets.push(r);
    if (r.failure && host.available) {
      try { await host.openIssue(`Pipeline: ${id} refresh failed`, `The scheduled check of ${id} failed on ${started.slice(0, 10)}. The previous version stays live.\n\n\`\`\`\n${r.failure}\n\`\`\`\n\nThis issue was opened by pipeline/scheduled.mjs; it closes nothing and blocks nothing.`); } catch (e) { notes.push(`could not open an issue for ${id}: ${e.message}`); }
    }
  }
  const finished = now().toISOString();
  const health = recordRun(root, { workflow: workflowId, started, finished, ok: true, datasets, enabledEvents, notes });
  return { datasets, enabledEvents, notes, health };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = await scheduledRun(process.argv[2]);
  for (const d of r.datasets) console.log(`${d.failure ? 'FAIL' : 'ok  '} ${d.id}: ${d.failure ?? (d.refreshed ? `refreshed to ${d.version} (${d.found})` : 'no new release')}`);
  for (const e of r.enabledEvents) console.log(`re-enabled workflow ${e}`);
  for (const n of r.notes) console.log(`note: ${n}`);
}
