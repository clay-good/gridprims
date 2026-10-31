// Plant arithmetic for plant pages (add-public-grid-data: plant pages,
// "Generation and capacity factor", "Emissions where covered"). Pure
// functions, checked against hand-computed fixtures in CI.

/** Metric tons per short ton (NIST SP 811: 1 ton = 2,000 lb; 1 lb = 0.45359237 kg). */
export const METRIC_TONS_PER_SHORT_TON = 0.90718474;
/** Metric tons per pound. */
export const METRIC_TONS_PER_LB = 0.00045359237;

const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysIn = (y, m) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

/**
 * Hours a generator was in service during `year`, by whole months: from the
 * start of its first operating month (or January) through the end of its
 * retirement month (or December). A July start in a non-leap year is 4,416 hours.
 * @param {number} year
 * @param {{operatingYear?: number | null, operatingMonth?: number | null, retirementYear?: number | null, retirementMonth?: number | null}} g
 * @returns {number | null} null when a start or end in `year` has no month, so the proration cannot be done
 */
export function hoursInService(year, g) {
  if (g.operatingYear !== null && g.operatingYear !== undefined && g.operatingYear > year) return 0;
  if (g.retirementYear !== null && g.retirementYear !== undefined && g.retirementYear < year) return 0;
  const startsThisYear = g.operatingYear === year;
  const endsThisYear = g.retirementYear === year;
  if ((startsThisYear && !g.operatingMonth) || (endsThisYear && !g.retirementMonth)) return null;
  const first = startsThisYear ? g.operatingMonth : 1;
  const last = endsThisYear ? g.retirementMonth : 12;
  let days = 0;
  for (let m = first; m <= last; m++) days += daysIn(year, m);
  return days * 24;
}

/**
 * Capacity factor: net generation over what the nameplate could have made in
 * the hours each generator was in service.
 * @param {number} netMwh the plant's annual net generation
 * @param {Array<{nameplateMw: number, hours: number | null}>} generators
 * @returns {{value: number | null, reason?: 'net-consumer' | 'no-capacity' | 'unknown-months'}} value as a fraction
 */
export function capacityFactor(netMwh, generators) {
  if (netMwh < 0) return { value: null, reason: 'net-consumer' };
  if (generators.some((g) => g.hours === null)) return { value: null, reason: 'unknown-months' };
  const possible = generators.reduce((n, g) => n + g.nameplateMw * g.hours, 0);
  if (!(possible > 0)) return { value: null, reason: 'no-capacity' };
  return { value: netMwh / possible };
}

/** Short tons to metric tons, rounded to the nearest metric ton. */
export const shortTonsToMetric = (tons) => Math.round(tons * METRIC_TONS_PER_SHORT_TON);
/** Pounds to metric tons, rounded to the nearest metric ton. */
export const poundsToMetric = (lb) => Math.round(lb * METRIC_TONS_PER_LB);
