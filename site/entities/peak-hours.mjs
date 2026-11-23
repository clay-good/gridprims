// What ran in a region's highest-demand hours (add-measured-plant-emissions
// 2.4), read from the shipped peak-hour table: the ten hours of each year with
// the most demand in EIA's series, and every monitored unit that reported in
// them.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../core/lib/shard.mjs';
import { standardOffsetHours } from '../../core/lib/estimated-vs-measured.mjs';
import { REGION_ZONES } from '../../core/lib/hourly-carbon.mjs';

/** The shipped table, by region: its years, and each year's hours with the units that ran. */
export function loadPeakHours(dataDir) {
  const cur = join(dataDir, 'epa-camd', 'current.json');
  if (!existsSync(cur)) return null;
  const { version } = JSON.parse(readFileSync(cur, 'utf8'));
  const manifest = JSON.parse(readFileSync(join(dataDir, 'epa-camd', version, 'manifest.json'), 'utf8'));
  const table = manifest.tables.find((t) => t.name === 'peak_hour_units');
  if (!table) return null;
  const byRegion = new Map();
  for (const shard of table.shards) {
    const m = /^(.+)-(\d{4})$/.exec(shard.state ?? '');
    if (!m) continue;
    const [, region, year] = m;
    const rows = readShard(readFileSync(join(dataDir, 'epa-camd', version, shard.path))).rows();
    if (!rows.length) continue;
    (byRegion.get(region) ?? byRegion.set(region, []).get(region)).push({ year: Number(year), rows });
  }
  return { manifest, table, byRegion };
}

/**
 * One region's peak hours, newest year first, each hour with its units and totals.
 * @param {ReturnType<typeof loadPeakHours>} peak @param {string} region
 */
export function peakHoursFor(peak, region) {
  const years = peak?.byRegion.get(region);
  if (!years) return [];
  const offset = standardOffsetHours(REGION_ZONES[region] ?? 'UTC');
  return years.sort((a, b) => b.year - a.year).map(({ year, rows }) => {
    const hours = new Map();
    for (const r of rows) {
      const h = hours.get(r.hour) ?? hours.set(r.hour, { hour: r.hour, rank: r.rank, demandMwh: r.demand_mwh, units: [], grossLoadMwh: 0, co2Tonnes: 0 }).get(r.hour);
      h.units.push(r);
      h.grossLoadMwh += r.gross_load_mwh ?? 0;
      h.co2Tonnes += r.co2_tonnes ?? 0;
    }
    const list = [...hours.values()].sort((a, b) => a.rank - b.rank).map((h) => ({
      ...h,
      units: h.units.sort((a, b) => (b.gross_load_mwh ?? 0) - (a.gross_load_mwh ?? 0)),
      // The hour as the region's own clocks read it, in standard time, as both publishers report.
      localStart: new Date((h.hour + offset) * 3_600_000).toISOString().slice(0, 16).replace('T', ' '),
      rateLbMwh: h.grossLoadMwh > 0 ? (h.co2Tonnes * 2204.62262185) / h.grossLoadMwh : null,
      coveredShare: h.demandMwh > 0 ? h.grossLoadMwh / h.demandMwh : null,
    }));
    return { year, hours: list };
  });
}
