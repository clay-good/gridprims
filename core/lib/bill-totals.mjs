// Bills from the totals printed on them (add-household-bill-check:
// bill-totals). Entry checks, pricing of fixed, minimum, tiered, and
// seasonal charges with day proration, the comparison with what was paid,
// the effective price, and the mid-cycle projection. Money is kept in whole
// micro-dollars, so every cent rounds exactly.

const DAY = 86_400_000;
const MICRO = 1_000_000n;
const at = (iso) => Date.parse(`${iso}T00:00:00Z`);
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Read "1,234.5" or 1234.5 as a number; null when it is not one. */
export function readNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').trim().replace(/,(?=\d{3}(\D|$))/g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

/** Days in a billing period: start through end, counting both (a June 15 to July 14 period is 30 days). */
export const daysIn = (p) => Math.round((at(p.end) - at(p.start)) / DAY) + 1;

/**
 * The entry checks: overlapping and duplicate periods, periods over 45 days,
 * a month far above the others (a possible typing error), and negative kWh.
 * @param {Array<{start: string, end: string, kwh: number}>} periods
 * @returns {Array<{kind: 'overlap' | 'duplicate' | 'long' | 'typo' | 'negative', periods: number[], days?: number, suggestion?: number}>}
 */
export function checkPeriods(periods) {
  const flags = [];
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const a = periods[i];
      const b = periods[j];
      if (a.start === b.start && a.end === b.end) { flags.push({ kind: 'duplicate', periods: [i, j] }); continue; }
      const overlap = Math.min(at(a.end), at(b.end)) - Math.max(at(a.start), at(b.start));
      if (overlap >= 0) flags.push({ kind: 'overlap', periods: [i, j], days: Math.round(overlap / DAY) + 1 });
    }
  }
  periods.forEach((p, i) => {
    if (daysIn(p) > 45) flags.push({ kind: 'long', periods: [i], days: daysIn(p) });
    if (p.kwh < 0) flags.push({ kind: 'negative', periods: [i] });
  });
  // A month over 5,000 kWh when the others average a tenth of it reads like an extra digit.
  periods.forEach((p, i) => {
    if (p.kwh <= 5000) return;
    const others = periods.filter((_, k) => k !== i && periods[k].kwh > 0);
    const avg = others.length ? others.reduce((n, o) => n + o.kwh, 0) / others.length : null;
    flags.push({ kind: 'typo', periods: [i], ...(avg && p.kwh / 10 < avg * 2 && p.kwh / 10 > avg / 2 ? { suggestion: p.kwh / 10 } : {}) });
  });
  return flags;
}

/** A dollar or $/kWh amount as micro-dollars, exactly (rates carry at most six decimals). */
const micro = (x) => BigInt(Math.round(x * 1e6));
/** Micro-dollars to whole cents, rounding half up. */
const cents = (m) => (m >= 0n ? (m + 5000n) / 10000n : -((-m + 5000n) / 10000n));

/**
 * The season in force on a day: seasons list {name, from: 'MM-DD', tiers}, and a season runs from its
 * date to the next one's, wrapping the year.
 */
function seasonOn(day, seasons) {
  const md = day.slice(5);
  const sorted = [...seasons].sort((a, b) => (a.from < b.from ? -1 : 1));
  return [...sorted].reverse().find((s) => s.from <= md) ?? sorted.at(-1);
}

