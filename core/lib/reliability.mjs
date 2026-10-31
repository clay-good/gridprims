// Distribution reliability indices from a utility's own outage log
// (add-reliability-tools: index-calculator, major-event-days). Every formula
// comes from a free source named per index in docs/derivations/reliability.md;
// IEEE 1366's own text is paywalled and is neither quoted nor needed. Nothing
// is estimated: an index that needs per-customer records is reported as
// unavailable instead.

import { utcToLocal } from '../../parsers/time.mjs';

/** EIA-861's instructions: a sustained interruption is one of more than 5 minutes. */
export const SUSTAINED_MINUTES = 5;
/** The multiplier in the 2.5 beta method. */
export const MED_MULTIPLIER = 2.5;
/** Ours, not the method's: no free source states a minimum, so we set and disclose one. */
export const MIN_ACTIVE_DAYS = 30;
/** The years of daily values the method assumes. */
export const YEARS_EXPECTED = 5;

/** Where each index's formula is published, free to read. */
export const SOURCES = {
  perCustomer: 'Form EIA-861 instructions, Schedule 3 Part B (public domain): the sum of customers interrupted over the year, divided by the customers served.',
  minutesPerCustomer: 'Form EIA-861 instructions, Schedule 3 Part B (public domain): the sum of customer minutes interrupted over the year, divided by the customers served.',
  minutesPerInterrupted: 'New Mexico 17.9.589 NMAC, and the IEEE PES Boston chapter tutorial (Teixeira, National Grid, February 19, 2019), slides 75 to 90. The federal form does not collect it.',
  availability: 'New Mexico 17.9.589 NMAC, and the same tutorial: the share of the period\'s customer hours in which service was available. The federal form does not collect it.',
  momentary: 'The same tutorial. The federal form collects no momentary index.',
  threshold: 'The same tutorial, slides 75 to 90: daily values, days without interruptions left out, the mean and standard deviation of their logarithms, and the threshold as e to the power of the mean plus 2.5 standard deviations.',
};

const MINUTE = 60_000;
const round = (x, places) => Math.round(x * 10 ** places) / 10 ** places;
const localDay = (zone, ms) => { const l = utcToLocal(zone, ms); return `${l.year}-${String(l.month).padStart(2, '0')}-${String(l.day).padStart(2, '0')}`; };

/**
 * An event's length in minutes, from its restoration time or its stated duration.
 * @param {{startMs: number, endMs?: number, minutes?: number}} e
 */
export const minutesOf = (e) => (e.minutes !== undefined ? e.minutes : (e.endMs - e.startMs) / MINUTE);

/**
 * Events that cannot be used, and events outside the reporting period. Nothing
 * is merged or dropped silently: each is returned with its reason.
 * @param {Array<any>} events
 * @param {{fromMs: number, toMs: number}} period
 */
export function review(events, period) {
  const invalid = [];
  const outside = [];
  const ok = [];
  events.forEach((e, i) => {
    const at = { row: i + 1, event: e };
    if (!(e.customers >= 0)) invalid.push({ ...at, reason: 'no number of customers interrupted' });
    else if (e.endMs !== undefined && e.endMs < e.startMs) invalid.push({ ...at, reason: 'restored before it started' });
    else if (minutesOf(e) < 0) invalid.push({ ...at, reason: 'a negative duration' });
    else if (e.startMs < period.fromMs || e.startMs >= period.toMs) outside.push({ ...at, reason: 'starts outside the reporting period' });
    else ok.push(e);
  });
  return { ok, invalid, outside };
}

/**
 * Rows the user has confirmed are one interruption's partial restorations:
 * their customers are interrupted once, and their customer minutes are summed.
 * @param {Array<any>} rows
 */
export function mergePartial(rows) {
  const startMs = Math.min(...rows.map((r) => r.startMs));
  const customers = rows.reduce((n, r) => n + r.customers, 0);
  const customerMinutes = rows.reduce((n, r) => n + r.customers * minutesOf(r), 0);
  return { startMs, customers, customerMinutes, minutes: customerMinutes / customers, parts: rows.length, merged: true, ...(rows[0].planned ? { planned: true } : {}) };
}

/** An event's customer minutes, from a merge or from its own count and length. */
export const customerMinutesOf = (e) => (e.customerMinutes !== undefined ? e.customerMinutes : e.customers * minutesOf(e));

/**
 * Sustained (longer than the threshold) against momentary (not longer), so
 * every event is exactly one of the two.
 * @param {Array<any>} events
 * @param {number} threshold minutes
 */
export function classify(events, threshold = SUSTAINED_MINUTES) {
  const sustained = events.filter((e) => minutesOf(e) > threshold);
  const momentary = events.filter((e) => minutesOf(e) <= threshold);
  return { sustained, momentary, threshold, custom: threshold !== SUSTAINED_MINUTES };
}

/**
 * The sustained indices, each with its formula and the counts behind it.
 * @param {Array<any>} sustained
 * @param {{customersServed: number, periodMinutes: number}} o
 */
