// The pipeline health record (platform/automation, "The pipeline health
// record"): published at /health/pipeline.json, committed at
// data/health/pipeline.json. Every run updates it; nothing about the pipeline
// lives only in CI logs.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { WORKFLOWS } from '../workflows.mjs';

export const RUNS_KEPT = 60;

/** @param {string} root */
export const healthPath = (root) => join(root, 'data/health/pipeline.json');

/** @param {string} root */
export function readHealth(root) {
  const p = healthPath(root);
  const base = { generatedAt: null, workflows: [], datasets: [], links: [], deposits: { last: null, restoreTest: null }, watchdog: { lastHeartbeat: null }, runs: [] };
  return existsSync(p) ? { ...base, ...JSON.parse(readFileSync(p, 'utf8')) } : base;
}

/**
 * Record one run and republish the record.
 * @param {string} root
 * @param {{workflow: string, started: string, finished: string, ok: boolean, datasets?: Array<{id: string, checked: boolean, refreshed: boolean, version?: string, posture?: string, failure?: string}>, links?: any[], enabledEvents?: string[], notes?: string[]}} run
 */
export function recordRun(root, run) {
  const h = readHealth(root);
  h.generatedAt = run.finished;
  // Every declared workflow has a row, with its interval and threshold, even before its first run.
  h.workflows = WORKFLOWS.map((w) => {
    const prev = h.workflows.find((x) => x.id === w.id) ?? {};
    const mine = w.id === run.workflow;
    return {
      id: w.id, intervalHours: w.intervalHours, thresholdHours: w.thresholdHours,
      lastSuccess: mine && run.ok ? run.finished : prev.lastSuccess ?? null,
      lastRun: mine ? run.finished : prev.lastRun ?? null,
      enabled: prev.enabled ?? true,
      // Each time the host disabled the schedule and the pipeline re-enabled it, kept for the ledger.
      events: [...(prev.events ?? []), ...((run.enabledEvents ?? []).includes(w.id) ? [{ kind: 'disabled by the host; detected and re-enabled', at: run.finished }] : [])].slice(-20),
    };
  });
  for (const d of run.datasets ?? []) {
    const prev = h.datasets.find((x) => x.id === d.id);
    const row = {
      id: d.id,
      lastCheck: d.checked ? run.finished : prev?.lastCheck ?? null,
      lastRefresh: d.refreshed ? run.finished : prev?.lastRefresh ?? null,
      version: d.version ?? prev?.version ?? null,
      posture: d.posture ?? prev?.posture ?? null,
      terms: d.terms ?? prev?.terms ?? null,
      // A failure keeps the date it first appeared until a run succeeds.
      failure: d.failure ? { reason: d.failure, since: prev?.failure?.since ?? run.finished, last: run.finished } : null,
      // Held on a version after a breaking upstream change; a later successful check clears it.
      pinned: d.pinned ?? (d.checked ? null : prev?.pinned ?? null),
      // The publisher's posted release date as each check read it, a new entry only when its text changes.
      releasePromises: d.releasePromise && d.releasePromise.text !== prev?.releasePromises?.at(-1)?.text
        ? [...(prev?.releasePromises ?? []), { seen: run.finished.slice(0, 10), text: d.releasePromise.text, ...(d.releasePromise.archive ? { archive: d.releasePromise.archive } : {}) }]
        : prev?.releasePromises ?? [],
    };
    h.datasets = [...h.datasets.filter((x) => x.id !== d.id), row].sort((a, b) => a.id.localeCompare(b.id));
    if (d.release) row.lastRelease = d.release;
  }
  // Curated datasets a watch checks: which of their parts now read "needs review", for the chip on a result.
  if (run.curated) h.curated = { ...(h.curated ?? {}), ...run.curated };
  // Each link keeps when it was checked and when it last worked, so a dead citation shows how long it has been gone.
  if (run.links) h.links = run.links.map((l) => ({ ...l, checked: run.finished, lastOk: l.state === 'ok' ? run.finished : (h.links ?? []).find((x) => x.url === l.url)?.lastOk ?? null }));
  const durationMs = Date.parse(run.finished) - Date.parse(run.started);
  // Runs keep what happened, not the bytes of what was fetched.
  const summary = (run.datasets ?? []).map(({ raw, terms, ...d }) => ({ ...d, ...(terms ? { termsChanged: terms.changed } : {}) }));
  h.runs = [{ workflow: run.workflow, started: run.started, finished: run.finished, durationMs, ok: run.ok, datasets: summary, notes: run.notes ?? [] }, ...h.runs].slice(0, RUNS_KEPT);
  writeFileSync(healthPath(root), JSON.stringify(h, null, 2) + '\n');
  return h;
}
