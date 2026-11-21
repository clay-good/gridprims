// Bill test vectors from an itemized regulator publication (add-tariff-conformance-suite 2.3). Each schedule's
// printed lines are classified from the figures themselves: a line whose amount is the same at every level and
// equals its stated rate is billed per month; one whose amount is its rate times the kWh, rounded to the cent,
// (within a cent, since publishers round half-cents differently) at every level is billed per kWh. A schedule with any other line (a percentage of other charges, a formula
// in a footnote, tiers the rate column does not give) cannot be written as a tariff our engine reads, and is
// listed as untestable with the reason rather than approximated.

import { toUrpx, URPX_VERSION } from '../../core/lib/urpx.mjs';
import { CHARGE_TYPES } from './bill-vectors.mjs';

/** The levels each schedule's vectors are cut at: the smallest, a typical month, and the largest. */
export const VECTOR_LEVELS = [250, 1000, 5000];
const ENERGY = /^(Energy|Delivery) Charge$/i;
const SERVICE = /(Service|Customer|Grid Access) Charge$/i;
const cents = (n) => Math.round(n * 100);
/** The last day of a YYYY-MM month. */
const lastDay = (ym) => `${ym}-${String(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')}`;

/** The URPX charge type a rider's label names. */
export function riderType(label) {
  if (/power cost|wholesale power/i.test(label)) return 'urpx:adjustmentPowerCost';
  if (/fuel/i.test(label)) return 'urpx:fuelCharge';
  return 'urpx:tariffRider';
}

/**
 * One line, across every level the schedule was printed at: per kWh, per month, zero, or why it cannot be read.
 * @param {string} label @param {string | null} rate @param {Array<{kwh: number, amount: number}>} at
 */
export function classifyLine(label, rate, at) {
  if (at.every((x) => x.amount === 0)) return { kind: 'zero' };
  const r = rate !== null && /^-?\d*\.?\d+$/.test(rate) ? Number(rate) : null;
  if (r === null) return { kind: 'untestable', why: `${label}: its rate is printed as "${rate ?? ''}", ${/%$/.test(rate ?? '') ? 'a percentage of other charges' : 'with the arithmetic in a footnote'}` };
  if (at.every((x) => cents(x.amount) === cents(r))) return { kind: 'monthly', rate: r };
  if (at.every((x) => Math.abs(cents(x.amount) - Math.round(r * x.kwh * 100)) <= 1)) return { kind: 'perKwh', rate: r };
  return { kind: 'untestable', why: `${label}: the amounts are not ${r} a month or ${r} a kWh at every level` };
}

/**
 * The tariff a schedule's lines describe, or why it cannot be written.
 * @param {any[]} rows one ground-truth document's rows for one schedule, every level
 */
export function scheduleTariff(rows) {
  // From one consumption level, a charge billed per month and one billed per kWh look the same.
  if (new Set(rows.map((r) => r.kwh)).size < 2 && rows[0].lines.some((l) => l.rate === null)) return { why: ['the publication gives one consumption level and no rates, so charges per month and per kWh cannot be told apart'] };
  const at = (j) => rows.map((r) => ({ kwh: r.kwh, amount: r.lines[j].amount }));
  const tariff = { seasons: [], charges: [] };
  const why = []; const zero = []; const lines = [];
  rows[0].lines.forEach((l, j) => {
    if (l.label === 'Subtotal') return;
    const c = classifyLine(l.label, l.rate, at(j));
    if (c.kind === 'untestable') return why.push(c.why);
    if (c.kind === 'zero') return zero.push(l.label);
    if (ENERGY.test(l.label) && c.kind === 'perKwh' && !tariff.seasons.length) {
      tariff.seasons.push({ name: 'November 2026', from: '01-01', tiers: [{ rate: c.rate }] });
      lines.push({ j, type: 'flat-energy' });
    } else if (SERVICE.test(l.label) && c.kind === 'monthly' && tariff.fixedMonthly === undefined) {
      tariff.fixedMonthly = c.rate;
      lines.push({ j, type: 'fixed' });
    } else {
      tariff.charges.push({ label: l.label, ...(c.kind === 'perKwh' ? { perKwh: c.rate } : { monthly: c.rate }), ...(riderType(l.label) !== 'urpx:tariffRider' ? { urpxType: riderType(l.label) } : {}) });
      lines.push({ j, type: 'rider' });
    }
  });
  if (!tariff.seasons.length && !why.length) why.push('no energy charge billed per kWh');
  if (why.length) return { why };
  if (!tariff.charges.length) delete tariff.charges;
  return { tariff, lines, zero };
}

