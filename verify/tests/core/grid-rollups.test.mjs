// EIA-930 rollups (add-public-grid-data 1.2): local days in the region's
// reporting zone, a month equal to the sum of its hours, fuels never filled
// with zero, the record peak, and the lower 48 total skipping incomplete hours.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyRollup, isSpike, monthlyRollup, recordPeak, sumDemand } from '../../../core/lib/grid-rollups.mjs';

const H = 3_600_000;
const hourOf = (iso) => Date.parse(`${iso}:00Z`) / H;

test('a month\'s rollup equals the sum of its hourly values, and its days are local dates', () => {
  // July 2025 in Eastern standard time all year (MISO's reporting zone): midnight local is 05:00 UTC.
  const zone = 'Etc/GMT+5';
  const from = hourOf('2025-07-01T05');
  const rows = Array.from({ length: 31 * 24 }, (_, i) => ({ hour: from + i, demand: 1000 + (i % 24) * 10 + (i % 7), interchange: -5, gen_ng: 600, gen_sun: i % 24 > 6 && i % 24 < 19 ? 50 : 0, gen_col: null }));
  const [m] = monthlyRollup(rows, zone);
  assert.equal(m.month, '2025-07');
  assert.equal(m.energyMwh, rows.reduce((n, r) => n + r.demand, 0));
  assert.equal(m.hours, 744);
  assert.equal(m.interchangeMwh, -5 * 744);
  assert.deepEqual(m.generation, { ng: 600 * 744, sun: 50 * 12 * 31 });
  assert.equal('col' in m.generation, false, 'a fuel with no values is left out, not zero');
  const days = dailyRollup(rows, zone);
  assert.equal(days.length, 31);
  assert.equal(days[0].date, '2025-07-01');
  assert.equal(days[0].hours, 24);
  assert.equal(days.reduce((n, d) => n + d.energyMwh, 0), m.energyMwh);
  assert.equal(days[0].peakMw, Math.max(...rows.slice(0, 24).map((r) => r.demand)));
});

test('the record peak names its date and the period searched', () => {
  const r = recordPeak([{ date: '2025-07-01', peakMw: 10, peakHour: 1 }, { date: '2025-07-02', peakMw: 12, peakHour: 30 }, { date: '2025-07-03', peakMw: 11, peakHour: 50 }]);
  assert.deepEqual(r, { mw: 12, date: '2025-07-02', hour: 30, from: '2025-07-01', to: '2025-07-03' });
});

test('the lower 48 total keeps only hours every reporting region has', () => {
  const h = hourOf('2025-07-01T00');
  const a = [{ hour: h, demand: 10 }, { hour: h + 1, demand: 11 }];
  const b = [{ hour: h, demand: 20 }, { hour: h + 1, demand: null }];
  assert.deepEqual(sumDemand([a, b]), [{ hour: h, demand: 30 }]);
});

test('a single-hour spike stays in the energy and is left out of the peak', () => {
  // PJM, July 13, 2020 (UTC): 128,526, then 224,345, then 122,315 MW.
  const h = hourOf('2020-07-13T21');
  const rows = [{ hour: h, demand: 128526 }, { hour: h + 1, demand: 224345, net_generation: 128798, interchange: 6200 }, { hour: h + 2, demand: 122315 }];
  assert.equal(isSpike(rows[0], rows[1], rows[2]), true);
  // TVA, October 20, 2026: 2.5 times its neighbors, with generation spiking too.
  assert.equal(isSpike({ demand: 17594 }, { demand: 44377, net_generation: 44791, interchange: 489 }, { demand: 17804 }), true);
  // A real jump that meets the balance is kept.
  assert.equal(isSpike(rows[0], { demand: 160000, net_generation: 166000, interchange: 6000 }, rows[2]), false);
  const [d] = dailyRollup(rows, 'UTC');
  assert.deepEqual([d.peakMw, d.energyMwh, d.spikes], [128526, 128526 + 224345 + 122315, 1]);
});
