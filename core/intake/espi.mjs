// Green Button ESPI XML (platform/file-intake, "Green Button fields read by the
// standard"). Implements espi.xsd 4.0 only. Each handled element cites its
// schema type; values are scaled by uom and 10^powerOfTenMultiplier, never
// assumed to be watt-hours; delivered and received channels stay separate.

import { findAll, parseXml } from '../../parsers/xml.mjs';
import { utcToLocal } from '../../parsers/time.mjs';
import { assembleSeries, DUPLICATE_RULE } from './series.mjs';

/** UnitSymbolKind codes we read as electricity (espi.xsd 4.0): 72 Wh is energy, 38 W is demand. */
export const ELECTRIC_UOM = { 72: { unit: 'Wh', quantity: 'energy', toKwh: 0.001 }, 38: { unit: 'W', quantity: 'demand', toKwh: 0.001 } };
/** Codes for other commodities, named so the receipt can say what it skipped. */
export const OTHER_UOM = { 119: 'cubic feet of gas', 120: 'compensated cubic feet of gas', 169: 'therms', 132: 'Btu', 80: 'money', 63: 'reactive power (VAr)', 73: 'reactive energy (VArh)', 61: 'apparent power (VA)', 71: 'apparent energy (VAh)' };
/** FlowDirectionKind (espi.xsd 4.0): 1 forward (delivered), 19 reverse (received), 4 net. */
export const FLOW = { 1: 'delivered', 19: 'received', 4: 'net' };
/** US daylight-saving rules as ESPI DstRuleType bitfields: 2nd Sunday of March and 1st Sunday of November, 2:00 am. */
const US_DST = { start: 0x360e2000, end: 0xb40e2000 };

/** Direct child element's text, by local name. */
const child = (node, local) => node?.children.find((c) => c.local === local)?.text;
const num = (node, local) => { const t = child(node, local); return t === undefined ? undefined : Number(t); };

/**
 * An IANA zone for a LocalTimeParameters offset and DST rule, or a fixed-offset zone.
 * @param {number} tzOffset seconds east of UTC (US zones are negative)
 * @param {boolean} usDst whether the file's DST rules are the US rules
 */
export function zoneFor(tzOffset, usDst) {
  const withDst = { [-18000]: 'America/New_York', [-21600]: 'America/Chicago', [-25200]: 'America/Denver', [-28800]: 'America/Los_Angeles', [-32400]: 'America/Anchorage', [-36000]: 'America/Adak' };
  const without = { [-25200]: 'America/Phoenix', [-36000]: 'Pacific/Honolulu', [-14400]: 'America/Puerto_Rico' };
  const named = (usDst ? withDst : without)[tzOffset];
  if (named) return named;
  const hours = -tzOffset / 3600;
  return Number.isInteger(hours) && hours !== 0 ? `Etc/GMT${hours > 0 ? '+' : '-'}${Math.abs(hours)}` : 'UTC';
}

/**
 * Read a Green Button XML document.
 * @param {string} text
 * @param {{zone: string, zoneSet?: boolean}} choices zone is the device zone; zoneSet means the user picked it on the receipt
 * @param {object} [file]
 */
