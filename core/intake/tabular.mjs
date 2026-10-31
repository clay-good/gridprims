// Tabular intake (platform/file-intake): rows from a CSV or a workbook become
// one canonical interval series per meter and channel, plus a receipt of
// everything read and assumed. Nothing is filled, dropped, or averaged
// silently: every repair is counted on the receipt.

import { readDate, readDateTime, readNumber, readTime } from './values.mjs';
import { localToUtc } from '../../parsers/time.mjs';
import { serialToFields } from '../../parsers/xlsx.mjs';
import { assembleSeries, DUPLICATE_RULE } from './series.mjs';

/**
 * @typedef {{year: number, month: number, day: number, hour: number, minute: number, second: number}} Wall
 * @typedef {{
 *   meter: string, channel: 'delivered' | 'received' | 'net', intervalMinutes: number,
 *   unitRead: string, quantity: 'energy' | 'demand',
 *   startMs: Float64Array, kwh: Float64Array,
 * }} Series
 * @typedef {{zone: string, stampsMark?: 'auto' | 'start' | 'end', quantity?: 'auto' | 'energy' | 'demand', date1904?: boolean}} Choices
 */

const TIME_WORDS = /date|time|interval|period|start|end|hour|\bhe\b|reading|timestamp/i;
const VALUE_WORDS = /kwh|\bkw\b|\bwh\b|usage|consumption|demand|value|import|export|delivered|received|energy|\bload\b|reading/i;
const SKIP_WORDS = /cost|\$|charge|temp|note|estimat|quality|flag|status|unit of measure|^uom$|rate|price|billing/i;
const METER_WORDS = /meter|esi\s*id|esiid|service\s*(point|id|number)|account|premise|channel\s*id|sdp/i;
const TYPE_WORDS = /^type$|direction|flow|channel(?!\s*id)|import\s*\/\s*export|surplus/i;
const MAX_HEADER_SCAN = 50;

/** Cell text, whether the cell came from a CSV (a string) or a workbook. */
function text(cell) {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'string') return cell;
  return String(cell.value);
}

/** Wall-clock fields from a cell: a workbook date serial, or date-and-time text. */
function cellWall(cell, date1904) {
  if (cell && typeof cell === 'object' && cell.type === 'n' && cell.date) return serialToFields(cell.value, date1904);
  return readDateTime(text(cell));
}

/** The unit and quantity a value column's header names, and whether we had to assume. */
function unitOf(header) {
  const h = header.toLowerCase();
  if (/\bmwh\b/.test(h)) return { unit: 'MWh', quantity: 'energy', toKwh: 1000, assumed: false };
  if (/\bkwh\b|kilowatt[- ]?hours?/.test(h)) return { unit: 'kWh', quantity: 'energy', toKwh: 1, assumed: false };
  if (/(^|[^k])\bwh\b|watt[- ]?hours?/.test(h)) return { unit: 'Wh', quantity: 'energy', toKwh: 0.001, assumed: false };
  if (/\bkw\b|kilowatts?(?![- ]?h)|demand/.test(h)) return { unit: 'kW', quantity: 'demand', toKwh: 1, assumed: false };
  return { unit: 'kWh', quantity: 'energy', toKwh: 1, assumed: true };
}

/** Channel named by a header or a type cell: received (export) or delivered (import). */
function channelOf(s) {
  if (/export|received|reverse|generat|outflow|\bout\b|returned/i.test(s)) return 'received';
  if (/\bnet\b/i.test(s)) return 'net';
  return 'delivered';
}

/** Headers of a wide layout name a time of day or an hour number: "0:15", "01:00", "HE1", "Hour 24". */
function wideSlot(header) {
  const h = header.trim();
  let m = /^(?:he|hr|hour|h)\s*0?(\d{1,2})$/i.exec(h);
  if (m && +m[1] >= 1 && +m[1] <= 25) return { hour: +m[1], minute: 0, ending: true };
  const t = readTime(h.replace(/\s*(kwh|kw)$/i, ''));
  if (t && /:\d{2}/.test(h)) return { hour: t.hour, minute: t.minute, ending: false };
  return null;
}

/**
 * Find the header row by its content: the first row naming a time column and
 * a value column, followed by a row that reads as data.
 * @param {any[][]} rows
 * @param {boolean} date1904
 */
