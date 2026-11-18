// EIA-860M generators read as project stages (projects/stages): each status
// code maps to one of four stages in progress, and generators that came online
// in the last 24 months are Finished. Generators combine into one row per plant
// and stage. Published values are never altered; what is missing stays missing.

/** The stages, in the order a project moves through them. */
export const STAGES = ['planned', 'waiting', 'approved', 'building', 'finished'];
/** The stages that count as in progress. Finished is reported apart from them. */
export const IN_PROGRESS = ['planned', 'waiting', 'approved', 'building'];
/** How many calendar months Finished reaches back, the inventory month included. */
export const FINISHED_MONTHS = 24;

const STATUS_STAGE = { P: 'planned', L: 'waiting', T: 'approved', U: 'building', V: 'building', TS: 'building' };

/** EIA's capacities are published to a tenth of a MW; this removes floating-point noise from a sum. */
const tenth = (x) => Math.round(x * 10) / 10;
/** @param {number} year @param {number} month 1 to 12 */
const monthIndex = (year, month) => year * 12 + month - 1;
/** @param {string} period an inventory month, YYYY-MM */
const periodIndex = (period) => monthIndex(Number(period.slice(0, 4)), Number(period.slice(5, 7)));

/**
 * A generator's stage in an inventory, or null when it is in none.
 * @param {any} g an EIA-860M generator row
 * @param {string} period the inventory month, YYYY-MM
 * @returns {string | null}
 * @throws when a planned generator carries a status with no stage, so a new EIA code stops the build
 */
export function stageOf(g, period) {
  if (g.category === 'planned') {
    const stage = STATUS_STAGE[g.status];
    if (!stage) throw new Error(`plant ${g.plant_id} generator ${g.generator_id}: planned status "${g.status}" has no project stage`);
    return stage;
  }
  if (g.category !== 'operating' || !g.operating_year || !g.operating_month) return null;
  const age = periodIndex(period) - monthIndex(g.operating_year, g.operating_month);
  return age >= 0 && age < FINISHED_MONTHS ? 'finished' : null;
}

/** "(V) Under construction, more than 50 percent complete" without its leading code. */
export const statusWording = (s) => (s ?? '').replace(/^\([A-Z]{1,3}\)\s*/, '') || null;

/** A generator's reported month as YYYY-MM, or YYYY when EIA gives no month, or null. */
function reported(g, stage) {
  const [year, month] = stage === 'finished' ? [g.operating_year, g.operating_month] : [g.planned_operation_year, g.planned_operation_month];
  if (!year) return null;
  return month ? `${year}-${String(month).padStart(2, '0')}` : String(year);
}

/** The last month a reported date can mean, so a bare year has not passed until the year is over. */
const lastMonth = (d) => (d.length === 4 ? monthIndex(Number(d), 12) : periodIndex(d));

/**
 * One row per plant and stage, largest first.
 * @param {any[]} generators EIA-860M generator rows
 * @param {string} period the inventory month, YYYY-MM
 * @param {(state: string, county: string | null) => boolean} [countyKnown] whether a county is a real county of that state
 */
export function projectRows(generators, period, countyKnown = (_, c) => Boolean(c)) {
  const groups = new Map();
  for (const g of generators) {
    const stage = stageOf(g, period);
    if (!stage) continue;
    const key = `${g.plant_id}|${stage}`;
    (groups.get(key) ?? groups.set(key, { stage, list: [] }).get(key)).list.push(g);
  }
  const unique = (xs) => [...new Set(xs.filter(Boolean))].sort();
  const rows = [...groups.values()].map(({ stage, list }) => {
    const first = list[0];
    const dates = unique(list.map((g) => reported(g, stage)));
    return {
      plantId: first.plant_id, plant: first.plant_name, entity: unique(list.map((g) => g.utility_name)).join('; ') || null,
      state: first.state, county: first.county ?? null, countyConfirmed: countyKnown(first.state, first.county ?? null), ba: first.ba_code ?? null,
      stage, status: unique(list.map((g) => statusWording(g.status_description))), generators: list.length, technologies: unique(list.map((g) => g.technology)),
      mw: tenth(list.reduce((n, g) => n + (g.nameplate_mw ?? 0), 0)),
      dateFrom: dates[0] ?? null, dateTo: dates.at(-1) ?? null,
      datePassed: stage !== 'finished' && dates.some((d) => lastMonth(d) < periodIndex(period)),
    };
  });
  return rows.sort((a, b) => b.mw - a.mw || a.plant.localeCompare(b.plant) || a.plantId - b.plantId || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
}

/**
 * Generators, plants, and nameplate MW by stage, and for all stages in progress together.
 * A plant with units in two stages in progress counts once in the combined figure.
 * @param {ReturnType<typeof projectRows>} rows
 */
export function stageTotals(rows) {
  const stages = Object.fromEntries(STAGES.map((s) => [s, { generators: 0, plants: 0, mw: 0 }]));
  const active = new Set();
  for (const r of rows) {
    const e = stages[r.stage];
    e.generators += r.generators;
    e.plants += 1;
    e.mw = tenth(e.mw + r.mw);
    if (r.stage !== 'finished') active.add(r.plantId);
  }
  const sum = (k) => IN_PROGRESS.reduce((n, s) => n + stages[s][k], 0);
  return { stages, inProgress: { generators: sum('generators'), plants: active.size, mw: tenth(sum('mw')) } };
}

/**
 * EIA's canceled or postponed sheet, kept out of every stage.
 * @param {any[]} generators
 * @returns {{generators: number, mw: number}}
 */
export function canceledTotals(generators) {
  const list = generators.filter((g) => g.category === 'canceled_or_postponed');
  return { generators: list.length, mw: tenth(list.reduce((n, g) => n + (g.nameplate_mw ?? 0), 0)) };
}
