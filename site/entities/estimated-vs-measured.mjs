// The published difference between our estimated hourly carbon and what EPA's
// monitors measured (add-measured-plant-emissions 3.1 to 3.5), computed at
// build time for every region and year that has both: EIA-930's hourly series
// for the estimate, EPA's monitored hours for the measurement.
//
// Nothing here is scaled up to a whole fleet. Each figure prices the monitored
// units' own gross load, fuel by fuel and hour by hour, with the per-fuel
// factors EIA's own published carbon implies, and sets that beside what those
// units measured in the same hours.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../core/lib/shard.mjs';
import { COVERAGE_FLOOR, compareRegionYear } from '../../core/lib/estimated-vs-measured.mjs';
import { REGION_ZONES } from '../../core/lib/hourly-carbon.mjs';

export const COMPARISON_PATH = '/carbon/estimated-vs-measured/';

/** A dataset's served version and manifest, or null when it is not built. */
function servedManifest(dataDir, dataset) {
  const cur = join(dataDir, dataset, 'current.json');
  if (!existsSync(cur)) return null;
  const { version } = JSON.parse(readFileSync(cur, 'utf8'));
  return { version, manifest: JSON.parse(readFileSync(join(dataDir, dataset, version, 'manifest.json'), 'utf8')) };
}
const shardRows = (dataDir, dataset, version, path) => {
  const file = join(dataDir, dataset, version, path);
  return existsSync(file) ? readShard(readFileSync(file)).rows() : null;
};

/**
 * Every region and year both datasets cover, compared.
 * @param {string} dataDir
 * @returns {{rows: any[], sources: {camd: any, grid: any}, floor: number} | null}
 */
export function loadComparison(dataDir) {
  const camd = servedManifest(dataDir, 'epa-camd');
  const grid = servedManifest(dataDir, 'eia-930');
  if (!camd || !grid) return null;
  const measuredTable = camd.manifest.tables.find((t) => t.name === 'region_hourly');
  const gridTable = grid.manifest.tables.find((t) => t.name === 'hourly');
  if (!measuredTable || !gridTable) return null;
  // The data years the dataset covers. A handful of hours at each end fall in the neighbouring
  // year once they are on the UTC clock; those shards are a few hours, not a year, and are left out.
  const [firstYear, lastYear] = (measuredTable.dataPeriod ?? '').split('-').map(Number);
  const rows = [];
  for (const shard of measuredTable.shards) {
    const m = /^(.+)-(\d{4})$/.exec(shard.state ?? '');
    if (!m) continue; // the unmatched shard: plants eGRID places in no region
    const [, region, yearText] = m;
    const year = Number(yearText);
    if (Number.isFinite(firstYear) && (year < firstYear || year > (lastYear || firstYear))) continue;
    const zone = REGION_ZONES[region];
    if (!zone) continue; // a region EIA publishes no hourly series for
    // The year's hours, and the next year's: a measured hour is labelled by its UTC year, and the
    // comparison still needs the neighbouring hours EIA publishes around the turn of the year.
    const gridRows = [
      ...(shardRows(dataDir, 'eia-930', grid.version, `hourly/${region}-${year}.bin`) ?? []),
      ...(shardRows(dataDir, 'eia-930', grid.version, `hourly/${region}-${year + 1}.bin`) ?? []),
    ];
    if (!gridRows.length) continue;
    const measured = shardRows(dataDir, 'epa-camd', camd.version, shard.path);
    if (!measured?.length) continue;
    rows.push(compareRegionYear({ region, year, zone, grid: gridRows, measured }));
  }
  rows.sort((a, b) => (a.region < b.region ? -1 : a.region > b.region ? 1 : a.year - b.year));
  return { rows, sources: { camd: camd.manifest, grid: grid.manifest }, floor: COVERAGE_FLOOR };
}

/** The comparison for one region, newest year first, or an empty list. */
export const forRegion = (comparison, region) => (comparison?.rows ?? []).filter((r) => r.region === region).sort((a, b) => b.year - a.year);

/** The hours of the day where the estimate is furthest from the measurement, worst first. */
export function worstHours(row, { count = 3, direction = null } = {}) {
  const hours = (row.byHourOfDay ?? []).filter((h) => h.difference !== null && (direction === null || (direction === 'low' ? h.difference < 0 : h.difference > 0)));
  return hours.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)).slice(0, count);
}

const round = (n, places = 6) => (n === null || n === undefined || Number.isNaN(n) ? null : Math.round(n * 10 ** places) / 10 ** places);
const group = (list) => list.map((g) => ({ key: g.key, hours: g.hours, measuredTonnes: round(g.measured_tonnes, 3), estimatedTonnes: round(g.estimated_tonnes, 3), grossLoadMwh: round(g.gross_load_mwh, 3), difference: round(g.difference) }));

