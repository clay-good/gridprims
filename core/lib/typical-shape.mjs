// A time-of-use estimate from a bill's total kWh (add-household-bill-check 3.3; design D3): the period's kWh is
// spread over its days and hours with a typical single-family home's hourly pattern for the state, then summed
// into each time-of-use period of the rate's own weekday and weekend schedules. The result is labeled as an
// estimate from a typical home's pattern; a bill that prints kWh by period, or a meter file, prices exactly.

export const ESTIMATE_LABEL = 'Estimate from a typical home\'s hourly pattern in your state';
const DAY = 86_400_000;

/**
 * kWh in each time-of-use period for one billing period.
 * @param {{start: string, end: string, kwh: number}} period inclusive dates
 * @param {number[][][]} shape the state's 12 months × [weekday, weekend] × 24 hours, each month summing to 1
 * @param {{weekday: number[][], weekend: number[][]}} schedule URDB's 12 × 24 period indices
 * @returns {Record<string, number>} kWh by period name ("period 1", ...), summing to the period's kWh
 */
export function estimateTou(period, shape, schedule) {
  const weights = {};
  let total = 0;
  for (let t = Date.parse(`${period.start}T00:00:00Z`); t <= Date.parse(`${period.end}T00:00:00Z`); t += DAY) {
    const d = new Date(t);
    const m = d.getUTCMonth();
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const hours = shape[m][weekend ? 1 : 0];
    const sched = (weekend ? schedule.weekend : schedule.weekday)[m];
    for (let h = 0; h < 24; h++) {
      const name = `period ${sched[h] + 1}`;
      weights[name] = (weights[name] ?? 0) + hours[h];
      total += hours[h];
    }
  }
  // Whole kWh per period, the remainder to the largest, so the parts add up to the bill's total exactly.
  const names = Object.keys(weights).sort();
  const out = Object.fromEntries(names.map((n) => [n, Math.floor((weights[n] / total) * period.kwh)]));
  const rest = period.kwh - Object.values(out).reduce((a, b) => a + b, 0);
  const largest = names.reduce((a, b) => (weights[b] > weights[a] ? b : a), names[0]);
  out[largest] += rest;
  return out;
}
