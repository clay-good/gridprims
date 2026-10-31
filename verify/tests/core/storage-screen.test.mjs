// Would a battery or solar pay off here? (load and bill analyzer tasks 6.1 to
// 6.4), each scenario as the storage-and-solar-screen spec states it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { alignSolar, EXCLUDED, netLoad, payback, peakShave, readPvwatts, savings, UPPER_BOUND } from '../../../core/lib/storage-screen.mjs';
import { fromManual } from '../../../core/lib/tariff-record.mjs';
import { localToUtc } from '../../../parsers/time.mjs';

const ROOT = join(import.meta.dirname, '../../..');
const series = (startIso, count, minutes, kwOf) => {
  const start = Date.parse(`${startIso}Z`);
  const startMs = Float64Array.from({ length: count }, (_, i) => start + i * minutes * 60_000);
  return { startMs, kwh: Float64Array.from(startMs, (ms, i) => (kwOf(new Date(ms), i) * minutes) / 60), intervalMinutes: minutes };
};

test('a six-hour plateau 150 kW above the rest: a 500 kW battery with 160 kWh usable cuts the peak by 26.7 kW, limited by energy', () => {
  // April at 100 kW, with 250 kW from noon to 6 pm on April 15.
  const s = series('2026-04-01T00:00:00', 30 * 24 * 4, 15, (d) => (d.getUTCDate() === 15 && d.getUTCHours() >= 12 && d.getUTCHours() < 18 ? 250 : 100));
  const r = peakShave(s, { powerKw: 500, energyKwh: 200 }, 'UTC');
  const [apr] = r.months;
  assert.ok(Math.abs(apr.cutKw - 160 / 6) <= 0.1, `${apr.cutKw}`);
  assert.equal(apr.limit, 'energy');
  assert.match(r.limitText, /^Energy, not power, limited savings/);
  assert.ok(Math.abs(apr.dischargedKwh - 160) < 1);
  // Losses are taken on charging: the grid supplies discharged ÷ 0.85.
  assert.ok(Math.abs(apr.chargedKwh - apr.dischargedKwh / 0.85) < 1);
  assert.ok(Math.max(...Array.from(r.series.kwh, (x) => x * 4)) <= apr.newPeakKw + 1e-6);
  assert.deepEqual(r.assumptions, { roundTrip: 0.85, socMin: 0.1, socMax: 0.9, powerKw: 500, energyKwh: 200 });
});

test('power-limited: a short spike larger than the battery\'s power is cut by its power, and cycles are counted', () => {
  const s = series('2026-04-01T00:00:00', 30 * 24 * 4, 15, (d, i) => (i === 500 ? 400 : 100));
  const r = peakShave(s, { powerKw: 50, energyKwh: 500 }, 'UTC');
  assert.ok(Math.abs(r.months[0].cutKw - 50) <= 0.1);
  assert.equal(r.months[0].limit, 'power');
  assert.ok(r.cycles > 0 && r.cycles < 1);
});

test('the result says savings are an upper bound, and lists what it leaves out', () => {
  assert.match(UPPER_BOUND, /real-world savings are typically lower because dispatch cannot see the future/);
  assert.deepEqual(EXCLUDED, ['auxiliary load', 'forecast error (dispatch here sees the future)', 'export rules', 'interconnection limits', 'incentives']);
});

/** A PVWatts v8 export in the API's real layout (the committed excerpt's header), filled out to 8,760 hours. */
function pvwattsFile(acW) {
  const excerpt = readFileSync(join(ROOT, 'verify/fixtures/bill/pvwatts-v8-austin-excerpt.csv'), 'utf8').split('\n');
  const head = excerpt.slice(0, excerpt.findIndex((l) => l.startsWith('month,day,hour')) + 1);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rows = [];
  for (let h = 0; h < 8760; h++) {
    const d = new Date(Date.UTC(2023, 0, 1) + h * 3_600_000);
    rows.push(`${months[d.getUTCMonth()]},${d.getUTCDate()},${d.getUTCHours()},${acW(d)},0,0,0,0,0,0,0,0`);
  }
  return [...head, ...rows].join('\n');
}