/** Whether a row's printed lines miss its printed total. */
const roundedApart = (row, built) => cents(built.lines.reduce((t, { j }) => t + row.lines[j].amount, 0)) !== cents(row.bill);

/**
 * Every vector one itemized ground-truth document gives, and every schedule it cannot give one for.
 * @param {{state: string, document: any, rows: any[]}} doc
 */
export function vectorsFrom(doc) {
  const { document: d } = doc;
  const bySchedule = Map.groupBy(doc.rows.filter((r) => r.lines), (r) => `${r.utility}|${r.schedule}`);
  const vectors = []; const untestable = [];
  for (const rows of bySchedule.values()) {
    const { utility, schedule } = rows[0];
    const slug = `${utility}-${schedule}`.toLowerCase().replace(/schedule/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const built = scheduleTariff(rows);
    if (built.why) { untestable.push({ state: doc.state, utility, schedule, why: built.why }); continue; }
    const meta = { id: `${doc.state.toLowerCase()}-${slug}`, name: `${utility}, ${schedule}`, utility, effective: `${d.billingMonth}-01`, zone: 'America/Chicago', source: { url: d.url, retrieved: d.retrieved } };
    const urpx = toUrpx(built.tariff, meta);
    for (const kwh of VECTOR_LEVELS) {
      const row = rows.find((r) => r.kwh === kwh);
      if (!row) continue;
      const types = [...new Set(built.lines.map((l) => l.type))];
      vectors.push({
        id: `${meta.id}-${d.billingMonth}-${kwh}kwh`,
        tariff: { format: 'URPX', version: URPX_VERSION, document: urpx.document },
        load: { kind: 'monthly', periods: [{ start: `${d.billingMonth}-01`, end: lastDay(d.billingMonth), kwh }] },
        expected: { total: { amount: row.bill, unit: 'USD' }, lines: built.lines.map(({ j, type }) => ({ label: row.lines[j].label, type, amount: row.lines[j].amount, unit: 'USD' })), ...(roundedApart(row, built) ? { rounding: 'The commission rounds the total from unrounded charges, so its printed lines miss the total by a cent here.' } : {}) },
        tolerance: { amount: 0.05, unit: 'USD', why: 'The commission itemizes every charge with no tax line, so the figure is the listed charges alone; five cents covers rounding each line to the cent.' },
        chargeTypes: CHARGE_TYPES.filter((t) => types.includes(t)),
        provenance: { kind: 'commission-publication', publisher: d.publisher, document: d.title, url: d.url, sha256: d.sha256, date: d.asOf, page: row.page, utility, schedule, consumptionLevel: `${kwh.toLocaleString('en-US')} kWh` },
        notes: [
          `The tariff holds the rates and riders the commission's report applies in the ${d.billingMonth} billing month, read from the report's own rate column; other months' rates are not included.`,
          ...(built.zero.length ? [`Lines that are zero this month are left out: ${built.zero.join(', ')}.`] : []),
        ],
      });
    }
  }
  return { vectors, untestable };
}

/**
 * A release's coverage: how many vectors exercise each charge type, the types none does, and the states.
 * @param {any[]} vectors @param {any[]} untestable
 */
export function releaseCoverage(vectors, untestable = []) {
  const byChargeType = Object.fromEntries(CHARGE_TYPES.map((t) => [t, vectors.filter((v) => v.chargeTypes.includes(t)).length]));
  const states = [...new Set(vectors.map((v) => v.id.slice(0, 2).toUpperCase()))].sort();
  return { vectors: vectors.length, schedules: new Set(vectors.map((v) => v.tariff.document['@graph'][0]['urpx:hasRatePlan']['urpx:ratePlanUniqueIdentifier'])).size, byChargeType, uncovered: CHARGE_TYPES.filter((t) => !byChargeType[t]), states, untestable: untestable.length };
}