/**
 * Price one billing period from its total kWh.
 * @param {{start: string, end: string, kwh: number, tou?: Record<string, number>}} period
 *   tou is the kWh in each time-of-use period, as the bill prints them, for a tariff whose seasons list periods
 * @param {{fixedMonthly?: number, fixedDaily?: number, minimumMonthly?: number, seasons: Array<{name: string, from: string, tiers?: Array<{upTo?: number, upToDaily?: number, rate: number}>, periods?: Array<{name: string, rate: number}>}>, charges?: Array<{label: string, perKwh?: number, monthly?: number}>, credits?: Array<{label: string, atLeastKwh: number, atMostKwh?: number, amount: number}>}} tariff
 *   fixedDaily is a fixed charge billed per day, for the days in the period
 *   charges are other named charges, per kWh or per month (a Texas TDU's delivery charges, a CCA's generation rate, the PCIA)
 *   credits are usage credits, such as an EFL's "$30 credit at 1,000 kWh or more" (atLeastKwh, atMostKwh, amount in $)
 *   a tier's upTo is its monthly allowance in kWh, or upToDaily its allowance per day; the last tier has none
 * @param {{prorate?: boolean}} [opts] proration splits kWh and tier allowances by days when the period crosses a season
 * @returns {{totalCents: number, lines: Array<{label: string, kwh?: number, rate?: number, cents: number, days?: number}>, method: string | null, excluded: string[]}}
 */
export function priceTotals(period, tariff, { prorate = true } = {}) {
  const days = daysIn(period);
  const excluded = [];
  const kwh = period.kwh < 0 ? 0 : period.kwh;
  if (period.kwh < 0) excluded.push('export credits (net metering) are not modeled for this tariff');
  // Split the period into runs of days under one season.
  const parts = [];
  for (let d = 0; d < days; d++) {
    const day = isoOf(at(period.start) + d * DAY);
    const s = seasonOn(day, tariff.seasons);
    if (parts.length && parts.at(-1).season === s) parts.at(-1).days++;
    else parts.push({ season: s, days: 1 });
  }
  const crosses = parts.length > 1 && prorate;
  // Without proration the whole period takes the season of its last day.
  const runs = crosses ? parts : [{ season: parts.at(-1).season, days }];
  const lines = [];
  let total = 0n;
  if (tariff.fixedMonthly) {
    const m = micro(tariff.fixedMonthly);
    lines.push({ label: 'fixed', cents: Number(cents(m)) });
    total += m;
  }
  if (tariff.fixedDaily) {
    const m = micro(tariff.fixedDaily) * BigInt(days);
    lines.push({ label: 'fixed', days, cents: Number(cents(m)) });
    total += m;
  }
  // Time-of-use kWh as printed: each period's kWh split by days across seasons, priced at that season's rate.
  if (tariff.seasons.some((s) => s.periods)) {
    if (!period.tou) throw new Error('this tariff is priced by time-of-use period: enter the kWh in each period');
    for (const [name, k] of Object.entries(period.tou)) {
      let rest = k;
      runs.forEach((r, i) => {
        const p = r.season.periods.find((x) => x.name === name);
        if (!p) throw new Error(`${r.season.name} has no ${name}`);
        const used = i === runs.length - 1 ? rest : Math.round(k * (r.days / days));
        rest -= used;
        const m = (micro(p.rate) * BigInt(Math.round(used * 1000))) / 1000n;
        lines.push({ label: `${r.season.name} ${name}`, kwh: used, rate: p.rate, cents: Number(cents(m)), ...(crosses ? { days: r.days } : {}) });
        total += m;
      });
    }
  }
  // kWh and each tier's allowance split in proportion to days; the kWh split is rounded to whole kWh.
  let left = kwh;
  if (!tariff.seasons.some((s) => s.periods)) runs.forEach((r, i) => {
    const share = r.days / days;
    const runKwh = i === runs.length - 1 ? left : Math.round(kwh * share);
    left -= runKwh;
    let rest = runKwh;
    r.season.tiers.forEach((t, k) => {
      if (rest <= 0) return;
      const cap = t.upToDaily !== undefined ? t.upToDaily * r.days : t.upTo === undefined ? Infinity : t.upTo * share;
      const used = Math.min(rest, cap);
      rest -= used;
      const m = (micro(t.rate) * BigInt(Math.round(used * 1000))) / 1000n;
      lines.push({ label: `${r.season.name} tier ${k + 1}`, kwh: used, rate: t.rate, cents: Number(cents(m)), ...(crosses ? { days: r.days } : {}) });
      total += m;
    });
  });
  // Named charges billed on every kWh or every month, and usage credits, each on its own line.
  for (const c of tariff.charges ?? []) {
    const m = c.perKwh !== undefined ? (micro(c.perKwh) * BigInt(Math.round(kwh * 1000))) / 1000n : micro(c.monthly ?? 0);
    lines.push({ label: c.label, ...(c.perKwh !== undefined ? { kwh, rate: c.perKwh } : {}), cents: Number(cents(m)) });
    total += m;
  }
  for (const c of tariff.credits ?? []) {
    if (kwh < c.atLeastKwh || (c.atMostKwh !== undefined && kwh > c.atMostKwh)) continue;
    const m = -micro(c.amount);
    lines.push({ label: c.label, cents: Number(cents(m)) });
    total += m;
  }
  if (tariff.minimumMonthly && total < micro(tariff.minimumMonthly)) {
    const top = micro(tariff.minimumMonthly) - total;
    lines.push({ label: 'minimum bill', cents: Number(cents(top)) });
    total += top;
  }
  // The total is the sum of the rounded lines, as a bill prints it.
  return {
    totalCents: lines.reduce((n, l) => n + l.cents, 0), lines,
    method: crosses ? `split by days: ${runs.map((r) => `${r.days} days at ${r.season.name} rates`).join(', ')}` : null,
    excluded,
  };
}

