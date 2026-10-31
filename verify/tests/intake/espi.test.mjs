import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { intakeFile } from '../../../core/intake/index.mjs';
import { zoneFor } from '../../../core/intake/espi.mjs';
import { formatLocalIso } from '../../../parsers/time.mjs';
import { writeZip } from '../../lib/zip-writer.mjs';
import { ROOT } from '../mcp/mcp-helpers.mjs';

const enc = (s) => new TextEncoder().encode(s);
const NS = 'xmlns="http://www.w3.org/2005/Atom"';
const E = 'xmlns="http://naesb.org/espi"';

/**
 * A synthetic Green Button feed built from the espi.xsd 4.0 field definitions.
 * @param {{channels: Array<{flow: number, uom?: number, mult?: number, acc?: number, values: number[]}>, tzOffset?: number, rules?: [string, string], start?: number, seconds?: number}} o
 */
function feed({ channels, tzOffset = -18000, rules = ['360E2000', 'B40E2000'], start = 1767225600, seconds = 900 }) {
  const up = '/espi/1_1/resource/RetailCustomer/1/UsagePoint/1';
  let xml = `<?xml version="1.0" encoding="UTF-8"?><feed ${NS}>`;
  xml += `<entry><title>Home Meter</title><link rel="self" href="${up}"/><content><UsagePoint ${E}><ServiceCategory><kind>0</kind></ServiceCategory></UsagePoint></content></entry>`;
  xml += `<entry><link rel="self" href="/espi/1_1/resource/LocalTimeParameters/1"/><content><LocalTimeParameters ${E}><dstEndRule>${rules[1]}</dstEndRule><dstOffset>3600</dstOffset><dstStartRule>${rules[0]}</dstStartRule><tzOffset>${tzOffset}</tzOffset></LocalTimeParameters></content></entry>`;
  channels.forEach((c, k) => {
    const mr = `${up}/MeterReading/${k + 1}`;
    const rt = `/espi/1_1/resource/ReadingType/${k + 1}`;
    xml += `<entry><link rel="self" href="${mr}"/><link rel="related" href="${mr}/IntervalBlock"/><link rel="related" href="${rt}"/><content><MeterReading ${E}/></content></entry>`;
    xml += `<entry><link rel="self" href="${rt}"/><content><ReadingType ${E}><accumulationBehaviour>${c.acc ?? 4}</accumulationBehaviour><commodity>1</commodity><flowDirection>${c.flow}</flowDirection><intervalLength>${seconds}</intervalLength><kind>12</kind><powerOfTenMultiplier>${c.mult ?? 0}</powerOfTenMultiplier><uom>${c.uom ?? 72}</uom></ReadingType></content></entry>`;
    xml += `<entry><link rel="self" href="${mr}/IntervalBlock/1"/><link rel="up" href="${mr}/IntervalBlock"/><content><IntervalBlock ${E}><interval><duration>${seconds * c.values.length}</duration><start>${start}</start></interval>`;
    c.values.forEach((v, i) => { xml += `<IntervalReading><cost>100</cost><timePeriod><duration>${seconds}</duration><start>${start + i * seconds}</start></timePeriod><value>${v}</value></IntervalReading>`; });
    xml += '</IntervalBlock></content></entry>';
  });
  return xml + '</feed>';
}