export function indices(sustained, { customersServed, periodMinutes }) {
  const ci = sustained.reduce((n, e) => n + e.customers, 0);
  const cmi = sustained.reduce((n, e) => n + customerMinutesOf(e), 0);
  const perCustomer = ci / customersServed;
  const minutesPerCustomer = cmi / customersServed;
  const minutesPerInterrupted = ci > 0 ? cmi / ci : null;
  const availability = (1 - minutesPerCustomer / periodMinutes) * 100;
  const n = (x) => x.toLocaleString('en-US');
  return {
    events: sustained.length,
    customersInterrupted: ci,
    customerMinutes: cmi,
    customersServed,
    periodMinutes,
    perCustomer: round(perCustomer, 2),
    minutesPerCustomer: round(minutesPerCustomer, 1),
    minutesPerInterrupted: minutesPerInterrupted === null ? null : round(minutesPerInterrupted, 2),
    availability: round(availability, 4),
    formulas: {
      perCustomer: `${n(ci)} customers interrupted ÷ ${n(customersServed)} customers served = ${round(perCustomer, 2)} interruptions per customer`,
      minutesPerCustomer: `${n(cmi)} customer minutes ÷ ${n(customersServed)} customers served = ${round(minutesPerCustomer, 1)} minutes per customer`,
      minutesPerInterrupted: minutesPerInterrupted === null ? 'No customer was interrupted, so there is no average to take.' : `${n(cmi)} customer minutes ÷ ${n(ci)} customers interrupted = ${round(minutesPerInterrupted, 2)} minutes per interrupted customer`,
      availability: `1 − ${round(minutesPerCustomer, 1)} minutes per customer ÷ ${n(periodMinutes)} minutes in the period = ${round(availability, 4)}% available`,
    },
    sources: SOURCES,
  };
}

/**
 * The momentary index, where momentaries are logged at all. A log without them
 * gets no zero: most utilities do not record them.
 */
export function momentaryIndex(momentary, customersServed) {
  if (!momentary.length) return { status: 'not-computed', reason: 'not computed: no momentary interruptions in this log. Many utilities do not log them, so a low figure can mean they were never recorded.' };
  const ci = momentary.reduce((n, e) => n + e.customers, 0);
  return { status: 'ok', events: momentary.length, customersInterrupted: ci, perCustomer: round(ci / customersServed, 2), formula: `${ci.toLocaleString('en-US')} customers interrupted briefly ÷ ${customersServed.toLocaleString('en-US')} customers served = ${round(ci / customersServed, 2)} per customer`, note: 'Many utilities do not log momentary interruptions, so a low figure can mean they were never recorded.', source: SOURCES.momentary };
}

/** Indices that count what happened to each customer need per-customer records a log does not hold. */
export const UNAVAILABLE = [
  { name: 'customers interrupted more than a set number of times', needs: 'a record of each interruption against each customer\'s own service point, which an event log does not contain' },
  { name: 'customers who went without power longer than a set duration', needs: 'the same per-customer records' },
];

/**
 * Daily minutes per customer, by the day each interruption began (New Mexico
 * 17.9.589 NMAC), or split at midnight when the user asks.
 * @param {Array<any>} sustained
 * @param {{customersServed: number, zone: string, split?: boolean}} o
 */
export function dailyMinutes(sustained, { customersServed, zone, split = false }) {
  const days = new Map();
  const add = (day, cm) => days.set(day, (days.get(day) ?? 0) + cm);
  for (const e of sustained) {
    const startDay = localDay(zone, e.startMs);
    if (!split || e.minutes !== undefined && e.endMs === undefined) { add(startDay, customerMinutesOf(e)); continue; }
    // Split at each local midnight the interruption crosses.
    let cursor = e.startMs;
    const end = e.endMs ?? e.startMs + minutesOf(e) * MINUTE;
    while (cursor < end) {
      const day = localDay(zone, cursor);
      const l = utcToLocal(zone, cursor);
      const midnight = cursor + ((24 - l.hour) * 60 - l.minute) * MINUTE;
      const slice = Math.min(end, midnight);
      add(day, (e.customers * (slice - cursor)) / MINUTE);
      cursor = slice;
    }
  }
  return [...days].sort((a, b) => a[0].localeCompare(b[0])).map(([day, cm]) => ({ day, minutesPerCustomer: cm / customersServed, customerMinutes: cm }));
}

/** Mean, and both standard deviations, of a list. */
function spread(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const ss = values.reduce((a, b) => a + (b - mean) ** 2, 0);
  return { mean, sample: Math.sqrt(ss / (values.length - 1)), population: Math.sqrt(ss / values.length) };
}

/**
 * The major-event-day threshold by the 2.5 beta method: days without
 * interruptions are left out, the rest are taken in logarithms, and the
 * threshold is e^(mean + 2.5 × standard deviation). Both standard deviations
 * are reported; the sample one is used, which is our choice.
 * @param {Array<{day: string, minutesPerCustomer: number}>} daily
 * @param {{calendarDays?: number, minActiveDays?: number}} [o]
 */
