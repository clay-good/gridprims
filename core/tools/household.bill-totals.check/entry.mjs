// The written form of billing periods and tariffs that household.bill-totals.check
// reads, one period a line, so the page, the command bar, and an agent all
// send the same thing:
//
//   2026-03-01 to 2026-03-30, 800 kWh, paid $131.40
//   2026-04, period 1 300 kWh, period 2 500 kWh
//   2026-01-01 to 2026-03-03, 2,100 kWh, confirmed
//
// A month (2026-04) stands for its first to last day. "confirmed" accepts a
// period the entry checks would otherwise ask about.

import { readNumber } from '../../lib/bill-totals.mjs';

export const MAX_PERIODS = 24;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const valid = (iso) => ISO.test(iso) && new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso;
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * @param {string} text
 * @returns {{periods: Array<{start: string, end: string, kwh: number, paidCents?: number, tou?: Record<string, number>, confirmed: boolean}>, errors: string[]}}
 */
export function parsePeriods(text) {
  const periods = [];
  const errors = [];
  const lines = String(text).split(/\r?\n|;/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > MAX_PERIODS) errors.push(`Enter at most ${MAX_PERIODS} billing periods; there are ${lines.length}.`);
  lines.slice(0, MAX_PERIODS).forEach((line, i) => {
    const at = `Line ${i + 1}`;
    // Fields are split at a comma before a space or a letter, so 2,100 keeps its thousands separator.
    const [when, ...parts] = line.split(/,\s+|,(?=[a-z$])/i).map((s) => s.trim());
    let start;
    let end;
    const month = /^(\d{4})-(\d{2})$/.exec(when);
    const range = /^(\S+)\s+(?:to|through|-|–)\s+(\S+)$/i.exec(when);
    if (month && +month[2] >= 1 && +month[2] <= 12) {
      start = `${month[1]}-${month[2]}-01`;
      end = `${month[1]}-${month[2]}-${String(lastDay(+month[1], +month[2])).padStart(2, '0')}`;
    } else if (range && valid(range[1]) && valid(range[2])) {
      [start, end] = [range[1], range[2]];
      if (end < start) return errors.push(`${at}: the period ends (${end}) before it starts (${start}).`);
    } else return errors.push(`${at}: start with the dates, as 2026-03-01 to 2026-03-30, or a month, as 2026-03.`);
    const p = { start, end, kwh: null, confirmed: false };
    for (const part of parts) {
      let m;
      if (/^confirmed$/i.test(part)) p.confirmed = true;
      else if ((m = /^paid\s+\$?\s*([-\d,.]+)$/i.exec(part))) {
        const n = readNumber(m[1]);
        if (n === null) return errors.push(`${at}: read "${part}" as an amount paid, such as paid $131.40.`);
        p.paidCents = Math.round(n * 100);
      } else if ((m = /^(.+?)\s+([-\d,.]+)\s*kWh$/i.exec(part)) && !/^-?[\d,.]+$/.test(m[1])) {
        const n = readNumber(m[2]);
        if (n === null) return errors.push(`${at}: read "${part}" as kWh in a time-of-use period, such as period 1 300 kWh.`);
        (p.tou ??= {})[m[1].trim()] = n;
      } else if ((m = /^([-\d,.]+)\s*kWh$/i.exec(part))) {
        const n = readNumber(m[1]);
        if (n === null) return errors.push(`${at}: read "${part}" as kWh, such as 800 kWh or 1,250 kWh.`);
        p.kwh = n;
      } else return errors.push(`${at}: "${part}" is not kWh, an amount paid, or "confirmed".`);
    }
    if (p.tou) {
      const sum = Object.values(p.tou).reduce((n, k) => n + k, 0);
      if (p.kwh !== null && Math.abs(p.kwh - sum) > 0.5) return errors.push(`${at}: the periods add to ${sum.toLocaleString('en-US')} kWh, not the ${p.kwh.toLocaleString('en-US')} kWh total.`);
      p.kwh = sum;
    }
    if (p.kwh === null) return errors.push(`${at}: add the kWh used, such as 800 kWh.`);
    periods.push(p);
  });
  if (!lines.length) errors.push('Enter at least one billing period, such as 2026-03-01 to 2026-03-30, 800 kWh.');
  return { periods, errors };
}

const MD = /^\d{2}-\d{2}$/;
const rateOk = (r) => typeof r === 'number' && Number.isFinite(r) && Math.abs(r) < 10;

/**
 * A tariff as JSON, in the bill engine's form: fixedMonthly, fixedDaily, minimumMonthly, and seasons, each
 * with from (MM-DD) and either tiers ({upTo | upToDaily, rate}) or time-of-use periods ({name, rate}).
 * @returns {{tariff: any, errors: string[]}}
 */
export function parseTariff(text) {
  let t;
  try { t = JSON.parse(text); } catch { return { tariff: null, errors: ['The tariff is not readable JSON.'] }; }
  const errors = [];
  if (!t || typeof t !== 'object' || !Array.isArray(t.seasons) || !t.seasons.length) return { tariff: null, errors: ['The tariff needs at least one season.'] };
  for (const k of ['fixedMonthly', 'fixedDaily', 'minimumMonthly']) if (t[k] !== undefined && !(typeof t[k] === 'number' && Number.isFinite(t[k]) && Math.abs(t[k]) < 10000)) errors.push(`${k} must be a dollar amount.`);
  t.seasons.forEach((s, i) => {
    const at = `Season ${i + 1}`;
    if (typeof s?.name !== 'string' || !MD.test(s?.from ?? '')) return errors.push(`${at} needs a name and a start as MM-DD.`);
    if (Array.isArray(s.periods)) {
      if (!s.periods.length || !s.periods.every((p) => typeof p?.name === 'string' && rateOk(p.rate))) errors.push(`${at}: each time-of-use period needs a name and a rate in $/kWh.`);
    } else if (Array.isArray(s.tiers) && s.tiers.length) {
      s.tiers.forEach((x, k) => {
        if (!rateOk(x?.rate)) errors.push(`${at}, tier ${k + 1}: the rate must be in $/kWh, such as 0.12.`);
        const last = k === s.tiers.length - 1;
        if (!last && !(x.upTo > 0 || x.upToDaily > 0)) errors.push(`${at}, tier ${k + 1}: every tier but the last needs its kWh allowance.`);
      });
    } else errors.push(`${at} needs tiers or time-of-use periods.`);
  });
  const tou = t.seasons.some((s) => s.periods);
  if (tou && !t.seasons.every((s) => s.periods)) errors.push('Either every season lists time-of-use periods or none does.');
  return { tariff: errors.length ? null : t, errors };
}
