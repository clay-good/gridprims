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
      // A failure keeps the date it first appeared until a run succeeds.
      failure: d.failure ? { reason: d.failure, since: prev?.failure?.since ?? run.finished, last: run.finished } : null,
    };
    h.datasets = [...h.datasets.filter((x) => x.id !== d.id), row].sort((a, b) => a.id.localeCompare(b.id));
  }
  if (run.links) h.links = run.links;
  for (const id of run.enabledEvents ?? []) {
    const w = h.workflows.find((x) => x.id === id);
    if (w) w.reenabledAt = run.finished;
  }
  const durationMs = Date.parse(run.finished) - Date.parse(run.started);
  h.runs = [{ workflow: run.workflow, started: run.started, finished: run.finished, durationMs, ok: run.ok, datasets: run.datasets ?? [], notes: run.notes ?? [] }, ...h.runs].slice(0, RUNS_KEPT);
  writeFileSync(healthPath(root), JSON.stringify(h, null, 2) + '\n');
  return h;
}