export function readEspi(text, choices, file = {}) {
  const root = parseXml(text); // refuses any DTD or entity before reading
  const entries = findAll(root, 'entry').map((e) => {
    const links = e.children.filter((c) => c.local === 'link').map((l) => ({ rel: l.attrs.rel, href: l.attrs.href }));
    const content = e.children.find((c) => c.local === 'content')?.children[0];
    return { links, self: links.find((l) => l.rel === 'self')?.href, up: links.find((l) => l.rel === 'up')?.href, related: links.filter((l) => l.rel === 'related').map((l) => l.href), title: child(e, 'title') ?? '', content };
  }).filter((e) => e.content);

  const byType = (local) => entries.filter((e) => e.content.local === local);
  const readingTypes = new Map(byType('ReadingType').map((e) => [e.self, e.content]));
  const usagePoints = byType('UsagePoint');
  const ltp = byType('LocalTimeParameters')[0]?.content;

  // Local time from the file (TimeConfiguration: tzOffset and dstOffset in seconds, DST rules as hex bitfields).
  let fileZone = null;
  if (ltp) {
    const rules = { start: parseInt(child(ltp, 'dstStartRule') ?? 'FFFFFFFF', 16), end: parseInt(child(ltp, 'dstEndRule') ?? 'FFFFFFFF', 16) };
    const usDst = rules.start === US_DST.start && rules.end === US_DST.end && num(ltp, 'dstOffset') === 3600;
    fileZone = zoneFor(num(ltp, 'tzOffset') ?? 0, usDst);
  }
  const zone = choices.zoneSet || !fileZone ? choices.zone : fileZone;

  const skipped = new Map();
  const skip = (why, n = 1) => skipped.set(why, (skipped.get(why) ?? 0) + n);
  const duplicates = { identical: 0, conflicting: 0, examples: [] };
  const gaps = [];
  const series = [];
  let readingCount = 0;

  for (const mr of byType('MeterReading')) {
    const rt = mr.related.map((h) => readingTypes.get(h)).find(Boolean) ?? (readingTypes.size === 1 ? [...readingTypes.values()][0] : undefined);
    const blocks = byType('IntervalBlock').filter((b) => b.up === `${mr.self}/IntervalBlock` || b.self?.startsWith(`${mr.self}/`) || mr.related.includes(b.up));
    const readings = blocks.flatMap((b) => findAll(b.content, 'IntervalReading'));
    if (!rt) { skip('readings with no ReadingType', readings.length); continue; }
    const uom = num(rt, 'uom');
    const electric = ELECTRIC_UOM[uom];
    if (!electric) { skip(`readings in ${OTHER_UOM[uom] ?? `unit code ${uom}`}`, readings.length); continue; }
    const channel = FLOW[num(rt, 'flowDirection')];
    if (!channel) { skip(`readings with flow direction ${num(rt, 'flowDirection')}`, readings.length); continue; }
    const accumulation = num(rt, 'accumulationBehaviour');
    if (accumulation !== undefined && accumulation !== 4) { skip('cumulative register readings (only interval data is read)', readings.length); continue; }
    const multiplier = 10 ** (num(rt, 'powerOfTenMultiplier') ?? 0);
    const declared = num(rt, 'intervalLength');

    const items = [];
    const durations = [];
    for (const r of readings) {
      const tp = r.children.find((c) => c.local === 'timePeriod');
      const start = num(tp, 'start');
      const value = num(r, 'value');
      if (!Number.isFinite(start) || !Number.isFinite(value)) { skip('readings with no start or value'); continue; }
      durations.push(num(tp, 'duration') ?? declared);
      items.push({ ms: start * 1000, value: value * multiplier });
    }
    const seconds = declared ?? durations[0];
    if (!items.length || !seconds) continue;
    readingCount += items.length;
    const up = usagePoints.find((u) => mr.self?.startsWith(`${u.self}/`));
    const meter = (up?.title || up?.self?.split('/').pop() || '').slice(0, 80);
    series.push(assembleSeries(items, {
      meter, channel, intervalMinutes: seconds / 60, unitRead: `${electric.unit} × 10^${Math.log10(multiplier)}`,
      quantity: electric.quantity, toKwh: electric.toKwh,
    }, duplicates, gaps));
  }

  if (!series.length) {
    const why = [...skipped.keys()].join('; ');
    return { ok: false, message: why ? `This Green Button file has no electricity interval readings we read (${why}).` : 'This Green Button file has no interval readings.', receipt: { file } };
  }
  series.sort((a, b) => a.meter.localeCompare(b.meter) || a.channel.localeCompare(b.channel));
  const first = Math.min(...series.map((s) => s.startMs[0]));
  const last = Math.max(...series.map((s) => s.startMs[s.startMs.length - 1]));
  const months = new Set(series.flatMap((s) => Array.from(s.startMs, (ms) => { const l = utcToLocal(zone, ms); return `${l.year}-${l.month}`; }))).size;

  return {
    ok: true,
    series,
    receipt: {
      file: { ...file, rowsRead: readingCount, rowsSkipped: [...skipped].map(([reason, count]) => ({ reason, count })) },
      columns: { layout: 'Green Button ESPI 4.0', time: 'IntervalReading timePeriod start (UTC seconds)', values: series.map((s) => `${s.channel} ${s.unitRead}`), source_text: series.map((s) => s.meter) },
      time: {
        intervalMinutes: series[0].intervalMinutes, mixedIntervals: new Set(series.map((s) => s.intervalMinutes)).size > 1,
        stampsMark: 'start', stampsDetected: 'start', stampsReason: 'Green Button timestamps mark the start of each interval',
        zone, zoneFromFile: fileZone, deviceZone: choices.zone, firstMs: first, lastMs: last, months,
      },
      values: { quantity: series[0].quantity, unitsRead: [...new Set(series.map((s) => s.unitRead))], assumption: null },
      meters: series.map((s) => ({ meter: s.meter, channel: s.channel, intervals: s.startMs.length, unitRead: s.unitRead })),
      quality: { gaps, duplicates: { ...duplicates, rule: DUPLICATE_RULE }, dst: { repeatedKept: 0 } },
      choices: { zone, stampsMark: 'start', quantity: 'auto' },
    },
  };
}
