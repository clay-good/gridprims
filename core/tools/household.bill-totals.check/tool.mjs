// household.bill-totals.check: price billing periods from the totals on the
// bill, check the entries first, and compare with what was paid.

import { checkPeriods, comparePaid, daysIn, effectivePrice, priceTotals } from '../../lib/bill-totals.mjs';
import { parsePeriods, parseTariff } from './entry.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${MONTHS[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`;
const span = (p) => `${longDate(p.start)}${p.start.slice(0, 4) === p.end.slice(0, 4) ? '' : `, ${p.start.slice(0, 4)}`} to ${longDate(p.end)}, ${p.end.slice(0, 4)}`;
const dollars = (c) => `${c < 0 ? '-' : ''}$${(Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const kwhText = (k) => `${k.toLocaleString('en-US', { maximumFractionDigits: 3 })} kWh`;
const centsText = (rate) => `${(rate * 100).toLocaleString('en-US', { maximumFractionDigits: 4 })}¢`;

/** What the entry checks ask before anything is priced; a confirmed period passes the long and typo checks. */
function questions(periods) {
  const asks = [];
  for (const f of checkPeriods(periods)) {
    const lines = f.periods.map((i) => `line ${i + 1}`).join(' and ');
    if (f.kind === 'overlap') asks.push(`Lines ${f.periods.map((i) => i + 1).join(' and ')} overlap by ${f.days} day${f.days === 1 ? '' : 's'}. Which dates are correct?`);
    if (f.kind === 'duplicate') asks.push(`${lines[0].toUpperCase()}${lines.slice(1)} are the same period. Remove the duplicate.`);
    if (f.kind === 'long' && !periods[f.periods[0]].confirmed) asks.push(`Line ${f.periods[0] + 1} spans ${f.days} days, longer than a billing period usually runs. Check the dates, or add "confirmed" to the line.`);
    if (f.kind === 'typo' && !periods[f.periods[0]].confirmed) asks.push(`Line ${f.periods[0] + 1} has ${kwhText(periods[f.periods[0]].kwh)}${f.suggestion ? `; was ${kwhText(f.suggestion)} meant` : ', far above a household month'}? Fix the number, or add "confirmed" to the line.`);
  }
  return asks;
}

/**
 * @param {{periods: string, tariff: string, prorate: 'yes' | 'no'}} v
 */
export function compute({ periods: periodText, tariff: tariffText, prorate }) {
  const parsed = parsePeriods(periodText);
  const t = parseTariff(tariffText);
  const errors = [...parsed.errors.map((message) => ({ field: 'periods', message })), ...t.errors.map((message) => ({ field: 'tariff', message }))];
  if (errors.length) return { status: 'invalid', errors };
  const { periods } = parsed;
  const tariff = t.tariff;
  const asks = questions(periods);
  if (asks.length) return { status: 'invalid', errors: asks.map((message) => ({ field: 'periods', message })) };
  const tou = tariff.seasons[0].periods;
  if (tou) {
    const missing = periods.findIndex((p) => !p.tou && p.kwh >= 0);
    if (missing >= 0) return { status: 'invalid', errors: [{ field: 'periods', message: `Line ${missing + 1}: this tariff is priced by time-of-use period. Enter the kWh in each, as the bill prints them: ${tou.map((p) => `${p.name} … kWh`).join(', ')}.` }] };
  }

  const steps = [];
  const excluded = new Set();
  let totalCents = 0;
  let kwh = 0;
  let paidCents = 0;
  let paidComputed = 0;
  for (const [i, p] of periods.entries()) {
    let r;
    try {
      r = priceTotals(p.kwh < 0 ? { ...p, tou: undefined } : p, tou && p.kwh < 0 ? { ...tariff, seasons: tariff.seasons.map((s) => ({ ...s, periods: undefined, tiers: [{ rate: 0 }] })) } : tariff, { prorate: prorate !== 'no' });
    } catch (e) {
      return { status: 'invalid', errors: [{ field: 'periods', message: `Line ${i + 1}: ${e.message}.` }] };
    }
    r.excluded.forEach((x) => excluded.add(x));
    const parts = r.lines.map((l) => (l.kwh !== undefined ? `${l.label}, ${kwhText(l.kwh)} × ${centsText(l.rate)} = ${dollars(l.cents)}` : `${l.label}${l.days ? ` (${l.days} days)` : ''} ${dollars(l.cents)}`));
    steps.push(`${span(p)} (${daysIn(p)} days, ${kwhText(p.kwh)}): ${parts.join('; ')}. Total ${dollars(r.totalCents)}.${r.method ? ` Season change ${r.method}.` : ''}`);
    totalCents += r.totalCents;
    kwh += Math.max(p.kwh, 0);
    if (p.paidCents !== undefined) {
      paidCents += p.paidCents;
      paidComputed += r.totalCents;
    }
  }
  const paidAll = periods.every((p) => p.paidCents !== undefined);
  const anyPaid = periods.some((p) => p.paidCents !== undefined);
  const effective = effectivePrice(paidAll ? paidCents : totalCents, kwh);
  const cmp = anyPaid && paidComputed !== 0 ? comparePaid(paidComputed, paidCents) : null;
  if (effective !== null) steps.push(`Effective price: ${dollars(paidAll ? paidCents : totalCents)} ÷ ${kwhText(kwh)} = ${effective.toFixed(2)}¢ per kWh, from the ${paidAll ? 'amounts paid' : 'computed bills'}.`);
  if (cmp && cmp.diffCents !== 0) {
    steps.push(`You paid ${dollars(paidCents)} against ${dollars(paidComputed)} computed: ${cmp.diffCents > 0 ? '+' : ''}${dollars(cmp.diffCents)} (${cmp.pct > 0 ? '+' : ''}${cmp.pct}%). A difference is not a billing error. Likely causes: taxes and fees, riders and fuel adjustments the tariff data leaves out, different period dates, or an estimated meter read.`);
  }
  for (const x of excluded) steps.push(`Not included: ${x}.`);

  const n = periods.length;
  return {
    status: 'ok',
    outputs: {
      total: totalCents / 100,
      ...(effective !== null ? { effectivePrice: effective } : {}),
      ...(cmp ? { difference: cmp.diffCents / 100, differencePct: cmp.pct } : {}),
    },
    sentence: (out) => `${n === 1 ? 'This period' : `These ${n} periods`} come${n === 1 ? 's' : ''} to $${out.total.display} on this tariff${out.difference ? `; you paid ${out.difference.value >= 0 ? `$${out.difference.display} more` : `$${out.difference.display.replace('-', '')} less`} (${out.differencePct.display}%)` : ''}.`,
    steps,
  };
}