function findHeader(rows, date1904) {
  for (let i = 0; i < Math.min(rows.length - 1, MAX_HEADER_SCAN); i++) {
    const cells = rows[i].map(text);
    const wide = cells.filter((c) => wideSlot(c)).length >= 12;
    if (!cells.some((c) => TIME_WORDS.test(c)) || !(wide || cells.some((c) => VALUE_WORDS.test(c) && !SKIP_WORDS.test(c)))) continue;
    for (let j = i + 1; j < Math.min(rows.length, i + 4); j++) {
      if (rows[j].some((c) => cellWall(c, date1904) || readDate(text(c)))) return i;
    }
  }
  return -1;
}

/**
 * Work out what each column holds.
 * @param {string[]} header
 * @param {any[][]} sample data rows after the header
 * @param {boolean} date1904
 */
function classify(header, sample, date1904) {
  const col = { datetime: -1, date: -1, start: -1, end: -1, hourNumber: -1, meter: -1, type: -1, values: /** @type {number[]} */ ([]), wide: /** @type {Array<{i: number, slot: any}>} */ ([]) };
  const colText = (i) => sample.map((r) => text(r[i])).filter((t) => t.trim() !== '');
  header.forEach((h, i) => {
    const vals = colText(i);
    const allWall = vals.length > 0 && vals.every((v, k) => cellWall(sample[k]?.[i], date1904) || readDateTime(v));
    const slot = wideSlot(h);
    if (slot && vals.every((v) => readNumber(v) !== null)) { col.wide.push({ i, slot }); return; }
    if (col.datetime < 0 && allWall && TIME_WORDS.test(h) && !/\bend\b|\bto\b/i.test(h)) { col.datetime = i; return; }
    if (allWall && /\bend\b|\bto\b/i.test(h) && col.end < 0) { col.end = i; return; }
    if (col.date < 0 && /date|day/i.test(h) && vals.length && vals.every((v) => readDate(v))) { col.date = i; return; }
    if (/hour/i.test(h) && !/:/.test(vals[0] ?? '') && vals.length && vals.every((v) => /^\d{1,2}$/.test(v.trim()))) { col.hourNumber = i; return; }
    if (vals.length && vals.every((v) => readTime(v))) {
      if (/\bend\b|\bto\b/i.test(h)) { if (col.end < 0) col.end = i; } else if (col.start < 0) col.start = i;
      return;
    }
    const numeric = vals.length > 0 && vals.filter((v) => readNumber(v) !== null).length >= vals.length * 0.8;
    // A header naming a unit over numbers is usage, even if it also says "meter".
    if (numeric && /\b(k?wh|kw|mwh)\b/i.test(h) && !SKIP_WORDS.test(h)) { col.values.push(i); return; }
    if (METER_WORDS.test(h)) { col.meter = i; return; }
    if (TYPE_WORDS.test(h) && vals.some((v) => readNumber(v) === null)) { col.type = i; return; }
    if (SKIP_WORDS.test(h)) return;
    if (VALUE_WORDS.test(h) && numeric) col.values.push(i);
  });
  return col;
}

const naive = (w) => Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second ?? 0);
const fromNaive = (ms) => { const d = new Date(ms); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() }; };
const mode = (xs) => { const f = new Map(); let best = 0; let n = 0; for (const x of xs) { const c = (f.get(x) ?? 0) + 1; f.set(x, c); if (c > n) { n = c; best = x; } } return best; };

/**
 * Read tabular rows into canonical series and a receipt.
 * @param {any[][]} rows strings (CSV) or workbook cells
 * @param {Choices} choices the receipt's current choices; zone is required
 * @param {{name?: string, size?: number, encoding?: string, delimiter?: string, format?: string}} [file]
 */
