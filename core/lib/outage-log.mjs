// Outage logs as utilities export them (add-reliability-tools: index
// calculator, "Outage log intake" and "Log errors that wreck the math are
// caught"). A header row is mapped to the fields the indices need, by guess,
// and the caller may correct any column. Every row becomes an event or is
// reported with its reason, and the errors that distort the indices are found
// and listed, never fixed silently: a restoration before the start, rows that
// overlap on one device, rows that look like one interruption's partial
// restorations, and durations that cross midnight or a daylight-saving change.
// Times are local wall clock in the zone given, so a duration across a
// daylight-saving change is the real elapsed time.

import { parseDelimited } from '../../parsers/delimited.mjs';
import { localToUtc, offsetMinutes } from '../../parsers/time.mjs';

const MINUTE = 60_000;

/** The fields an outage log can carry, the header words that suggest each, and why the indices need it. */
export const OUTAGE_FIELDS = [
  { field: 'event', label: 'event number', re: /^(event|incident|outage|ticket)\s*(#|no\.?|number|id)?$|^event\s*#/i },
  { field: 'start', label: 'interruption start', re: /^(?!.*cust).*(\bbegin|\bstart|\btime\s*off\b|\boff\s*time\b|\binterrupt)/i, why: 'every index counts interruptions by when they began' },
  { field: 'restore', label: 'restoration time', re: /^(?!.*cust).*(\brestor|\bend\b|\benergi[sz]|\btime\s*on\b|\bon\s*time\b)/i, why: 'SAIDI and CAIDI need how long each interruption lasted' },
  { field: 'minutes', label: 'duration in minutes', re: /\b(duration|minutes|mins?|dur)\b/i, why: 'SAIDI and CAIDI need how long each interruption lasted' },
  { field: 'customers', label: 'customers interrupted', re: /^ci$|\bcust(omer)?s?\b.*\b(out|interrupted|affected|int)\b|\b(num(ber)?|no\.?)\s*(of\s*)?cust|cust\s*out|customers?\s*(interrupted|affected|out)/i, why: 'every index divides by customers, and counts them per interruption' },
  { field: 'device', label: 'device', re: /\b(device|transformer|fuse|recloser|switch)\b/i },
  { field: 'feeder', label: 'feeder', re: /\b(feeder|circuit)\b/i },
  { field: 'cause', label: 'cause', re: /\bcause\b/i },
  { field: 'planned', label: 'planned', re: /\b(planned|scheduled|type)\b/i },
];
const BY_FIELD = Object.fromEntries(OUTAGE_FIELDS.map((f) => [f.field, f]));

/**
 * The column each field reads, guessed from the header: each column serves at most one field, and the fields
 * claim columns in the order above.
 * @param {string[]} header
 * @returns {Record<string, number>}
 */
export function guessMapping(header) {
  const used = new Set();
  const mapping = {};
  for (const f of OUTAGE_FIELDS) {
    const i = header.findIndex((h, j) => !used.has(j) && f.re.test(String(h).trim()));
    if (i >= 0) { mapping[f.field] = i; used.add(i); }
  }
  return mapping;
}

/** Local wall-clock fields from the common ways exports write a time: ISO, or US month/day/year with 12- or 24-hour clocks. */
function wallClock(text) {
  const t = String(text ?? '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (m) return { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5], second: +(m[6] ?? 0) };
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/.exec(t);
  if (m) {
    let hour = +m[4];
    if (m[7]) { const pm = /p/i.test(m[7]); if (hour === 12) hour = pm ? 12 : 0; else if (pm) hour += 12; }
    return { year: +m[3], month: +m[1], day: +m[2], hour, minute: +m[5], second: +(m[6] ?? 0) };
  }
  return null;
}

/** A local time as an instant; a time in the fall-back repeat is taken as the earlier one and flagged. */
function instant(text, zone) {
  const f = wallClock(text);
  if (!f) return { error: `"${text}" is not a date and time we read` };
  const r = localToUtc(zone, f);
  if (r.status === 'gap') return { error: `"${text}" does not exist in ${zone}: the clocks jumped past it` };
  if (r.status === 'repeat') return { ms: r.earlier, repeated: true, local: f };
  return { ms: r.utcMs, local: f };
}

const sameDay = (a, b) => a.year === b.year && a.month === b.month && a.day === b.day;

/**
 * @param {string} text the export, with a header row
 * @param {{zone?: string, mapping?: Record<string, string | null>}} [o] mapping corrects the guess by column name; null unmaps a field
 */
export function readOutageLog(text, o = {}) {
  const zone = o.zone ?? 'America/Chicago';
  const rows = parseDelimited(String(text)).rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (!rows.length) return { status: 'missing', missing: [{ field: 'start', label: BY_FIELD.start.label, why: 'the file is empty' }], mapping: {}, columns: [] };
  const header = rows[0].map((h) => String(h).trim());
  const mapping = guessMapping(header);
  for (const [field, column] of Object.entries(o.mapping ?? {})) {
    for (const [f, i] of Object.entries(mapping)) if (column !== null && header[i] === column && f !== field) delete mapping[f];
    if (column === null) delete mapping[field];
    else { const i = header.indexOf(column); if (i >= 0) mapping[field] = i; }
  }
  // The receipt: what each column was read as.
  const columns = header.map((name, i) => ({ name, field: Object.entries(mapping).find(([, j]) => j === i)?.[0] ?? null }));
  const missing = [];
  for (const f of ['start', 'customers']) if (mapping[f] === undefined) missing.push({ field: f, label: BY_FIELD[f].label, why: BY_FIELD[f].why });
  if (mapping.restore === undefined && mapping.minutes === undefined) missing.push({ field: 'restore', label: `${BY_FIELD.restore.label} or ${BY_FIELD.minutes.label}`, why: BY_FIELD.restore.why });
  if (missing.length) return { status: 'missing', missing, mapping, columns };

  const cell = (r, f) => (mapping[f] === undefined ? '' : String(r[mapping[f]] ?? '').trim());
  const events = [];
  const invalid = [];
  const crossesMidnight = [];
  const crossesDst = [];
  const repeatedHour = [];
  rows.slice(1).forEach((r, k) => {
    const row = k + 2; // the line in the file, the header being line 1
    const start = instant(cell(r, 'start'), zone);
    if (start.error) { invalid.push({ row, reason: start.error }); return; }
    const customers = Number(cell(r, 'customers').replace(/,/g, ''));
    if (!(customers >= 0) || cell(r, 'customers') === '') { invalid.push({ row, reason: 'no number of customers interrupted' }); return; }
    let endMs;
    let minutes;
    if (mapping.restore !== undefined && cell(r, 'restore') !== '') {
      const end = instant(cell(r, 'restore'), zone);
      if (end.error) { invalid.push({ row, reason: end.error }); return; }
      endMs = end.ms;
      minutes = (end.ms - start.ms) / MINUTE;
      if (minutes < 0) { invalid.push({ row, reason: 'restored before it started' }); return; }
      if (!sameDay(start.local, end.local)) crossesMidnight.push(row);
      if (offsetMinutes(zone, start.ms) !== offsetMinutes(zone, end.ms)) crossesDst.push(row);
      if (start.repeated || end.repeated) repeatedHour.push(row);
    } else {
      minutes = Number(cell(r, 'minutes'));
      if (!(minutes >= 0)) { invalid.push({ row, reason: 'no restoration time or duration' }); return; }
      endMs = start.ms + minutes * MINUTE;
      if (start.repeated) repeatedHour.push(row);
    }
    events.push({
      row, startMs: start.ms, endMs, minutes, customers,
      ...(cell(r, 'event') ? { event: cell(r, 'event') } : {}),
      ...(cell(r, 'device') ? { device: cell(r, 'device') } : {}),
      ...(cell(r, 'feeder') ? { feeder: cell(r, 'feeder') } : {}),
      ...(cell(r, 'cause') ? { cause: cell(r, 'cause') } : {}),
      ...(/\b(planned|scheduled)\b/i.test(cell(r, 'planned')) && !/\bun(planned|scheduled)\b/i.test(cell(r, 'planned')) ? { planned: true } : {}),
    });
  });

  // Rows sharing an event number look like one interruption's partial restorations: offered, never merged here.
  const byEvent = Map.groupBy(events.filter((e) => e.event), (e) => e.event);
  const partial = [...byEvent].filter(([, es]) => es.length > 1).map(([event, es]) => ({ event, rows: es.map((e) => e.row) }));
  const inPartial = new Set(partial.flatMap((p) => p.rows));
  // Rows overlapping in time on one device (or one feeder when no device is given) that are not the same event.
  const overlaps = [];
  const byPlace = Map.groupBy(events.filter((e) => e.device || e.feeder), (e) => e.device ?? `feeder ${e.feeder}`);
  for (const [place, es] of byPlace) {
    const sorted = [...es].sort((a, b) => a.startMs - b.startMs);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length && sorted[j].startMs < sorted[i].endMs; j++) {
        if (sorted[i].event && sorted[i].event === sorted[j].event) continue;
        if (inPartial.has(sorted[i].row) && inPartial.has(sorted[j].row) && sorted[i].event === sorted[j].event) continue;
        overlaps.push({ place, rows: [sorted[i].row, sorted[j].row] });
      }
    }
  }
  return { status: 'ok', zone, mapping, columns, events, issues: { invalid, overlaps, partial, crossesMidnight, crossesDst, repeatedHour } };
}
