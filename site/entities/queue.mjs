// Summaries for the queue explorer (add-public-grid-data: queue snapshot),
// computed from LBNL's Queued Up rows: capacity and counts by place, type,
// status, and entry year; median years in queue; and the share withdrawn among
// requests old enough to have an outcome.

import { served } from './plants.mjs';
import { queueType } from './regions.mjs';

const DAY = 86_400_000;
/** Years from a request's queue date to the snapshot's end. */
const yearsInQueue = (qDate, asOf) => (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${qDate}T00:00:00Z`)) / DAY / 365.25;

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Withdrawal needs an outcome: requests that entered by 2020, as LBNL's completion rates use, and at least 20 of them. */
export const WITHDRAWAL_COHORT = 2020;
export const WITHDRAWAL_MIN = 20;

/** @param {any[]} rows queue requests @param {string} asOf the snapshot's end, such as 2025-12-31 */
export function summarize(rows, asOf) {
  const active = rows.filter((r) => r.q_status === 'active');
  const byType = {};
  for (const r of active) {
    const k = queueType(r.type_clean);
    const e = byType[k] ?? (byType[k] = { mw: 0, count: 0 });
    e.mw += r.mw_1 ?? 0;
    e.count += 1;
  }
  const byStatus = {};
  for (const r of rows) byStatus[r.q_status ?? 'unknown'] = (byStatus[r.q_status ?? 'unknown'] ?? 0) + 1;
  const byYear = {};
  for (const r of active) if (r.q_year) byYear[r.q_year] = (byYear[r.q_year] ?? 0) + (r.mw_1 ?? 0);
  const cohort = rows.filter((r) => r.q_year && r.q_year <= WITHDRAWAL_COHORT && ['withdrawn', 'operational', 'active', 'suspended'].includes(r.q_status));
  return {
    activeMw: active.reduce((n, r) => n + (r.mw_1 ?? 0), 0), activeCount: active.length, byType, byStatus, byYear,
    medianYears: median(active.filter((r) => r.q_date).map((r) => yearsInQueue(r.q_date, asOf))),
    withdrawn: cohort.length >= WITHDRAWAL_MIN ? { share: cohort.filter((r) => r.q_status === 'withdrawn').length / cohort.length, n: cohort.length } : null,
  };
}

/** @param {string} dataDir */
export function queuePages(dataDir) {
  const q = served(dataDir, 'lbnl-queued-up', 'requests');
  if (!q) return null;
  const asOf = `${q.table.dataPeriod}-12-31`;
  const byState = new Map();
  for (const r of q.rows) if (r.state) (byState.get(r.state) ?? byState.set(r.state, []).get(r.state)).push(r);
  const states = [...byState].sort().map(([st, rows]) => {
    const byCounty = new Map();
    for (const r of rows) {
      const key = r.county ?? '';
      (byCounty.get(key) ?? byCounty.set(key, []).get(key)).push(r);
    }
    return {
      state: st, summary: summarize(rows, asOf),
      counties: [...byCounty].map(([county, cr]) => ({ county: county || null, fips: cr.find((r) => r.fips_code)?.fips_code ?? null, summary: summarize(cr, asOf) })).sort((a, b) => b.summary.activeMw - a.summary.activeMw),
      projects: rows.filter((r) => r.q_status === 'active').sort((a, b) => (b.mw_1 ?? 0) - (a.mw_1 ?? 0)),
    };
  });
  return { asOf, national: summarize(q.rows, asOf), noState: q.rows.filter((r) => !r.state).length, states, manifest: q.manifest };
}

/**
 * One state's queue summaries as the browser reads them (siting/where-and-how-long).
 * Summaries only: project rows, and with them any point of interconnection, never travel.
 * @param {{asOf: string, manifest: any}} q
 * @param {{state: string, summary: any, counties: any[]}} state
 */
export function queueStateJson(q, state) {
  const cut = ({ activeMw, activeCount, byType, medianYears, withdrawn }) => ({ activeMw, activeCount, byType, medianYears, withdrawn });
  return {
    state: state.state,
    release: q.manifest.release ?? q.manifest.version ?? null,
    asOf: q.manifest.asOf ?? null,
    through: q.asOf,
    license: q.manifest.license ?? null,
    summary: cut(state.summary),
    counties: state.counties.filter((c) => c.fips).map((c) => ({ fips: c.fips, county: c.county, summary: cut(c.summary) })),
  };
}
