// The comment draft (ratepayer tools task 1.4): it states the docket, the
// computed impact (about +$162), and the largest charge, with a blank place for the user's own
// views; every number equals the computed result; nothing outside the fixed
// template appears; and no meter data or file name is included.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commentDraft, OWN_WORDS } from '../../../core/lib/comment-draft.mjs';
import { impactOnIntervals } from '../../../core/lib/rate-impact.mjs';
import { fromManual } from '../../../core/lib/tariff-record.mjs';

const s = Date.parse('2025-01-01T00:00:00Z');
const startMs = Float64Array.from({ length: 8760 }, (_, i) => s + i * 3_600_000);
// A recognizable reading, so a leak would show: 1.234567 kWh every hour.
const year = { startMs, kwh: Float64Array.from(startMs, () => 1.234567), intervalMinutes: 60 };
const current = fromManual({ fixedMonthly: 12, energyRate: (1640 - 144) / (8760 * 1.234567) });
const proposed = fromManual({ fixedMonthly: 20, energyRate: (1802 - 240) / (8760 * 1.234567) });
const impact = impactOnIntervals(year, current, proposed, { zone: 'UTC' });
const who = { regulator: 'Public Utility Commission of Texas', docket: '12345', customerType: 'residential', utility: 'Example Electric', period: 'January to December 2025' };

const SNAPSHOT = `To the Public Utility Commission of Texas, regarding docket 12345:

I am a residential customer of Example Electric. Using my own electricity use for January to December 2025 (a year), I priced my bills under the current rates and under the proposed rates.

Under the current rates, my bills come to $1,640.02. Under the proposed rates, they come to $1,801.96. That is +$161.94 (+9.9%) over a year, or about +$13.50 a month.
The largest part of the change is in fixed charges: +$96.00.

${OWN_WORDS}

Method: both bills were priced from my own meter data by the same bill engine (gridprims 0.1.0, gridprims.com). Taxes and charges not in the rate schedules are left out.`;

test('the draft states the docket, the +$162 a year, and the largest charge, with a blank place for the user\'s views, matching the snapshot', () => {
  assert.equal(commentDraft(who, impact, { version: '0.1.0', source: 'intervals' }), SNAPSHOT);
});

test('only the user\'s paragraph changes with their words; every number equals the computed result', () => {
  const mine = commentDraft({ ...who, ownWords: 'I work nights and cannot shift my use.' }, impact, { version: '0.1.0', source: 'intervals' });
  assert.equal(mine.replace('I work nights and cannot shift my use.', OWN_WORDS), SNAPSHOT);
  for (const n of [impact.current, impact.proposed, impact.diff]) assert.ok(SNAPSHOT.includes(Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 })), n);
});

test('the draft carries computed totals only: no interval value and no file name', () => {
  const d = commentDraft(who, impact, { version: '0.1.0', source: 'intervals' });
  assert.doesNotMatch(d, /1\.2345|\.csv|\.xml/);
});
