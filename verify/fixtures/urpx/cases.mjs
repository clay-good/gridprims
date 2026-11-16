// Tariffs written as URPX by core/lib/urpx.mjs and checked against the URPX
// v0.5.1 SHACL shapes by verify/tools/urpx-shacl.py. Each covers one shape the
// emitter writes: a flat rate, tiers with a monthly minimum, seasonal tiers
// with a daily fixed charge across a season that wraps the year, and
// time-of-use with weekday peaks that differ by season.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../../core/lib/shard.mjs';
import { toTariff } from '../../../core/lib/urdb-tariff.mjs';

// URDB-style 12 × 24 period indices: summer weekdays peak 2 pm to 8 pm (index 1), winter weekdays 5 pm to
// 9 pm (index 2), everything else index 0, weekends all index 0.
const day = (from, to, p) => Array.from({ length: 24 }, (_, h) => (h >= from && h < to ? p : 0));
const weekday = Array.from({ length: 12 }, (_, m) => (m >= 5 && m <= 8 ? day(14, 20, 1) : day(17, 21, 2)));
const weekend = Array.from({ length: 12 }, () => day(0, 0, 0));

export const URPX_CASES = {
  flat: { tariff: { fixedMonthly: 10, seasons: [{ name: 'all year', from: '01-01', tiers: [{ rate: 0.115 }] }] }, meta: { id: 'flat', name: 'Residential flat', utility: 'Example Electric', effective: '2026-01-01', zone: 'America/Chicago' } },
  tiered: { tariff: { fixedMonthly: 10, minimumMonthly: 15, seasons: [{ name: 'all year', from: '01-01', tiers: [{ rate: 0.1, upTo: 500 }, { rate: 0.13 }] }] }, meta: { id: 'tiered', name: 'Residential tiered', utility: 'Example Electric', effective: '2026-01-01', zone: 'America/Chicago' } },
  seasonal: { tariff: { fixedDaily: 0.5, seasons: [{ name: 'June to September', from: '06-01', tiers: [{ rate: 0.12, upTo: 600 }, { rate: 0.15 }] }, { name: 'October to May', from: '10-01', tiers: [{ rate: 0.1, upTo: 800 }, { rate: 0.11 }] }] }, meta: { id: 'seasonal', name: 'Residential seasonal', utility: 'Example Electric', effective: '2026-01-01', zone: 'America/Chicago', source: { url: 'https://example.com/tariff.pdf', retrieved: '2026-11-16' } } },
  tou: { tariff: { fixedMonthly: 12, seasons: [{ name: 'June to September', from: '06-01', periods: [{ name: 'period 1', rate: 0.09 }, { name: 'period 2', rate: 0.25 }] }, { name: 'October to May', from: '10-01', periods: [{ name: 'period 1', rate: 0.08 }, { name: 'period 3', rate: 0.18 }] }] }, meta: { id: 'tou', name: 'Residential time-of-use', utility: 'Example Electric', effective: '2026-01-01', zone: 'America/Chicago' }, opts: { schedule: { weekday, weekend } } },
  ...urdbCases(),
};

/**
 * Three real URDB rates (2026-10 snapshot), as the bill engine reads them: three energy tiers, seasons with
 * different tier counts, and time-of-use with a monthly minimum.
 */
function urdbCases() {
  const dir = join(import.meta.dirname, '../../../data/urdb/2026-10/rates');
  const want = ['5963ede55457a385144c9f92', '539f6a0aec4f024411ec8acb', '5978fc0e5457a3fc3123732c'];
  const rows = readdirSync(dir).flatMap((f) => readShard(readFileSync(join(dir, f))).rows()).filter((r) => want.includes(r.label));
  return Object.fromEntries(want.map((label) => {
    const r = rows.find((x) => x.label === label);
    const effective = /^\d{4}-\d{2}-\d{2}/.exec(String(r.effective_date ?? ''))?.[0] ?? '2026-01-01';
    return [`urdb-${label}`, {
      tariff: toTariff(r).tariff,
      meta: { id: `urdb-${label}`, name: r.rate_name, utility: r.utility_name, effective, source: { url: `https://apps.openei.org/USURDB/rate/view/${label}`, retrieved: '2026-10-30' } },
      opts: { schedule: { weekday: JSON.parse(r.energy_weekday_schedule), weekend: JSON.parse(r.energy_weekend_schedule ?? r.energy_weekday_schedule) } },
    }];
  }));
}
