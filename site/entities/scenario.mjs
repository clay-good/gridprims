// The grid scenario model's build-time data (add-grid-scenario-model): every
// balancing authority's fleet for the latest EIA-923 year, and the unmodified
// fleet's backtest against EIA-930's recorded hours, so the fit table is a
// published fact. Pages and the browser re-run the same code on the same rows.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../core/lib/shard.mjs';
import { REGION_ZONES } from '../../core/lib/hourly-carbon.mjs';
import { assembleFleet, compactUnit, fuelPrices, groupHeatRates, plantHeatRates } from '../../core/lib/fleet.mjs';
import { categoryChanges, dispatch } from '../../core/lib/dispatch.mjs';
import { backtest, candidateCauses } from '../../core/lib/backtest.mjs';
import { NAMES } from '../../pipeline/registry/eia-930.mjs';
import { served } from './plants.mjs';

/**
 * What every region's fleet is built from: the served snapshots and the heat-rate and price tables.
 * @param {string} dataDir
 * @returns {any | null} null when a needed snapshot is not built
 */
export function scenarioInputs(dataDir) {
  const g = served(dataDir, 'eia-860', 'generators');
  const p = served(dataDir, 'eia-860', 'plants');
  const gen = served(dataDir, 'eia-923', 'generation');
  const rc = served(dataDir, 'eia-923', 'fuel_receipts');
  const hourly = served(dataDir, 'eia-930', 'hourly');
  if (!g || !p || !gen || !rc || !hourly) return null;
  const rates = plantHeatRates(gen.rows);
  return {
    dataDir, year: Number(gen.table.dataPeriod), generators: g.rows, plants: p.rows, shards: hourly.table.shards,
    versions: { 'eia-860': g.manifest.version, 'eia-923': gen.manifest.version, 'eia-930': hourly.manifest.version },
    rates, groups: groupHeatRates(g.rows, rates), prices: fuelPrices(rc.rows),
  };
}

/**
 * One region's fleet, hours, unmodified run, and backtest, or null when it has nothing to dispatch.
 * @param {ReturnType<typeof scenarioInputs>} inp @param {string} ba
 */
export function scenarioRegion(inp, ba) {
  const s = inp.shards.find((x) => x.state === `${ba}-${inp.year}`);
  if (!s || NAMES[ba]?.generationOnly) return null;
  const { year, versions, prices } = inp;
  const fleet = assembleFleet({ ba, year, generators: inp.generators, plants: inp.plants, rates: inp.rates, groups: inp.groups, prices, versions });
  if (!fleet.units.length) return null;
  const rows = readShard(readFileSync(join(inp.dataDir, 'eia-930', versions['eia-930'], s.path))).rows();
  const run = dispatch({ units: fleet.units, rows });
  const bt = backtest({ rows, run });
  // A region whose coal, gas, and oil recorded nothing has no backtest to show.
  if (!(bt.overall.actual_mwh > 0)) return null;
  const categories = categoryChanges(rows);
  return {
    ba, name: NAMES[ba]?.name ?? ba, zone: REGION_ZONES[ba] ?? 'America/New_York', year, versions,
    shard: { path: `/data/eia-930/${versions['eia-930']}/${s.path}`, sha256: s.sha256 },
    fleet: { ...fleet, units: fleet.units.map(compactUnit) },
    backtest: bt, causes: candidateCauses({ fleet, rows, categories }),
    categories, unmet: run.unmet, surplus: run.surplus, co2_t: run.co2_t,
    prices: { deliveries: prices.deliveries, withheld: prices.withheld },
    rows, run,
  };
}

/**
 * @param {string} dataDir
 * @returns {{year: number, versions: Record<string, string>, regions: any[]} | null} null when a needed snapshot is not built
 */
export function scenarioData(dataDir) {
  const inp = scenarioInputs(dataDir);
  if (!inp) return null;
  const regions = [];
  for (const s of inp.shards.filter((x) => x.state.endsWith(`-${inp.year}`))) {
    const r = scenarioRegion(inp, s.state.split('-')[0]);
    // The hours and the run stay in memory only while the region is built.
    if (r) { delete r.rows; delete r.run; regions.push(r); }
  }
  return { year: inp.year, versions: inp.versions, regions: regions.sort((a, b) => (a.ba < b.ba ? -1 : 1)) };
}

/** The fleet as CSV: one row per unit, placed and unplaceable, with its sources and methods. */
export function fleetCsv(region) {
  const cols = ['id', 'plant_id', 'plant_name', 'capacity_mw', 'fuel', 'class', 'technology', 'online', 'retired', 'placed', 'missing', 'heat_rate_mmbtu_per_mwh', 'heat_rate_low', 'heat_rate_high', 'heat_rate_method', 'heat_rate_group', 'fuel_price_jan_usd_per_mmbtu', 'fuel_price_jan_source', 'substituted', 'variable_cost_jan_usd_per_mwh', 'variable_cost_jan_low', 'variable_cost_jan_high', 'co2_t_per_mwh'];
  const q = (v) => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const first = (a) => a?.find(Boolean) ?? null;
  const rows = [
    ...region.fleet.units.map((u) => { const pr = first(u.price); const c = first(u.cost); return [u.id, u.plant_id, u.plant_name, u.capacity_mw, u.fuel, u.class, u.technology, u.online, u.retired, 'yes', '', u.heat_rate.value, u.heat_rate.low, u.heat_rate.high, u.heat_rate.method, u.heat_rate.group ?? '', pr?.[0], { p: 'plant', r: 'region', n: 'nation' }[pr?.[3]], u.substituted ? 'yes' : 'no', c?.[0], c?.[1], c?.[2], u.co2_t_per_mwh]; }),
    ...region.fleet.unplaceable.map((u) => [u.id, u.plant_id, u.plant_name, u.capacity_mw, u.fuel, u.class, u.technology, u.online, u.retired, 'no', u.missing.join('; '), '', '', '', '', '', '', '', '', '', '', '', '']),
  ];
  return [cols.join(','), ...rows.map((r) => r.map(q).join(','))].join('\n') + '\n';
}
