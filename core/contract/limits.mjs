// The limits record (site/limitations): what gridprims cannot do, how well
// each tool is checked, what is unverified, and what is known to be wrong or
// stale, assembled from the project's own records. The limits page, its JSON
// copy, and the MCP resource are all this one object.

import { VALIDATION_LEVELS } from './manifest.mjs';

export const FRESH_RUN_DAYS = 90;
const DAY = 86_400_000;

/**
 * @param {{
 *   tools: Array<{manifest: any}>, cannotDo?: any[], claims?: any[], health?: any, signoffs?: Array<{tool: string}>,
 *   ledger?: any, generatedAt?: string, describes?: string, now?: number,
 * }} r
 */
export function limitsRecord(r) {
  const { tools, cannotDo = [], claims = [], health = null, signoffs = [], ledger = null, generatedAt = null, describes = null } = r;
  const now = r.now ?? Date.now();
  const passed = new Map((health?.tools ?? []).map((t) => [t.id, t.evidencePassed]));
  const rows = tools.map(({ manifest: m }) => {
    const evidencePassed = passed.get(m.id) ?? null;
    return {
      id: m.id, title: m.title, version: m.version, stability: m.stability,
      validationLevel: m.validation.level, validationName: VALIDATION_LEVELS[m.validation.level].name,
      evidence: m.validation.evidence.map(({ kind, summary }) => ({ kind, summary })),
      evidencePassed, needsFreshRun: !evidencePassed || now - Date.parse(evidencePassed) > FRESH_RUN_DAYS * DAY,
      review: signoffs.some((s) => s.tool === m.id) ? 'signed off' : 'pending',
      toRaise: m.toRaise ?? null, claims: m.claims ?? [], limitations: m.limitations,
    };
  });
  const counts = Object.fromEntries(VALIDATION_LEVELS.map((l) => [l.name, rows.filter((t) => t.validationLevel === l.level).length]));
  // Staleness and the known problems come from the continuity ledger, so the
  // limits page and the ledger can never disagree about what is late, what has
  // stalled, or which cited link has died (add-data-continuity-ledger 4.2).
  // Our own datasets are in it on the same terms as a publisher's.
  const late = (ledger?.rows ?? []).filter((row) => row.status === 'late')
    .map(({ id, title, due, posted, daysLate, ours, basis }) => ({ id, title, due, posted, daysLate, ours, basis }));
  const stalled = (ledger?.automation ?? []).filter((w) => !w.lastSuccess || now - Date.parse(w.lastSuccess) > w.thresholdHours * 3_600_000)
    .map((w) => ({ id: w.workflow, lastSuccess: w.lastSuccess, thresholdHours: w.thresholdHours }));
  const deadLinks = (ledger?.deadLinks ?? []).map(({ url, status, lastOk, usedBy }) => ({ url, status, lastOk, usedBy }));
  return {
    generatedAt, describes,
    summary: 'gridprims gives screening estimates, not utility studies. No tool has yet been checked against real bills or a utility\'s own figures. User problem reports are how we find our errors.',
    levels: VALIDATION_LEVELS, counts, tools: rows, cannotDo,
    unverifiedClaims: claims,
    problems: {
      automation: { stalled, note: stalled.length ? 'Some scheduled jobs are stalled: data may be as old as their last successful run.' : null },
      lateDatasets: late,
      deadLinks,
      failingDatasets: (health?.datasets ?? []).filter((d) => d.failure).map((d) => ({ id: d.id, since: d.failure.since, reason: d.failure.reason })),
      pinnedDatasets: (health?.datasets ?? []).filter((d) => d.pinned).map((d) => ({ id: d.id, held: d.pinned.held, attempted: d.pinned.attempted, breaking: d.pinned.breaking })),
      postureLimited: (health?.datasets ?? []).filter((d) => d.terms && d.terms.posture !== 'mirror').map((d) => ({ id: d.id, posture: d.terms.posture, termsChanged: d.terms.changed })),
      corrections: { populated: false, note: 'The corrections log is not yet populated; add-trust-and-continuity fills it.' },
      referenceEngineGaps: { populated: false, note: 'The tariff conformance suite will list the charge types its reference engines cannot check.' },
    },
  };
}
