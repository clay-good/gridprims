// reliability.outage-log.indices: the reliability indices a utility reports,
// from logged event totals typed in or read from a log. The workbench runs
// the same arithmetic on a whole outage file.

import { classify, indices, momentaryIndex, review, SOURCES, UNAVAILABLE } from '../../lib/reliability.mjs';

const DAY = 86_400_000;

/** Events typed one a line: a date, the customers out, and the minutes. */
export function readEvents(text) {
  const events = [];
  const errors = [];
  String(text).split('\n').map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const f = line.split(/[,;\t]+/).map((x) => x.trim());
    const date = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(f[0] ?? '');
    const customers = Number(f[1]);
    const minutes = Number(f[2]);
    if (!date || !Number.isFinite(customers) || !Number.isFinite(minutes)) { errors.push(`Line ${i + 1}: write the start, the customers interrupted, and the minutes, as "2025-03-14 18:40, 420, 95".`); return; }
    events.push({ startMs: Date.UTC(+date[1], +date[2] - 1, +date[3], +(date[4] ?? 12), +(date[5] ?? 0)), customers, minutes, planned: /planned/i.test(line) });
  });
  return { events, errors };
}

/**
 * @param {{events: string, customersServed: number, from: string, to: string, threshold: number}} v
 */
export function compute(v) {
  const { events, errors } = readEvents(v.events);
  if (errors.length) return { status: 'invalid', errors: errors.map((message) => ({ field: 'events', message })) };
  if (!events.length) return { status: 'invalid', errors: [{ field: 'events', message: 'List at least one interruption.' }] };
  const fromMs = Date.parse(`${v.from}T00:00:00Z`);
  const toMs = Date.parse(`${v.to}T00:00:00Z`) + DAY;
  if (!(toMs > fromMs)) return { status: 'invalid', errors: [{ field: 'to', message: 'The period must end after it starts.' }] };
  const periodMinutes = (toMs - fromMs) / 60_000;
  const r = review(events, { fromMs, toMs });
  if (!r.ok.length) return { status: 'refused', reason: `No interruption in this log falls inside ${v.from} to ${v.to}: ${r.outside.length} start outside the period and ${r.invalid.length} cannot be used.` };
  const c = classify(r.ok, v.threshold);
  const i = indices(c.sustained, { customersServed: v.customersServed, periodMinutes });
  const m = momentaryIndex(c.momentary, v.customersServed);
  const planned = c.sustained.filter((e) => e.planned);
  return {
    status: 'ok',
    outputs: { perCustomer: i.perCustomer, minutesPerCustomer: i.minutesPerCustomer, minutesPerInterrupted: i.minutesPerInterrupted ?? 0, availability: i.availability, sustainedEvents: i.events, customerMinutes: i.customerMinutes },
    sentence: (out) => `The typical customer lost power ${out.perCustomer.display} times, for ${out.minutesPerCustomer.display} minutes in all. The lights were on ${out.availability.display}% of the time.`,
    steps: [
      `Period: ${v.from} to ${v.to}, ${periodMinutes.toLocaleString('en-US')} minutes. Customers served: ${v.customersServed.toLocaleString('en-US')}. Check that figure matches the one you report; the federal form asks for customers served without saying how to average it.`,
      `Sustained interruptions: ${c.sustained.length} longer than ${c.threshold} minutes.${c.custom ? ` You set that threshold; the federal form's own figure is 5 minutes.` : ''} Momentary: ${c.momentary.length} of ${c.threshold} minutes or less, left out of the indices below.`,
      ...(r.invalid.length ? [`Left out as unusable: ${r.invalid.map((x) => `row ${x.row} (${x.reason})`).join(', ')}.`] : []),
      ...(r.outside.length ? [`Left out as outside the period: ${r.outside.length} interruptions.`] : []),
      i.formulas.perCustomer, i.formulas.minutesPerCustomer, i.formulas.minutesPerInterrupted, i.formulas.availability,
      m.status === 'ok' ? m.formula : `Momentary interruptions: ${m.reason}`,
      `Every event is counted here, including ${planned.length} planned. Major event days need daily figures over several years, which the workbench computes from a whole log.`,
      `Not computed, and not estimated: ${UNAVAILABLE.map((u) => u.name).join('; ')}. Each needs ${UNAVAILABLE[0].needs}.`,
      `Sources: interruptions and minutes per customer, ${SOURCES.perCustomer} Minutes per interrupted customer and availability, ${SOURCES.minutesPerInterrupted}`,
    ],
  };
}
