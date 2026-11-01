// Balancing authority pages and the grid pulse (add-public-grid-data: region
// pages), from daily and monthly rollups of the served EIA-930 snapshot: each
// region's daily peak and energy for the latest 13 months, monthly generation
// by fuel and net interchange, its record peak, and the 14 latest daily peaks
// of every region and of the lower 48 total.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../core/lib/shard.mjs';
import { complete, dailyRollup, monthlyRollup, recordPeak, sumDemand } from '../../core/lib/grid-rollups.mjs';
import { NAMES, REPORT_ZONES } from '../../pipeline/registry/eia-930.mjs';

/** The lower 48 total's days are Eastern, as EIA's US48 figures are. */
export const L48_ZONE = 'America/New_York';
const DAY_MS = 86_400_000;

/**
 * @param {string} dataDir
 * @returns {{regions: any[], pulse: any, manifest: any} | null} null when EIA-930 is not built
 */
export function balancingPages(dataDir) {
  const cur = join(dataDir, 'eia-930', 'current.json');
  if (!existsSync(cur)) return null;
  const { version } = JSON.parse(readFileSync(cur, 'utf8'));
  const manifest = JSON.parse(readFileSync(join(dataDir, 'eia-930', version, 'manifest.json'), 'utf8'));
  const t = manifest.tables.find((x) => x.name === 'hourly');
  const byRegion = Map.groupBy(t.shards, (s) => s.state.split('-')[0]);
  const regions = [];
  const recent = [];
  for (const [ba, shards] of [...byRegion].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const rows = shards.flatMap((s) => readShard(readFileSync(join(dataDir, 'eia-930', version, s.path))).rows());
    const zone = REPORT_ZONES[ba] ?? 'America/New_York';
    const days = dailyRollup(rows, zone).filter(complete);
    const months = monthlyRollup(rows, zone);
    const last = days.at(-1)?.date;
    // The latest 13 months of days, counted back from the last day with demand.
    const since = last ? new Date(Date.parse(`${last}T00:00:00Z`) - 395 * DAY_MS).toISOString().slice(0, 10) : null;
    const lastHour = rows.reduce((n, r) => Math.max(n, r.hour), -Infinity);
    regions.push({
      ba, name: NAMES[ba]?.name ?? ba, zone, generationOnly: Boolean(NAMES[ba]?.generationOnly),
      days: since ? days.filter((d) => d.date >= since) : [],
      months: months.slice(-13),
      record: recordPeak(days),
      pulse: days.slice(-14).map((d) => ({ date: d.date, mw: d.peakMw })),
      firstHour: rows.reduce((n, r) => Math.min(n, r.hour), Infinity), lastHour,
    });
    // The last 20 days of hours, for the lower 48 total.
    if (days.length) recent.push(rows.filter((r) => r.hour > lastHour - 20 * 24));
  }
  const l48 = dailyRollup(sumDemand(recent), L48_ZONE).filter(complete).slice(-14);
  return {
    manifest, regions,
    // Dated by its latest day, as a region page's latest daily value is.
    pulse: { region: 'Lower 48', asOf: l48.at(-1)?.date ?? manifest.asOf, source: manifest.attribution, values: l48.map((d) => ({ date: d.date, mw: d.peakMw })) },
  };
}
