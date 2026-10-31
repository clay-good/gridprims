// Result cards (load and bill analyzer task 7.2): the comparison card lists
// the top three rates and their costs, the data period, the URDB snapshot
// date, and gridprims.com, and no card carries the file's contents.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billCard, rankingCard, screenCard } from '../../../core/lib/result-cards.mjs';
import { compareRates } from '../../../core/lib/rate-compare.mjs';
import { intervalBills } from '../../../core/lib/interval-bill.mjs';
import { fromManual } from '../../../core/lib/tariff-record.mjs';
import { EXCLUDED, payback, UPPER_BOUND } from '../../../core/lib/storage-screen.mjs';

// Readings that would be recognizable if they leaked: 12.3456 kW every hour.
const start = Date.parse('2026-01-01T00:00:00Z');
const startMs = Float64Array.from({ length: 31 * 24 }, (_, i) => start + i * 3_600_000);
const load = { startMs, kwh: Float64Array.from(startMs, () => 12.3456), intervalMinutes: 60 };
const ctx = { utility: 'Example Electric', period: '2026-01-01 to 2026-01-31', version: '0.1.0', urdbAsOf: '2026-10-30', rate: 'General Service' };
const rate = (id, r) => ({ ...fromManual({ energyRate: r }), id, name: id });

test('the comparison card: the top three rates and costs, the data period, the URDB date, and gridprims.com', () => {
  const r = compareRates(load, [rate('A', 0.1), rate('B', 0.09), rate('C', 0.11), rate('D', 0.12)], { zone: 'UTC', currentId: 'A', asOf: '2026-10-30' });
  const text = rankingCard(r, ctx);
  const lines = text.split('\n');
  assert.equal(lines[0], 'What this load would have cost on Example Electric\'s rates, 2026-01-01 to 2026-01-31:');
  assert.deepEqual(lines.slice(1, 4).map((l) => l.split(':')[0]), ['1. B', '2. A', '3. C']);
  assert.match(lines[2], /\(current rate\)$/);
  assert.match(text, /snapshot of 2026-10-30/);
  assert.match(text, /gridprims\.com/);
  assert.match(text, /screening estimates/);
  assert.ok(!lines.some((l) => /^4\./.test(l)), 'only the top three');
});

test('no card carries the file\'s contents', () => {
  const rec = rate('A', 0.1);
  const bills = intervalBills(load, rec, { zone: 'UTC' });
  const saved = { total: 10, demand: 4, energy: 6, months: 1, lateMonths: 0, limits: [] };
  const cards = [
    rankingCard(compareRates(load, [rec], { zone: 'UTC', currentId: 'A', asOf: '2026-10-30' }), ctx),
    billCard(rec, bills, ctx),
    screenCard({ powerKw: 20, energyKwh: 40, roundTrip: 0.85, socMin: 0.1, socMax: 0.9 }, { saved, back: payback(1000, 120), upperBound: UPPER_BOUND, excluded: EXCLUDED }, ctx),
  ];
  for (const c of cards) assert.ok(!/12\.345|1234|12,345/.test(c), c);
  assert.match(cards[2], /upper bound/);
  assert.match(cards[2], /Not modeled: auxiliary load/);
});