/** The method, in the words the page and the download both use. */
export const METHOD = {
  measurement: 'EPA\'s continuous emission monitors, as the hourly bulk files report them: carbon dioxide in short tons, converted to metric tons at 0.90718474, summed over the monitored units of a balancing authority for each hour.',
  estimate: 'EIA\'s hourly carbon dioxide for the same balancing authority is generation by fuel times annual average emission factors. EIA publishes the carbon dioxide, not the factors, so the factors are recovered from EIA\'s own series by least squares over the region-year\'s hours, and the fit\'s error is published beside them.',
  attribution: 'The estimate is applied to the monitored units\' own gross load, fuel by fuel (coal, natural gas, oil, other) and hour by hour. Nothing is scaled up to unmonitored generation.',
  alignment: 'EPA reports hours in local standard time with no daylight saving; EIA reports hours in UTC. Each measured hour is moved to UTC by the region\'s standard-time offset, and hours EIA has no record for are counted and left out.',
  mapping: 'Units are placed in a region by EPA\'s facility id, which is EIA\'s ORISPL plant code, through eGRID\'s balancing-authority code. No row is matched by name.',
  excluded: 'Generation no monitor covers: nuclear, hydro, wind, solar, storage, small fossil units, and combined heat and power outside EPA\'s trading programs. Gross load is not net generation, so the monitored share of a region\'s generation can read high.',
  floor: `Where monitored units account for less than ${Math.round(COVERAGE_FLOOR * 100)}% of a region's generation for the year, the difference is reported as uninformative rather than as a small error. That floor is gridprims' own choice, not EPA's and not EIA's.`,
};

/** The comparison as published: every region-year with its difference, distributions, and fit. */
export function comparisonJson(comparison) {
  return {
    describes: 'The difference between the estimated hourly carbon intensity gridprims uses and the emissions EPA\'s monitors measured, by region and year.',
    method: METHOD,
    floor: comparison.floor,
    sources: ['camd', 'grid'].map((k) => ({ dataset: comparison.sources[k].dataset, version: comparison.sources[k].version, publisher: comparison.sources[k].publisher, asOf: comparison.sources[k].asOf, attribution: comparison.sources[k].attribution })),
    regions: comparison.rows.map((r) => ({
      region: r.region, year: r.year, zone: r.zone, standardOffsetHours: r.standardOffsetHours,
      hours: r.hours, unmatchedHours: r.unmatchedHours,
      measuredTonnes: round(r.measuredTonnes, 3), estimatedTonnes: round(r.estimatedTonnes, 3),
      differenceTonnes: round(r.differenceTonnes, 3), difference: round(r.difference),
      monitoredMwh: round(r.monitoredMwh, 3), regionMwh: round(r.regionMwh, 3), coverage: round(r.coverage),
      informative: r.informative,
      fit: { r2: round(r.fit.r2), rmseTonnesPerHour: round(r.fit.rmse, 3), hours: r.fit.hours, factorsTonnesPerMwh: Object.fromEntries(Object.entries(r.fit.factors).map(([k, v]) => [k, round(v)])), heldAtZero: r.fit.clamped, dropped: r.fit.dropped },
      byMonth: group(r.byMonth),
      byHourOfDay: group(r.byHourOfDay),
    })),
  };
}

/**
 * The small index the carbon tools read beside their method caveat: one line
 * per region and year, without the monthly and hourly distributions, so a
 * result can name the figure without downloading the whole comparison.
 */
export function comparisonSummary(comparison) {
  return {
    describes: 'How far gridprims\' estimated hourly carbon sits from EPA\'s measured emissions, by region and year.',
    path: COMPARISON_PATH,
    floor: comparison.floor,
    camdVersion: comparison.sources.camd.version,
    gridVersion: comparison.sources.grid.version,
    regions: Object.fromEntries(comparison.rows.map((r) => [`${r.region}|${r.year}`, {
      region: r.region, year: r.year, informative: r.informative,
      difference: round(r.difference), differenceTonnes: round(r.differenceTonnes, 1), coverage: round(r.coverage),
      because: r.uninformativeBecause, fuelMismatch: r.fuelMismatch, r2: round(r.fit.r2), minR2: r.minR2,
    }])),
  };
}

/** One row per region and year, for the download. */
export function comparisonCsv(comparison) {
  const head = 'region,year,coverage,informative,measured_tonnes,estimated_tonnes,difference_tonnes,difference,hours,unmatched_hours,fit_r2\n';
  return head + comparison.rows.map((r) => [
    r.region, r.year, round(r.coverage) ?? '', r.informative, round(r.measuredTonnes, 3) ?? '', round(r.estimatedTonnes, 3) ?? '',
    round(r.differenceTonnes, 3) ?? '', round(r.difference) ?? '', r.hours, r.unmatchedHours, round(r.fit.r2) ?? '',
  ].join(',')).join('\n') + '\n';
}