export function readTable(rows, choices, file = {}) {
  const date1904 = choices.date1904 ?? false;
  const skipped = new Map();
  const skip = (why) => skipped.set(why, (skipped.get(why) ?? 0) + 1);
  const h = findHeader(rows, date1904);
  if (h < 0) {
    return { ok: false, message: 'We could not find a header row with a date or time column and a usage column in the first 50 rows.', receipt: { file: { ...file, rows: rows.length } } };
  }
  const header = rows[h].map(text);
  const data = rows.slice(h + 1);
  const sample = data.filter((r) => r.some((c) => text(c).trim() !== '')).slice(0, 20);
  const col = classify(header, sample, date1904);
  const wide = col.wide.length >= 12;
  if (!wide && col.values.length === 0) return { ok: false, message: 'We found the header row but no column of usage numbers (kWh, kW, or Wh).', receipt: { file: { ...file, rows: rows.length }, header: header.map((x) => x.slice(0, 80)) } };
  if (col.datetime < 0 && col.date < 0 && col.end < 0) return { ok: false, message: 'We found usage numbers but no date column.', receipt: { file: { ...file, rows: rows.length } } };

  // One raw reading per row and value column: local wall time, meter, channel, number.
  /** @type {Array<{wall: Wall, meter: string, channel: string, vcol: number, value: number, line: number}>} */
  const raw = [];
  let endingEvidence = '';
  const valueCols = wide ? col.wide.map((w) => w.i) : col.values;
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const line = h + 2 + r;
    if (row.every((c) => text(c).trim() === '')) continue;
    const meter = col.meter >= 0 ? text(row[col.meter]).trim().slice(0, 80) : '';
    const typeCell = col.type >= 0 ? text(row[col.type]) : '';
    let base = null;
    if (col.datetime >= 0) base = cellWall(row[col.datetime], date1904);
    else if (col.date >= 0) {
      const d = readDate(text(row[col.date]));
      if (d) {
        if (col.start >= 0) { const t = readTime(text(row[col.start])); base = t ? { ...d.date, ...t } : null; }
        else if (col.hourNumber >= 0) { const n = Number(text(row[col.hourNumber])); base = Number.isInteger(n) ? { ...d.date, hour: n, minute: 0, second: 0 } : null; }
        else if (col.end >= 0) { const t = readTime(text(row[col.end])); base = t ? { ...d.date, ...t } : null; }
        else if (wide) base = { ...d.date, hour: 0, minute: 0, second: 0 };
      }
    } else if (col.end >= 0) base = cellWall(row[col.end], date1904);
    if (!base) { skip('no readable date or time'); continue; }
    if (base.hour === 24 && col.hourNumber < 0) endingEvidence = 'a 24:00 stamp';
    let any = false;
    for (const vc of valueCols) {
      const v = readNumber(text(row[vc]));
      if (v === null) continue;
      any = true;
      let wall = base;
      if (wide) {
        const slot = col.wide.find((w) => w.i === vc).slot;
        wall = { ...base, hour: slot.hour, minute: slot.minute, second: 0 };
        if (slot.ending || slot.hour === 24) endingEvidence ||= 'hour-ending column headers';
      }
      // A column that names its direction wins over a generic type column.
      const named = /import|export|deliver|receiv|\bnet\b/i.test(header[vc]);
      raw.push({ wall, meter, channel: named || !typeCell ? channelOf(header[vc]) : channelOf(typeCell), vcol: vc, value: v, line });
    }
    if (!any) skip('no usage number');
  }
  if (!raw.length) return { ok: false, message: 'No rows had both a date and a usage number.', receipt: { file: { ...file, rows: rows.length } } };

  // Interval length: the most common step between consecutive stamps of one meter and column.
  const steps = [];
  const lastBy = new Map();
  for (const r of raw) {
    const k = `${r.meter}|${r.vcol}|${r.channel}`;
    const t = naive(r.wall);
    const prev = lastBy.get(k);
    if (prev !== undefined && t > prev) steps.push(Math.round((t - prev) / 60_000));
    lastBy.set(k, t);
  }
  let intervalMinutes = steps.length ? mode(steps.filter((s) => s > 0 && s <= 1440)) : 60;
  if (wide && [24, 48, 96, 288].includes(col.wide.length)) intervalMinutes = 1440 / col.wide.length;
  if (col.start >= 0 && col.end >= 0 && col.date >= 0) {
    const t0 = readTime(text(sample[0][col.start]));
    const t1 = readTime(text(sample[0][col.end]));
    if (t0 && t1) {
      const d = ((t1.hour * 60 + t1.minute - (t0.hour * 60 + t0.minute)) + 1440) % 1440;
      if ([5, 10, 15, 30, 60].includes(d)) intervalMinutes = d;
      else if ([4, 9, 14, 29, 59].includes(d)) intervalMinutes = d + 1; // "0:00 - 0:14" style end stamps
    }
  }
  const mixed = new Set(steps.filter((s) => s > 0 && s < intervalMinutes)).size > 0;

  // Interval-start or interval-ending stamps.
  if (col.hourNumber >= 0) {
    const hours = raw.map((r) => r.wall.hour);
    if (Math.min(...hours) === 1 && Math.max(...hours) === 24) endingEvidence = 'hour numbers 1 to 24';
    else if (endingEvidence === '' && Math.max(...hours) === 24) endingEvidence = 'an hour numbered 24';
  }
  if (!endingEvidence && col.datetime < 0 && col.start < 0 && col.end >= 0) endingEvidence = 'only an end-time column';
  const detectedMark = endingEvidence ? 'end' : 'start';
  const stampsMark = choices.stampsMark && choices.stampsMark !== 'auto' ? choices.stampsMark : detectedMark;

  // Wall time to UTC in the chosen zone, keeping both fall-back hours and refusing spring-gap times.
  const zone = choices.zone;
  const seen = new Map();
  let repeatedKept = 0;
  const readings = [];
  for (const r of raw) {
    let w = r.wall;
    if (stampsMark === 'end') w = fromNaive(naive(w) - intervalMinutes * 60_000);
    else if (w.hour === 24) w = fromNaive(naive(w));
    const u = localToUtc(zone, w);
    if (u.status === 'gap') { skip('a time that does not exist on the spring-forward day'); continue; }
    let ms;
    if (u.status === 'repeat') {
      const k = `${r.meter}|${r.vcol}|${r.channel}|${naive(w)}`;
      const n = seen.get(k) ?? 0;
      seen.set(k, n + 1);
      ms = n === 0 ? u.earlier : u.later;
      if (n === 1) repeatedKept++;
    } else ms = u.utcMs;
    readings.push({ ...r, ms });
  }

  // Units, per value column.
  const units = new Map(valueCols.map((vc) => [vc, wide ? unitOf(header.join(' ')) : unitOf(header[vc])]));
  const quantityChoice = choices.quantity && choices.quantity !== 'auto' ? choices.quantity : null;

  // Group into series by meter and channel; resolve duplicates.
  const groups = new Map();
  // In a one-row-per-interval file with several usage columns and no meter
  // column, each column is its own series, named by its header.
  const perColumn = !wide && valueCols.length > 1;
  for (const r of readings) {
    const meter = r.meter || (perColumn && !/import|export|delivered|received/i.test(header[r.vcol]) ? header[r.vcol].slice(0, 80) : '');
    const k = `${meter}|${r.channel}|${perColumn ? r.vcol : ''}`;
    if (!groups.has(k)) groups.set(k, { meter, channel: r.channel, vcol: r.vcol, items: [] });
    groups.get(k).items.push(r);
  }
  const series = [];
  const duplicates = { identical: 0, conflicting: 0, examples: [] };
  const gaps = [];
  for (const g of groups.values()) {
    const u = units.get(g.vcol);
    const quantity = quantityChoice ?? u.quantity;
    series.push(assembleSeries(g.items, { meter: g.meter, channel: g.channel, intervalMinutes, unitRead: u.unit, quantity, toKwh: u.toKwh }, duplicates, gaps));
  }
  series.sort((a, b) => a.meter.localeCompare(b.meter) || a.channel.localeCompare(b.channel));

  const allMs = readings.map((r) => r.ms);
  const first = Math.min(...allMs);
  const last = Math.max(...allMs);
  const months = new Set(readings.map((r) => `${r.wall.year}-${r.wall.month}`)).size;
  const unitList = [...new Set([...units.values()].map((u) => u.unit))];
  const ambiguous = [...units.entries()].find(([, u]) => u.assumed);

  return {
    ok: true,
    series,
    receipt: {
      file: { ...file, rowsRead: readings.length, headerRow: h + 1, rowsSkipped: [...skipped].map(([reason, count]) => ({ reason, count })) },
      columns: {
        layout: wide ? 'one row per day' : 'one row per interval',
        time: col.datetime >= 0 ? header[col.datetime] : [col.date, col.start, col.hourNumber, col.end].filter((i) => i >= 0).map((i) => header[i]).join(' + '),
        values: valueCols.map((i) => header[i].slice(0, 80)),
        source_text: header.map((x) => x.slice(0, 80)),
      },
      time: {
        intervalMinutes, mixedIntervals: mixed, stampsMark, stampsDetected: detectedMark,
        stampsReason: endingEvidence ? `timestamps mark the end of each interval (${endingEvidence})` : 'timestamps mark the start of each interval',
        zone, firstMs: first, lastMs: last, months,
      },
      values: {
        quantity: quantityChoice ?? (units.get(valueCols[0])?.quantity ?? 'energy'),
        unitsRead: unitList,
        assumption: ambiguous ? `The column "${header[ambiguous[0]].slice(0, 80)}" does not name a unit, so it was read as kWh per interval.` : null,
      },
      meters: series.map((s) => ({ meter: s.meter, channel: s.channel, intervals: s.startMs.length, unitRead: s.unitRead })),
      quality: {
        gaps,
        duplicates: { identical: duplicates.identical, conflicting: duplicates.conflicting, rule: DUPLICATE_RULE, examples: duplicates.examples },
        dst: { repeatedKept },
      },
      choices: { zone, stampsMark, quantity: quantityChoice ?? 'auto' },
    },
  };
}
