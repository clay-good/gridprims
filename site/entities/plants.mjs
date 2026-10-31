// The facts each plant page shows, assembled from the served snapshots
// (add-public-grid-data: plant pages): EIA-860 for the plant and its
// generators, EIA-860M for each generator's latest status, EIA-923 for net
// generation, and eGRID for emissions. Joined on the EIA plant code only.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../core/lib/shard.mjs';
import { capacityFactor, hoursInService, shortTonsToMetric } from '../../core/lib/plant-math.mjs';

/** A served dataset's manifest and every row of one of its tables, or null when it is not built. */
export function served(dataDir, dataset, table) {
  const cur = join(dataDir, dataset, 'current.json');
  if (!existsSync(cur)) return null;
  const { version } = JSON.parse(readFileSync(cur, 'utf8'));
  const manifest = JSON.parse(readFileSync(join(dataDir, dataset, version, 'manifest.json'), 'utf8'));
  const t = manifest.tables.find((x) => x.name === table);
  return { manifest, table: t, rows: t.shards.flatMap((s) => readShard(readFileSync(join(dataDir, dataset, version, s.path))).rows()) };
}

const group = (rows, key) => {
  const m = new Map();
  for (const r of rows ?? []) (m.get(r[key]) ?? m.set(r[key], []).get(r[key])).push(r);
  return m;
};

/**
 * @param {string} dataDir
 * @returns {{plants: any[], sources: Record<string, any>} | null} null when EIA-860 is not built
 */
export function plantPages(dataDir) {
  const p860 = served(dataDir, 'eia-860', 'plants');
  if (!p860) return null;
  const g860 = served(dataDir, 'eia-860', 'generators');
  const g860m = served(dataDir, 'eia-860m', 'generators');
  const gen923 = served(dataDir, 'eia-923', 'generation');
  const egrid = served(dataDir, 'egrid', 'plants');
  const year = Number(gen923?.table.dataPeriod ?? p860.table.dataPeriod);
  const gens = group(g860?.rows, 'plant_id');
  const monthly = new Map((g860m?.rows ?? []).map((g) => [`${g.plant_id}|${g.generator_id}`, g]));
  const monthlyByPlant = group(g860m?.rows, 'plant_id');
  const netByPlant = new Map();
  for (const r of gen923?.rows ?? []) if (r.plant_id !== 99999) netByPlant.set(r.plant_id, (netByPlant.get(r.plant_id) ?? 0) + (r.net_generation_mwh ?? 0));
  const egridByPlant = new Map((egrid?.rows ?? []).map((r) => [r.plant_id, r]));

  const plants = [];
  for (const p of p860.rows) {
    const list = gens.get(p.plant_id) ?? [];
    const latest = monthlyByPlant.get(p.plant_id) ?? [];
    // Content minimum: at least one operating or planned generator, in the annual or the monthly file.
    const live = list.some((g) => g.category === 'operable' || g.category === 'proposed') || latest.some((g) => g.category === 'operating' || g.category === 'planned');
    if (!live) continue;
    const operable = list.filter((g) => g.category === 'operable');
    const retiredThisYear = list.filter((g) => g.category === 'retired_or_canceled' && g.status === 'RE' && g.retirement_year === year);
    const net = netByPlant.has(p.plant_id) ? netByPlant.get(p.plant_id) : null;
    const inService = [...operable, ...retiredThisYear].map((g) => ({ nameplateMw: g.nameplate_mw ?? 0, hours: hoursInService(year, { operatingYear: g.operating_year, operatingMonth: g.operating_month, retirementYear: g.retirement_year, retirementMonth: g.retirement_month }) }));
    const cf = net === null ? null : capacityFactor(net, inService);
    const e = egridByPlant.get(p.plant_id) ?? null;
    const generators = list.filter((g) => g.category !== 'retired_or_canceled' || g.retirement_year === year).map((g) => {
      const m = monthly.get(`${g.plant_id}|${g.generator_id}`);
      return {
        id: g.generator_id, category: g.category, technology: g.technology, energySource: g.energy_source_1, nameplateMw: g.nameplate_mw, summerMw: g.summer_mw,
        operatingYear: g.operating_year, plannedOperationYear: g.planned_operation_year, plannedRetirementYear: g.planned_retirement_year, retirementYear: g.retirement_year, status: g.status,
        monthlyStatus: m ? { category: m.category, status: m.status, description: m.status_description } : null,
      };
    }).sort((a, b) => (a.id < b.id ? -1 : 1));
    const facts = [p.plant_name, p.utility_name, p.state, p.county, p.ba_code, operable.length ? 1 : null, net, e].filter((x) => x !== null && x !== undefined).length;
    if (facts < 4) continue;
    plants.push({
      id: p.plant_id, name: p.plant_name, utilityId: p.utility_id, utilityName: p.utility_name, state: p.state, county: p.county, baCode: p.ba_code, baName: p.ba_name, sector: p.sector_name,
      nameplateMw: operable.reduce((n, g) => n + (g.nameplate_mw ?? 0), 0), summerMw: operable.reduce((n, g) => n + (g.summer_mw ?? 0), 0),
      generators, plannedRetirements: generators.filter((g) => g.category === 'operable' && g.plannedRetirementYear).length, proposed: generators.filter((g) => g.category === 'proposed').length,
      year, netMwh: net, capacityFactor: cf,
      emissions: e ? { co2MetricTons: e.co2_tons === null ? null : shortTonsToMetric(e.co2_tons), co2ShortTons: e.co2_tons, co2RateLbMwh: e.co2_rate_lb_mwh, year: e.data_year, subregion: e.subregion, primaryFuel: e.primary_fuel } : null,
    });
  }
  return { plants, year, sources: { eia860: p860.manifest, eia860m: g860m?.manifest ?? null, eia923: gen923?.manifest ?? null, egrid: egrid?.manifest ?? null } };
}