/** What was paid against what the tariff gives: the difference in cents and in percent to 0.1. */
export function comparePaid(computedCents, paidCents) {
  const diff = paidCents - computedCents;
  return { diffCents: diff, pct: Math.round((diff / computedCents) * 1000) / 10 };
}

/** Effective price in cents per kWh, exact and rounded half up to 0.01 cent: $115.00 over 800 kWh is 14.38. */
export function effectivePrice(amountCents, kwh) {
  if (!(kwh > 0)) return null;
  // cents/kWh to 0.01: amountCents * 100 / kwh, rounded half up, using thousandths of a kWh to stay exact.
  const num = BigInt(amountCents) * 100n * 1000n;
  const den = BigInt(Math.round(kwh * 1000));
  const q = (num * 2n + den) / (2n * den);
  return Number(q) / 100;
}

/**
 * Project a billing period in progress from its daily kWh so far.
 * @param {Array<{date: string, kwh: number}>} days the days present, in order
 * @param {{start: string, end: string}} period
 * @returns {{status: 'too-little-data', present: number} | {status: 'ok', method: 'weekdays' | 'daily-average', present: number, remaining: number, soFarKwh: number, projectedKwh: number}}
 */
export function projectPeriod(days, period) {
  const present = days.length;
  if (present < 3) return { status: 'too-little-data', present };
  const total = daysIn(period);
  const seen = new Set(days.map((d) => d.date));
  const rest = [];
  for (let d = 0; d < total; d++) {
    const day = isoOf(at(period.start) + d * DAY);
    if (!seen.has(day) && day > days.at(-1).date) rest.push(day);
  }
  const soFar = days.reduce((n, d) => n + d.kwh, 0);
  const weekend = (iso) => [0, 6].includes(new Date(at(iso)).getUTCDay());
  let projectedRest;
  let method;
  if (present >= 7) {
    // The same weekdays already seen in this period: weekdays from weekdays, weekend days from weekend days.
    const avg = (f) => { const xs = days.filter((d) => f(d.date)); return xs.reduce((n, d) => n + d.kwh, 0) / xs.length; };
    const wd = avg((d) => !weekend(d));
    const we = avg(weekend);
    projectedRest = rest.reduce((n, d) => n + (weekend(d) ? we : wd), 0);
    method = 'weekdays';
  } else {
    projectedRest = (soFar / present) * rest.length;
    method = 'daily-average';
  }
  return { status: 'ok', method, present, remaining: rest.length, soFarKwh: soFar, projectedKwh: Math.round((soFar + projectedRest) * 1000) / 1000 };
}
