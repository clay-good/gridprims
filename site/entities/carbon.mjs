// The hourly carbon data the website and the local MCP server read
// (add-hourly-carbon): every region's shards by year from the served EIA-930
// version, and each region's typical consumption-based intensity by month and
// local clock hour over its latest three complete years, for the
// cleanest-hours picker and the workbench's carbon panel.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../core/lib/shard.mjs';
import { REGION_ZONES, completeYears, typicalHours } from '../../core/lib/hourly-carbon.mjs';
import { NAMES } from '../../pipeline/registry/eia-930.mjs';

const round1 = (x) => (x === null ? null : Math.round(x * 10) / 10);

/**
 * @param {string} dataDir
 * @returns {{regions: any, typical: Map<string, any>} | null} null when EIA-930 is not built
 */
export function carbonData(dataDir) {
  const cur = join(dataDir, 'eia-930', 'current.json');
  if (!existsSync(cur)) return null;
  const { version } = JSON.parse(readFileSync(cur, 'utf8'));
  const m = JSON.parse(readFileSync(join(dataDir, 'eia-930', version, 'manifest.json'), 'utf8'));
  const t = m.tables.find((x) => x.name === 'hourly');
  const byRegion = Map.groupBy(t.shards, (s) => s.state.split('-')[0]);
  const regions = [];
  const typical = new Map();
  for (const [ba, shards] of [...byRegion].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const zone = REGION_ZONES[ba] ?? 'America/New_York';
    // Only the hour and the consumption-based intensity are needed, read column by column.
    const rows = [];
    for (const s of shards) {
      const sh = readShard(readFileSync(join(dataDir, 'eia-930', version, s.path)));
      const hour = sh.column('hour');
      const intensity = sh.column('intensity_consumed');
      for (let i = 0; i < hour.length; i++) rows.push({ hour: hour[i], intensity_consumed: intensity[i] });
    }
    const years = completeYears(rows, zone);
    const entry = {
      ba, name: NAMES[ba]?.name ?? ba, zone, generationOnly: Boolean(NAMES[ba]?.generationOnly),
      shards: Object.fromEntries(shards.map((s) => [s.state.split('-')[1], { path: `/data/eia-930/${version}/${s.path}`, sha256: s.sha256 }])),
      typicalYears: years,
    };
    regions.push(entry);
    if (years.length) {
      const months = typicalHours(rows, { zone, years }).map((mo) => ({ month: mo.month, hours: mo.hours.map((h) => ({ hour: h.hour, n: h.n, median: round1(h.median), q1: round1(h.q1), q3: round1(h.q3) })) }));
      typical.set(ba, { ba, name: entry.name, zone, years, unit: 'lb/MWh', months });
    }
  }
  return {
    regions: { dataset: 'eia-930', version, asOf: m.asOf, retrieved: m.retrieved, attribution: m.attribution, regions },
    typical,
  };
}
