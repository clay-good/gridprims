// The project pipeline's figures (projects/stages): EIA-860M rows read as stages,
// then totaled for the nation, each state, each county, and each balancing
// authority. Location stops at the county.

import { canceledTotals, projectRows, stageTotals } from '../../core/lib/project-stages.mjs';
import { COUNTY_SUCCESSORS, countyKey } from '../../pipeline/joins.mjs';
import { served } from './plants.mjs';

const groupBy = (rows, key) => {
  const m = new Map();
  for (const r of rows) {
    const k = key(r);
    (m.get(k) ?? m.set(k, []).get(k)).push(r);
  }
  return m;
};
const largestFirst = (a, b) => b.summary.inProgress.mw - a.summary.inProgress.mw || b.summary.stages.finished.mw - a.summary.stages.finished.mw;

/**
 * @param {any[]} generators EIA-860M generator rows
 * @param {string} period the inventory month, YYYY-MM
 * @param {Set<string>} counties `ST|countyKey` for every Census county
 */
export function summarizeProjects(generators, period, counties) {
  const countyKnown = (state, county) => {
    if (!county) return false;
    const k = `${state}|${countyKey(county)}`;
    return counties.has(k) || k in COUNTY_SUCCESSORS;
  };
  const rows = projectRows(generators, period, countyKnown);
  const canceledByState = groupBy(generators.filter((g) => g.category === 'canceled_or_postponed'), (g) => g.state);
  const states = [...groupBy(rows, (r) => r.state)].sort(([a], [b]) => (a < b ? -1 : 1)).map(([state, list]) => ({
    state, rows: list, summary: stageTotals(list), canceled: canceledTotals(canceledByState.get(state) ?? []),
    counties: [...groupBy(list, (r) => (r.countyConfirmed ? countyKey(r.county) : null))].map(([key, cr]) => ({ county: key === null ? null : cr[0].county, summary: stageTotals(cr) }))
      .sort((a, b) => Number(a.county === null) - Number(b.county === null) || largestFirst(a, b)),
  }));
  const bas = [...groupBy(rows, (r) => r.ba)].map(([ba, list]) => ({ ba, summary: stageTotals(list) }))
    .sort((a, b) => Number(a.ba === null) - Number(b.ba === null) || largestFirst(a, b));
  return { period, national: stageTotals(rows), canceled: canceledTotals(generators), states, bas };
}

/**
 * @param {string} dataDir
 * @returns {(ReturnType<typeof summarizeProjects> & {manifest: any, table: any}) | null} null when EIA-860M is not built
 */
export function projectPages(dataDir) {
  const g = served(dataDir, 'eia-860m', 'generators');
  const zcta = served(dataDir, 'census-zcta-county', 'zcta_counties');
  if (!g || !zcta) return null;
  const counties = new Set(zcta.rows.map((r) => `${r.state}|${countyKey(r.county_name)}`));
  return { ...summarizeProjects(g.rows, g.table.dataPeriod, counties), manifest: g.manifest, table: g.table };
}

/**
 * One state's rows as the open JSON file carries them.
 * @param {{period: string, manifest: any}} p
 * @param {{state: string, summary: any, canceled: any, rows: any[]}} s
 */
export function projectStateJson(p, s) {
  return {
    state: s.state, publisher: p.manifest.publisher, dataset: p.manifest.dataset, release: p.manifest.release ?? p.manifest.version ?? null,
    asOf: p.manifest.asOf ?? null, inventoryMonth: p.period, license: p.manifest.license ?? null, attribution: p.manifest.attribution ?? null,
    capacity: 'nameplate MW', summary: s.summary, canceledOrPostponed: s.canceled,
    rows: s.rows.map(({ plantId, plant, entity, county, countyConfirmed, ba, stage, status, generators, technologies, mw, dateFrom, dateTo, datePassed }) => ({ plantId, plant, entity, county, countyConfirmed, ba, stage, status, generators, technologies, mw, dateFrom, dateTo, datePassed })),
  };
}
