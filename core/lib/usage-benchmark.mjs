// Is my use high? (add-household-bill-check: usage-benchmark). A year of use
// from billing periods, compared with EIA-861's average residential use per
// customer for the utility and the state, and the seasonal swing between the
// highest and lowest periods. Averages only: EIA-861 publishes no
// distribution, so there are no percentiles or rankings.

import { daysIn } from './bill-totals.mjs';

/**
 * EIA-861 residential use per customer, in kWh a year: residential sales (MWh) ÷ residential customers.
 * Delivery-only rows are left out of a state total, because their customers also appear under the
 * retailer that sells them energy; this is how EIA's Table 5A counts them.
 * @param {Array<{state: string, utility_id: number, service_type: string, res_sales: number | null, res_customers: number | null}>} rows one data year
 */
export function residentialAverages(rows) {
  const utilities = new Map();
  const states = new Map();
  for (const r of rows) {
    // Rows with sales and no customers still count, as EIA's own totals count them.
    if (r.res_sales === null && r.res_customers === null) continue;
    const uk = `${r.state}|${r.utility_id}`;
    const u = utilities.get(uk) ?? utilities.set(uk, { mwh: 0, customers: 0 }).get(uk);
    u.mwh += r.res_sales ?? 0;
    u.customers += r.res_customers ?? 0;
    if (r.service_type === 'Delivery') continue;
    const s = states.get(r.state) ?? states.set(r.state, { mwh: 0, customers: 0 }).get(r.state);
    s.mwh += r.res_sales ?? 0;
    s.customers += r.res_customers ?? 0;
  }
  const perYear = (x) => (x?.customers > 0 ? Math.round((x.mwh * 1000) / x.customers) : null);
  return {
    utility: (state, id) => perYear(utilities.get(`${state}|${id}`)),
    state: (state) => perYear(states.get(state)),
    stateMonthly: (state) => (states.get(state)?.customers > 0 ? (states.get(state).mwh * 1000) / states.get(state).customers / 12 : null),
  };
}

/**
 * A year of use: the latest 12 periods (or fewer that cover 365 or 366 days) summed, or else scaled to 365 days by the days they cover.
 * @param {Array<{start: string, end: string, kwh: number}>} periods
 */
export function annualize(periods) {
  const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));
  const used = sorted.slice(-12);
  const days = used.reduce((n, p) => n + daysIn(p), 0);
  const kwh = used.reduce((n, p) => n + Math.max(p.kwh, 0), 0);
  if (used.length === 12 || days === 365 || days === 366) return { annualKwh: Math.round(kwh), days, estimated: false, method: `the sum of the latest ${used.length === 1 ? 'period' : `${used.length} periods`} (${days} days)` };
  return { annualKwh: Math.round((kwh * 365) / days), days, estimated: true, method: `estimated from ${days} days: ${Math.round(kwh).toLocaleString('en-US')} kWh × 365 ÷ ${days}` };
}

/** Percent difference from an average, to 0.1. */
export const percentFrom = (kwh, average) => Math.round((kwh / average - 1) * 1000) / 10;

/** The words for a percent difference; under 0.5% either way reads "about the same as". */
export function compareWords(pct) {
  if (Math.abs(pct) < 0.5) return 'about the same as';
  return `${Math.abs(pct).toLocaleString('en-US', { maximumFractionDigits: 1 })}% ${pct > 0 ? 'more' : 'less'} than`;
}

const WINTER = new Set([11, 12, 1, 2, 3]);
const SUMMER = new Set([6, 7, 8, 9]);
const midMonth = (p) => new Date((Date.parse(`${p.start}T00:00:00Z`) + Date.parse(`${p.end}T00:00:00Z`)) / 2).getUTCMonth() + 1;

/**
 * The highest and lowest periods by kWh per day, their ratio to 0.1, and, when the ratio passes 1.5,
 * a checklist of common causes to check, starting with the one the high season points to.
 * @param {Array<{start: string, end: string, kwh: number}>} periods
 */
export function seasonalPattern(periods) {
  const perDay = periods.filter((p) => p.kwh > 0).map((p) => ({ ...p, perDay: p.kwh / daysIn(p) }));
  if (perDay.length < 2) return null;
  const high = perDay.reduce((a, b) => (b.perDay > a.perDay ? b : a));
  const low = perDay.reduce((a, b) => (b.perDay < a.perDay ? b : a));
  const ratio = Math.round((high.perDay / low.perDay) * 10) / 10;
  let checklist = [];
  if (ratio > 1.5) {
    const m = midMonth(high);
    const causes = ['electric heating', 'air conditioning', 'a pool or spa pump', 'electric vehicle charging'];
    checklist = SUMMER.has(m) ? ['air conditioning', 'a pool or spa pump', 'electric heating', 'electric vehicle charging'] : WINTER.has(m) ? causes : ['electric vehicle charging', 'electric heating', 'air conditioning', 'a pool or spa pump'];
  }
  return { high: { start: high.start, end: high.end, perDay: high.perDay }, low: { start: low.start, end: low.end, perDay: low.perDay }, ratio, checklist };
}
