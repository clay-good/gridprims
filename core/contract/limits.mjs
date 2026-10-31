// The limits record (site/limitations): what gridprims cannot do, how well
// each tool is checked, what is unverified, and what is known to be wrong or
// stale, assembled from the project's own records. The limits page, its JSON
// copy, and the MCP resource are all this one object.

import { VALIDATION_LEVELS } from './manifest.mjs';
import { lateness } from '../lib/lateness.mjs';

export const FRESH_RUN_DAYS = 90;
const DAY = 86_400_000;

/**
 * @param {{
 *   tools: Array<{manifest: any}>, cannotDo?: any[], claims?: any[], health?: any, signoffs?: Array<{tool: string}>,
 *   datasets?: any[], generatedAt?: string, describes?: string, now?: number,
 * }} r
 */
export function limitsRecord(r) {
  const { tools, cannotDo = [], claims = [], health = null, signoffs = [], datasets = [], generatedAt = null, describes = null } = r;
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
  const late = datasets.map((d) => ({ id: d.dataset, title: d.title, ...lateness(d, now) })).filter((d) => d.late);
  const stalled = (health?.workflows ?? []).filter((w) => !w.lastSuccess || now - Date.parse(w.lastSuccess) > w.thresholdHours * 3_600_000).map((w) => ({ id: w.id, lastSuccess: w.lastSuccess, thresholdHours: w.thresholdHours }));
  return {
    generatedAt, describes,
    summary: 'gridprims gives screening estimates, not utility studies. No tool has yet been checked against real bills or a utility\'s own figures. User problem reports are how we find our errors.',
    levels: VALIDATION_LEVELS, counts, tools: rows, cannotDo,
    unverifiedClaims: claims,
    problems: {
      automation: { stalled, note: stalled.length ? 'Some scheduled jobs are stalled: data may be as old as their last successful run.' : null },
      lateDatasets: late,
      failingDatasets: (health?.datasets ?? []).filter((d) => d.failure).map((d) => ({ id: d.id, since: d.failure.since, reason: d.failure.reason })),
      postureLimited: (health?.datasets ?? []).filter((d) => d.terms && d.terms.posture !== 'mirror').map((d) => ({ id: d.id, posture: d.terms.posture, termsChanged: d.terms.changed })),
      corrections: { populated: false, note: 'The corrections log is not yet populated; add-trust-and-continuity fills it.' },
      referenceEngineGaps: { populated: false, note: 'The tariff conformance suite will list the charge types its reference engines cannot check.' },
    },
  };
}
