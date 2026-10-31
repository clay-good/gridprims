import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLocalIso, isValidZone, localToUtc, offsetMinutes, transitions, utcToLocal } from '../../../parsers/time.mjs';

// US DST in 2026: second Sunday of March (March 8) and first Sunday of November (November 1), at 2:00 am local.
const NY = 'America/New_York';

test('finds the two 2026 transitions in New York, Chicago, and Los Angeles', () => {
  for (const [zone, std] of [[NY, -300], ['America/Chicago', -360], ['America/Los_Angeles', -480]]) {
    const t = transitions(zone, 2026);
    assert.equal(t.length, 2, zone);
    assert.equal(t[0].utcMs, Date.UTC(2026, 2, 8, 2) - std * 60_000, `${zone} spring`);
    assert.equal(t[1].utcMs, Date.UTC(2026, 10, 1, 1) - std * 60_000, `${zone} fall`);
    assert.deepEqual([t[0].fromOffset, t[0].toOffset, t[1].toOffset], [std, std + 60, std]);
  }
});

test('zones without daylight saving have no transitions', () => {
  assert.deepEqual(transitions('America/Phoenix', 2026), []);
  assert.deepEqual(transitions('Pacific/Honolulu', 2026), []);
});

test('the spring-forward wall time names no instant', () => {
  assert.deepEqual(localToUtc(NY, { year: 2026, month: 3, day: 8, hour: 2, minute: 30 }), { status: 'gap' });
  assert.deepEqual(localToUtc(NY, { year: 2026, month: 3, day: 8, hour: 3, minute: 0 }), { status: 'ok', utcMs: Date.UTC(2026, 2, 8, 7) });
});

test('the fall-back wall time names two instants an hour apart', () => {
  assert.deepEqual(localToUtc(NY, { year: 2026, month: 11, day: 1, hour: 1, minute: 30 }), {
    status: 'repeat', earlier: Date.UTC(2026, 10, 1, 5, 30), later: Date.UTC(2026, 10, 1, 6, 30),
  });
});

test('an ordinary wall time maps to one instant and back', () => {
  const r = localToUtc('America/Chicago', { year: 2026, month: 7, day: 15, hour: 17, minute: 45 });
  assert.deepEqual(r, { status: 'ok', utcMs: Date.UTC(2026, 6, 15, 22, 45) });
  const back = utcToLocal('America/Chicago', r.utcMs);
  assert.deepEqual([back.hour, back.minute, back.offsetMinutes], [17, 45, -300]);
});

test('midnight reads as hour 0, not 24', () => {
  assert.equal(utcToLocal(NY, Date.UTC(2026, 0, 2, 5)).hour, 0);
});

test('a 15-minute day in local time has 92 intervals in spring and 100 in fall', () => {
  const count = (month, day) => {
    const start = localToUtc(NY, { year: 2026, month, day, hour: 0, minute: 0 }).utcMs;
    const end = localToUtc(NY, { year: 2026, month, day: day + 1, hour: 0, minute: 0 }).utcMs;
    return (end - start) / 900_000;
  };
  assert.equal(count(3, 8), 92);
  assert.equal(count(11, 1), 100);
  assert.equal(count(6, 1), 96);
});

test('offsets, validity, and ISO display', () => {
  assert.equal(offsetMinutes(NY, Date.UTC(2026, 0, 15)), -300);
  assert.equal(offsetMinutes(NY, Date.UTC(2026, 6, 15)), -240);
  assert.ok(isValidZone('America/Denver'));
  assert.ok(!isValidZone('Mars/Olympus_Mons'));
  assert.equal(formatLocalIso(NY, Date.UTC(2026, 10, 1, 5, 30)), '2026-11-01T01:30:00-04:00');
  assert.equal(formatLocalIso(NY, Date.UTC(2026, 10, 1, 6, 30)), '2026-11-01T01:30:00-05:00');
});

test('the per-hour converter agrees with the exact one on every 15-minute wall time of 2026', async () => {
  const { createLocalToUtc } = await import('../../../parsers/time.mjs');
  for (const zone of [NY, 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu']) {
    const fast = createLocalToUtc(zone);
    // Every wall time on the two transition days, and a sample of ordinary ones.
    for (const [month, day] of [[3, 8], [11, 1], [1, 15], [7, 4]]) {
      for (let h = 0; h < 24; h++) for (const minute of [0, 15, 30, 45]) {
        const f = { year: 2026, month, day, hour: h, minute };
        assert.deepEqual(fast(f), localToUtc(zone, f), `${zone} ${month}/${day} ${h}:${minute}`);
      }
    }
  }
});
