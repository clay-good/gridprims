// The siting read-out (siting/where-and-how-long): a place and a size joined
// against the public record. Pure functions over data the build already emits
// — the ZIP lookup shard, the large-load prefill, and the per-state queue
// summaries — so the same join runs in the browser and through the MCP server.
//
// Resolution stops at the county on purpose. Feeder and substation headroom is
// CEII; LBNL's point-of-interconnection field is dropped at normalization and
// nothing here reconstructs it.

import { route } from './process-router.mjs';

/** Hours in a non-leap year, as the sales comparison uses them. */
const HOURS = 8760;

/** The load factor assumed when the caller states none, in percent. A flat industrial load. */
export const DEFAULT_LOAD_FACTOR = 90;

/** Below this many requests in the historic cohort a withdrawal share is not reported. */
export const COHORT_MIN = 20;

/**
 * How a size compares with one utility: against its own annual peak where it
 * files one, against its balancing authority's where it does not, and against
 * what it sells in a year either way.
 *
 * Only 14 of 1,533 utilities file a FERC Form 714 peak, so the balancing
 * authority is the usual denominator and the result always says which was used.
 *
 * @param {{mw: number, loadFactor?: number}} size
 * @param {{id: number, name: string, salesMwh: number, resKwh: number, year: number, peak: {mw: number, year: number} | null, baPeak: {mw: number, year: number, code: string, name: string} | null}} utility
 */
export function sizeAgainstUtility(size, utility) {
  const loadFactor = size.loadFactor ?? DEFAULT_LOAD_FACTOR;
  const energyMwh = size.mw * (loadFactor / 100) * HOURS;
  const salesShare = utility.salesMwh > 0 ? (energyMwh / utility.salesMwh) * 100 : null;
  const homes = utility.resKwh > 0 ? (energyMwh * 1000) / utility.resKwh : null;
  const peak = utility.peak ?? utility.baPeak ?? null;
  const basis = utility.peak ? 'utility' : utility.baPeak ? 'balancing-authority' : 'none';
  return {
    utilityId: utility.id,
    name: utility.name,
    loadFactor,
    energyMwh,
    salesMwh: utility.salesMwh,
    salesYear: utility.year,
    salesShare,
    homes,
    // peakBasis says whose peak the share is of; a share of a balancing authority's
    // peak is never presented as the utility's own.
    peakBasis: basis,
    peakMw: peak?.mw ?? null,
    peakYear: peak?.year ?? null,
    peakOwner: utility.peak ? utility.name : utility.baPeak?.name ?? null,
    peakShare: peak?.mw > 0 ? (size.mw / peak.mw) * 100 : null,
  };
}

/**
 * What a county's queue says, with the guards the summary itself carries.
 * A withdrawal share computed from a handful of requests is not reported;
 * the caller is handed the state's figure to offer instead.
 *
 * @param {{counties: Array<{fips: string, county: string, summary: any}>, summary: any, state: string, through: string, asOf: string | null, release: string | null}} stateFile
 * @param {string} fips 5-digit county FIPS
 */
export function countyQueue(stateFile, fips) {
  const row = stateFile.counties.find((c) => c.fips === fips) ?? null;
  const s = row?.summary ?? null;
  const withdrawn = s?.withdrawn ?? null;
  return {
    state: stateFile.state,
    county: row?.county ?? null,
    found: Boolean(row),
    activeMw: s?.activeMw ?? null,
    activeCount: s?.activeCount ?? null,
    byType: s?.byType ?? {},
    medianYears: s?.medianYears ?? null,
    // Reported only when the county's own cohort clears the minimum; otherwise the
    // state figure is offered in its place and labelled as the state's.
    withdrawnShare: withdrawn ? withdrawn.share : null,
    withdrawnCohort: withdrawn ? withdrawn.n : null,
    withdrawnBasis: withdrawn ? 'county' : stateFile.summary?.withdrawn ? 'state' : 'none',
    stateWithdrawnShare: stateFile.summary?.withdrawn?.share ?? null,
    stateWithdrawnCohort: stateFile.summary?.withdrawn?.n ?? null,
    // Every figure above describes requests already in the queue as of this date.
    through: stateFile.through,
    asOf: stateFile.asOf,
    release: stateFile.release,
  };
}

/**
 * LBNL publishes a small number of rows with a negative capacity, so a county's
 * type total can come out below zero. We report the publisher's own number and
 * name the oddity rather than correcting it silently (design D4a).
 * @param {Record<string, {mw: number, count: number}>} byType
 */
export function negativeTypes(byType) {
  return Object.entries(byType ?? {}).filter(([, v]) => v.mw < 0).map(([k]) => k);
}

/**
 * Which federal interconnection process a generation size falls under.
 * Load interconnection is not covered by the small generator procedures, so a
 * load request returns no process rather than a wrong one.
 *
 * @param {{mw: number, direction: 'load' | 'generation', kv?: number, technology?: string}} size
 */
export function federalProcess(size) {
  if (size.direction !== 'generation') return { applies: false, reason: 'load' };
  const r = route({ kw: size.mw * 1000, kv: size.kv ?? 12.47, technology: size.technology ?? 'inverter-certified', mainline: 'unknown' });
  return { applies: true, ...r };
}

/**
 * The whole read-out for one place and one size.
 *
 * @param {{mw: number, direction: 'load' | 'generation', loadFactor?: number}} size
 * @param {{county: {fips: string, name: string} | null, state: string, utilities: Array<{id: number}>, bas: string[], subregions: string[]}} place
 * @param {Map<number, any> | {get: (id: number) => any}} utilityById from large-load/utilities.json
 * @param {any} stateQueue the per-state queue JSON, or null when that state has none
 */
export function sitingReadout(size, place, utilityById, stateQueue) {
  const utilities = place.utilities
    .map((u) => utilityById.get(u.id))
    .filter(Boolean)
    .map((u) => sizeAgainstUtility(size, u))
    // The utility selling the most energy is the one most likely to serve a large request.
    .sort((a, b) => b.salesMwh - a.salesMwh);
  const queue = stateQueue && place.county ? countyQueue(stateQueue, place.county.fips) : null;
  return {
    state: place.state,
    county: place.county,
    bas: place.bas,
    subregions: place.subregions,
    size,
    utilities,
    queue,
    negativeTypes: queue ? negativeTypes(queue.byType) : [],
    process: federalProcess(size),
  };
}
