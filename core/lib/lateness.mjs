// The one lateness rule (platform/data-snapshots, "The one lateness rule"),
// defined here and cited elsewhere: a dataset is due on the publisher's posted
// next-release date where one exists, otherwise on its historical cadence
// after the served version's as-of date, and is late 30 days after that.
// Pages run it on the device at view time, so a stalled pipeline still shows.

export const GRACE_DAYS = 30;
const DAY = 86_400_000;
const CADENCE_DAYS = { daily: 1, weekly: 7, monthly: 31, quarterly: 92 };

/** @param {string} iso YYYY-MM-DD */
const at = (iso) => Date.parse(`${iso}T00:00:00Z`);
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * @param {{asOf: string, cadence: {every: string, nextRelease?: {date: string, posted: boolean}}}} d
 * @param {number} [now] milliseconds, from the device clock
 * @returns {{due: string, posted: boolean, lateFrom: string, late: boolean, daysLate: number}}
 */
export function lateness(d, now = Date.now()) {
  const next = d.cadence.nextRelease;
  let due;
  if (next?.posted) due = at(next.date);
  else if (d.cadence.every === 'annual' || d.cadence.every === 'decennial') {
    // A decennial file (the Census's, after each census) is due ten years on.
    const a = new Date(at(d.asOf));
    due = Date.UTC(a.getUTCFullYear() + (d.cadence.every === 'decennial' ? 10 : 1), a.getUTCMonth(), a.getUTCDate());
  } else due = at(d.asOf) + (CADENCE_DAYS[d.cadence.every] ?? 365) * DAY;
  const lateFrom = due + GRACE_DAYS * DAY;
  return { due: isoOf(due), posted: Boolean(next?.posted), lateFrom: isoOf(lateFrom), late: now >= lateFrom, daysLate: Math.max(0, Math.floor((now - due) / DAY)) };
}