test('a PVWatts v8 hourly export reads as 8,760 hours of kW with its system size and time zone; a short file is refused', () => {
  const pv = readPvwatts(pvwattsFile((d) => (d.getUTCHours() === 12 ? 3000 : 0)));
  assert.equal(pv.status, 'ok');
  assert.deepEqual([pv.kw.length, pv.systemKw, pv.tzHours, pv.kw[12]], [8760, 4, -6, 3]);
  const excerpt = readPvwatts(readFileSync(join(ROOT, 'verify/fixtures/bill/pvwatts-v8-austin-excerpt.csv'), 'utf8'));
  assert.deepEqual(excerpt, { status: 'refused', reason: 'A PVWatts hourly export has 8,760 hours; this one has 32.' });
});

test('a typical year on 2024 meter data: February 29 repeats February 28, summer hours shift to daylight time, and the receipt says so', () => {
  // Output is the typical year's month × 100 + its standard-time hour, so each interval shows where it came from.
  const pv = readPvwatts(pvwattsFile((d) => ((d.getUTCMonth() + 1) * 100 + d.getUTCHours() + (d.getUTCMonth() === 1 && d.getUTCDate() === 28 ? 50 : 0)) * 1000));
  const zone = 'America/Chicago';
  const start = localToUtc(zone, { year: 2024, month: 1, day: 1, hour: 0, minute: 0 }).utcMs;
  const meter = { startMs: Float64Array.from({ length: 366 * 24 }, (_, i) => start + i * 3_600_000), intervalMinutes: 60 };
  const a = alignSolar(meter, pv, { zone, systemKw: 8 });
  const at = (month, day, hour) => a.kwh[meter.startMs.indexOf(localToUtc(zone, { year: 2024, month, day, hour, minute: 0 }).utcMs)];
  assert.equal(at(2, 29, 9), (200 + 9 + 50) * 2, 'February 29 at 9 am is February 28 at 9 am, scaled from 4 to 8 kW');
  assert.equal(at(7, 10, 13), (700 + 12) * 2, '1 pm daylight time is noon standard time');
  assert.equal(at(1, 10, 13), (100 + 13) * 2, 'winter hours need no shift');
  assert.deepEqual(a.notes, ['Solar hours are matched by month, day, and standard-time hour from the PVWatts typical year.', 'Summer hours are shifted to daylight-saving time to match the meter.', 'February 28 is repeated for February 29.', 'Production is scaled from the export\'s 4 kW DC to 8 kW DC.']);
});

test('solar against evening peaks saves energy but little demand charge, and says why', () => {
  // 60 kW from 6 pm to 10 pm, 20 kW otherwise; solar at 30 kW from 10 am to 3 pm.
  const s = series('2026-06-01T00:00:00', 30 * 24, 60, (d) => (d.getUTCHours() >= 18 && d.getUTCHours() < 22 ? 60 : 20));
  const solar = Float64Array.from(s.startMs, (ms) => { const h = new Date(ms).getUTCHours(); return h >= 10 && h < 15 ? 30 : 0; });
  const rec = fromManual({ energyRate: 0.1, demandRate: 15 });
  const r = savings(s, netLoad(s, solar), rec, { zone: 'UTC' });
  assert.equal(r.demand, 0);
  assert.ok(r.energy > 0);
  assert.equal(r.lateMonths, r.months, 'every month peaks after 6 pm');
  assert.deepEqual(r.limits, []);
  const tou = { ...rec, demand: { unit: 'kW', daily: false, periods: [{ tiers: [{ rate: 5 }] }], weekday: rec.energy.weekday, weekend: rec.energy.weekend } };
  assert.match(savings(s, netLoad(s, solar), tou, { zone: 'UTC' }).limits[0], /is a screen, not an upper bound/);
});

test('payback: $200,000 installed and $25,000 a year is 8.0 years; with no cost, no payback and a prompt with the ATB link', () => {
  assert.deepEqual(payback(200000, 25000), { years: 8 });
  const none = payback(undefined, 25000);
  assert.equal(none.years, null);
  assert.match(none.prompt, /^Enter an installed cost/);
  assert.equal(none.atbUrl, 'https://atb.nlr.gov/');
});