export function threshold(daily, o = {}) {
  const min = o.minActiveDays ?? MIN_ACTIVE_DAYS;
  const active = daily.filter((d) => d.minutesPerCustomer > 0);
  const calendarDays = o.calendarDays ?? daily.length;
  if (active.length < min) {
    return { status: 'refused', activeDays: active.length, minActiveDays: min, reason: `No threshold: this log has ${active.length} days with interruptions and we require at least ${min}. That floor is ours, not the method's: no free source states a minimum, and the threshold is unstable below it.` };
  }
  const logs = active.map((d) => Math.log(d.minutesPerCustomer));
  const { mean, sample, population } = spread(logs);
  const of = (beta) => Math.exp(mean + MED_MULTIPLIER * beta);
  const years = calendarDays / 365.25;
  return {
    status: 'ok',
    activeDays: active.length,
    quietDays: calendarDays - active.length,
    calendarDays,
    alpha: mean,
    beta: { sample, population },
    minutes: { sample: of(sample), population: of(population) },
    used: 'sample',
    value: of(sample),
    years: round(years, 1),
    short: years < YEARS_EXPECTED ? `Based on ${round(years, 1)} years of daily values, not the ${YEARS_EXPECTED} the method assumes. Fewer years make the threshold less stable.` : null,
    formula: `e^(${round(mean, 4)} + ${MED_MULTIPLIER} × ${round(sample, 4)}) = ${round(of(sample), 2)} minutes per customer in a day, from ${active.length} days with interruptions (${calendarDays - active.length} quiet days left out before the logarithm).`,
    choice: 'The sample standard deviation (dividing by one less than the number of days) is the value used. That is our choice; the population standard deviation is shown beside it.',
    source: SOURCES.threshold,
  };
}

/** The days above the threshold. A day equal to it is not one. */
export function flagged(daily, minutes) {
  return daily.filter((d) => d.minutesPerCustomer > minutes).map((d) => ({ ...d, minutesPerCustomer: round(d.minutesPerCustomer, 1) }));
}

/**
 * The three bases the federal form asks for, each labeled, with what it left
 * out. One basis is never presented as another.
 * @param {Array<any>} sustained
 * @param {{customersServed: number, periodMinutes: number, medDays?: Set<string>, zone: string}} o
 */
export function bases(sustained, o) {
  const medDays = o.medDays ?? new Set();
  const dayOf = (e) => localDay(o.zone, e.startMs);
  const planned = sustained.filter((e) => e.planned);
  const onMed = sustained.filter((e) => medDays.has(dayOf(e)));
  return [
    { id: 'all', label: 'Every event', events: sustained, excluded: 0, note: null },
    { id: 'without-planned', label: 'Without planned interruptions', events: sustained.filter((e) => !e.planned), excluded: planned.length, note: `${planned.length} planned interruptions left out.` },
    { id: 'without-major', label: 'Without major event days', events: sustained.filter((e) => !medDays.has(dayOf(e))), excluded: onMed.length, note: `${onMed.length} interruptions on ${medDays.size} major event days left out.` },
  ].map((b) => ({ ...b, indices: indices(b.events, o) }));
}

/** Below this many customers a breakdown row names too few people to show. */
export const MIN_GROUP_CUSTOMERS = 100;

/**
 * Interruptions grouped by feeder, device, or cause. A row covering fewer than
 * 100 customers is suppressed rather than shown: on a small feeder the row is
 * close to naming the households on it. The suppressed rows are counted, never
 * silently dropped.
 * @param {Array<any>} sustained
 * @param {'feeder' | 'device' | 'cause'} by
 * @param {{customersServed: number, min?: number}} o
 */
export function breakdown(sustained, by, { customersServed, min = MIN_GROUP_CUSTOMERS }) {
  const groups = new Map();
  for (const e of sustained) {
    const k = e[by] ?? null;
    const g = groups.get(k) ?? groups.set(k, { key: k, events: 0, customers: 0, customerMinutes: 0 }).get(k);
    g.events++;
    g.customers += e.customers;
    g.customerMinutes += customerMinutesOf(e);
  }
  const all = [...groups.values()].map((g) => ({ ...g, minutesPerCustomer: round(g.customerMinutes / customersServed, 1) }));
  const shown = all.filter((g) => g.customers >= min).sort((a, b) => b.customerMinutes - a.customerMinutes);
  const suppressed = all.filter((g) => g.customers < min);
  return {
    by,
    rows: shown,
    suppressed: suppressed.length,
    suppressedEvents: suppressed.reduce((n, g) => n + g.events, 0),
    note: suppressed.length
      ? `${suppressed.length} ${by === 'cause' ? 'causes' : `${by}s`} are not shown: each covers fewer than ${min} customers, which is close to naming them.`
      : null,
    /** A breakdown never travels: not in a link, a copied card, or a report, unless the person asks. */
    shareable: false,
  };
}