test('the OpenESPI sample matches the receipt computed independently from the schema field definitions', async () => {
  const want = JSON.parse(readFileSync(join(ROOT, 'verify/reference/espi/openespi-test_usage_data.expected.json'), 'utf8'));
  const bytes = new Uint8Array(readFileSync(join(ROOT, 'verify/reference/espi/openespi-test_usage_data.xml')));
  const r = await intakeFile(bytes, { name: 'test_usage_data.xml' }, { zone: 'America/Los_Angeles' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.format, 'espi-xml');
  const s = r.series[0];
  assert.equal(r.series.length, 1);
  assert.equal(s.startMs.length, want.readings);
  assert.equal(s.startMs[0], want.firstStartUtcSeconds * 1000);
  assert.equal(s.startMs[s.startMs.length - 1], want.lastStartUtcSeconds * 1000);
  assert.equal(s.intervalMinutes, want.intervalLengthSeconds / 60);
  assert.ok(Math.abs(s.kwh.reduce((a, b) => a + b, 0) - want.totalKwh) < 1e-6);
  assert.equal(Math.max(...s.kwh), want.maxIntervalKwh);
  assert.equal(s.channel, 'delivered');
  assert.equal(s.meter, want.usagePointTitle);
  assert.equal(r.receipt.time.zone, zoneFor(want.tzOffsetSeconds, true));
});

test('kilowatt-hour multiplier: uom 72 with powerOfTenMultiplier 3 reads a value of 2 as 2 kWh', async () => {
  const r = await intakeFile(enc(feed({ channels: [{ flow: 1, mult: 3, values: [2, 3] }] })), { name: 'g.xml' }, { zone: 'America/New_York' });
  assert.deepEqual([...r.series[0].kwh], [2, 3]);
  assert.deepEqual(r.receipt.values.unitsRead, ['Wh × 10^3']);
});

test('solar export: flowDirection 1 and 19 stay two series, never netted', async () => {
  const r = await intakeFile(enc(feed({ channels: [{ flow: 1, values: [500, 600] }, { flow: 19, values: [100, 0] }] })), { name: 'g.xml' }, { zone: 'America/New_York' });
  assert.deepEqual(r.series.map((s) => s.channel), ['delivered', 'received']);
  assert.deepEqual([...r.series[0].kwh], [0.5, 0.6]);
  assert.deepEqual([...r.series[1].kwh], [0.1, 0]);
});

test('traveling user: local time comes from the file, and the receipt notes the device zone', async () => {
  const r = await intakeFile(enc(feed({ tzOffset: -28800, channels: [{ flow: 1, values: [1] }] })), { name: 'g.xml' }, { zone: 'America/New_York' });
  assert.equal(r.receipt.time.zone, 'America/Los_Angeles');
  assert.equal(r.receipt.time.deviceZone, 'America/New_York');
  // 1767225600 is 2026-01-01T00:00Z, which is 4:00 pm on Dec 31 in Pacific time.
  assert.equal(formatLocalIso(r.receipt.time.zone, r.series[0].startMs[0]), '2025-12-31T16:00:00-08:00');
  const chosen = await intakeFile(enc(feed({ tzOffset: -28800, channels: [{ flow: 1, values: [1] }] })), { name: 'g.xml' }, { zone: 'America/Chicago', zoneSet: true });
  assert.equal(chosen.receipt.time.zone, 'America/Chicago', 'a zone the user picks on the receipt wins');
});

test('zones from offsets and DST rules', () => {
  assert.equal(zoneFor(-25200, true), 'America/Denver');
  assert.equal(zoneFor(-25200, false), 'America/Phoenix');
  assert.equal(zoneFor(-36000, false), 'Pacific/Honolulu');
  assert.equal(zoneFor(-12600, false), 'UTC');
  assert.equal(zoneFor(-18000, false), 'Etc/GMT+5');
});

test('gas readings and cumulative registers are skipped and named; a gas-only file is refused', async () => {
  const mixed = await intakeFile(enc(feed({ channels: [{ flow: 1, values: [1000] }, { flow: 1, uom: 169, values: [5] }, { flow: 1, acc: 9, values: [123456] }] })), { name: 'g.xml' }, { zone: 'America/New_York' });
  assert.equal(mixed.series.length, 1);
  assert.deepEqual(mixed.receipt.file.rowsSkipped.map((s) => s.reason), ['readings in therms', 'cumulative register readings (only interval data is read)']);
  const gas = await intakeFile(enc(feed({ channels: [{ flow: 1, uom: 169, values: [5] }] })), { name: 'gas.xml' }, { zone: 'America/New_York' });
  assert.equal(gas.ok, false);
  assert.match(gas.message, /no electricity interval readings.*therms/);
});

test('a zipped Green Button export is read from inside the ZIP', async () => {
  const zip = writeZip([{ name: '__MACOSX/._x', data: 'junk' }, { name: 'Electric_15_Minute.xml', data: feed({ channels: [{ flow: 1, values: [250, 250] }] }) }]);
  const r = await intakeFile(zip, { name: 'export.zip' }, { zone: 'America/New_York' });
  assert.equal(r.ok, true, r.message);
  assert.deepEqual([...r.series[0].kwh], [0.25, 0.25]);
});

test('a Green Button file with an external entity is refused whole, with the fresh-export message', async () => {
  const xxe = '<?xml version="1.0"?><!DOCTYPE feed [<!ENTITY x SYSTEM "file:///etc/passwd">]><feed xmlns="http://www.w3.org/2005/Atom">&x;</feed>';
  const r = await intakeFile(enc(xxe), { name: 'g.xml' }, { zone: 'America/New_York' });
  assert.equal(r.ok, false);
  assert.match(r.message, /never need one.*fresh export/);
});
