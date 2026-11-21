// The accuracy scorecard (add-tariff-conformance-suite 3.1 to 3.4 and 3.6): for each regulator-priced
// schedule matched to a record in the open tariff database (URDB), the record's bill at every published
// consumption level beside the commission's, with the difference in dollars and percent and the arithmetic;
// every schedule it cannot test, with why; counts and distributions with no composite score; neutral wording
// until a maintainer has read the filed tariff; and our own engine measured the same way.

import { chargeTypesOf } from '../../core/lib/urpx.mjs';
import { priceTotals } from '../../core/lib/bill-totals.mjs';
import { toTariff } from '../../core/lib/urdb-tariff.mjs';
import { CHARGE_TYPES } from './bill-vectors.mjs';

/** Two bills agree within 0.5% of the published bill or $1.00, whichever is larger (accuracy-scorecard). */
export const agrees = (published, computed) => Math.abs(computed - published) <= Math.max(Math.abs(published) * 0.005, 1) + 1e-9;

/** The month a document's bills are for: its billing month, or the month of its as-of date. */
const monthOf = (d) => d.billingMonth ?? d.asOf.slice(0, 7);
const lastDay = (ym) => `${ym}-${String(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')}`;
const round2 = (n) => Math.round(n * 100) / 100;

/** The bins the percent differences are counted in; a distribution, never an average. */
export const BINS = [['within', '0.5% or $1 or less'], ['0.5-2', 'up to 2%'], ['2-5', '2% to 5%'], ['5-10', '5% to 10%'], ['10+', 'over 10%']];
const binOf = (l) => (l.agree ? 'within' : Math.abs(l.percent) <= 2 ? '0.5-2' : Math.abs(l.percent) <= 5 ? '2-5' : Math.abs(l.percent) <= 10 ? '5-10' : '10+');

/**
 * The wording a comparison carries: a disagreement between named sources until a maintainer's finding says
 * otherwise (accuracy-scorecard, "Disagreements are questions first").
 */
export function wording(entry, finding) {
  if (!entry.levels.some((l) => !l.agree)) return { kind: 'agree', text: `URDB's record and the ${entry.publisher}'s figures agree within 0.5% or $1 at every level.` };
  if (!finding) return { kind: 'unresolved', text: `The ${entry.publisher}'s figures and URDB's record disagree. Neither has been checked against the filed tariff sheet, so we have not determined which is right.` };
  const upstream = finding.reported ? ` Reported to URDB on ${finding.reported.date}${finding.reported.reference ? ` (${finding.reported.reference})` : ''}.` : ' Not yet reported to URDB.';
  return { kind: `found-${finding.verdict}`, text: `${finding.reader} read the filed tariff sheet on ${finding.date} and found ${finding.verdict === 'database-wrong' ? 'URDB\'s record wrong' : finding.verdict === 'commission-wrong' ? 'the commission\'s figure wrong' : 'URDB\'s record right'}: ${finding.finding.replace(/\.?$/, '.')}${upstream}` };
}

/**
 * One schedule against its URDB record.
 * @param {{state: string, document: any, rows: any[]}} doc @param {any} match a crosswalk entry with a urdb label
 * @param {any} record the URDB row
 */
export function compareSchedule(doc, match, record) {
  const rows = doc.rows.filter((r) => r.utility === match.utility && (r.schedule ?? null) === (match.schedule ?? null)).sort((a, b) => a.kwh - b.kwh);
  const read = toTariff(record);
  const base = { state: doc.state, publisher: doc.document.publisher, document: doc.document.title, documentUrl: doc.document.url, utility: match.utility, schedule: match.schedule ?? null, why: match.why,
    urdb: { label: record.label, name: record.rate_name, utility: record.utility_name, effective: /^\d{4}-\d{2}-\d{2}/.exec(String(record.effective_date ?? ''))?.[0] ?? null, url: `https://apps.openei.org/USURDB/rate/view/${record.label}` } };
  if (!read) return { ...base, untestable: 'our engine cannot price this URDB record from monthly kWh' };
  const month = monthOf(doc.document);
  const period = { start: `${month}-01`, end: lastDay(month) };
  const levels = rows.map((r) => {
    // A monthly series prices each bill in its own month.
    const own = r.month ? { start: `${r.month}-01`, end: lastDay(r.month) } : period;
    const priced = priceTotals({ ...own, kwh: r.kwh }, read.tariff);
    const computed = priced.totalCents / 100;
    return { kwh: r.kwh, ...(r.month ? { month: r.month } : {}), page: r.page, commission: r.bill, database: computed, difference: round2(computed - r.bill), percent: Math.round(((computed - r.bill) / r.bill) * 1000) / 10, agree: agrees(r.bill, computed),
      arithmetic: priced.lines.map((l) => ({ label: l.label, ...(l.kwh !== undefined ? { kwh: l.kwh, rate: l.rate } : {}), amount: l.cents / 100 })),
      ...(r.lines ? { commissionLines: r.lines.filter((l) => l.label !== 'Subtotal').map((l) => ({ label: l.label, amount: l.amount })) } : {}) };
  });
  return { ...base, month, chargeTypes: chargeTypesOf(read.tariff), notes: read.notes, levels };
}

/**
 * The whole scorecard: every schedule in every ground-truth document, compared or counted untestable.
 * @param {any[]} docs ground-truth documents @param {any[]} crosswalk @param {Map<string, any>} records URDB rows by label
 * @param {any[]} findings maintainers' findings, by state, utility, and schedule
 */
export function scorecard(docs, crosswalk, records, findings = []) {
  const entries = []; const untestable = [];
  for (const doc of docs) {
    const schedules = [...new Map(doc.rows.map((r) => [`${r.utility}|${r.schedule ?? ''}`, r])).values()];
    for (const s of schedules) {
      const match = crosswalk.find((c) => c.state === doc.state && c.utility === s.utility && (c.schedule ?? null) === (s.schedule ?? null));
      const id = { state: doc.state, utility: s.utility, schedule: s.schedule ?? null };
      if (!match) { untestable.push({ ...id, why: 'not yet matched to a URDB record' }); continue; }
      if (match.untestable) { untestable.push({ ...id, why: match.untestable }); continue; }
      const record = records.get(match.urdb);
      if (!record) { untestable.push({ ...id, why: `URDB record ${match.urdb} is not in the snapshot` }); continue; }
      const e = compareSchedule(doc, match, record);
      if (e.untestable) { untestable.push({ ...id, why: e.untestable }); continue; }
      const finding = findings.find((f) => f.state === e.state && f.utility === e.utility && (f.schedule ?? null) === e.schedule);
      entries.push({ ...e, ...(finding ? { finding } : {}), wording: wording(e, finding) });
    }
  }
  return { entries, untestable, counts: counts(entries.map((e) => ({ ...e, levels: e.levels })), untestable.length) };
}

/**
 * Counts and distributions by state, utility, charge type, direction, and size of the difference. No
 * composite: nothing here averages or ranks.
 * @param {Array<{state: string, utility: string, chargeTypes: string[], levels: Array<{agree: boolean, percent: number, difference: number}>}>} entries
 */
export function counts(entries, untestable) {
  const levels = entries.flatMap((e) => e.levels.map((l) => ({ ...l, state: e.state, utility: e.utility, chargeTypes: e.chargeTypes })));
  const tally = (xs) => ({ figures: xs.length, agree: xs.filter((l) => l.agree).length, disagree: xs.filter((l) => !l.agree).length });
  const group = (key) => Object.fromEntries([...Map.groupBy(levels, key)].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([k, xs]) => [k, tally(xs)]));
  return {
    schedules: { tested: entries.length, untestable, disagreeing: entries.filter((e) => e.levels.some((l) => !l.agree)).length },
    figures: tally(levels),
    direction: { higher: levels.filter((l) => !l.agree && l.difference > 0).length, lower: levels.filter((l) => !l.agree && l.difference < 0).length },
    size: Object.fromEntries(BINS.map(([b]) => [b, levels.filter((l) => binOf(l) === b).length])),
    byState: group((l) => l.state),
    byUtility: group((l) => l.utility),
    byChargeType: Object.fromEntries(CHARGE_TYPES.map((t) => [t, tally(levels.filter((l) => l.chargeTypes.includes(t)))])),
  };
}

/**
 * Our own engine, measured the same way: each vector is a schedule's tariff as the commission itemizes it, run
 * by the engine, against the commission's bill (accuracy-scorecard, "Our own engine is in the table").
 * @param {any[]} vectors @param {(v: any) => any} run runVector @param {any[]} untestable the release's untestable schedules
 */
export function engineRow(vectors, run, untestable) {
  const bySchedule = Map.groupBy(vectors, (v) => `${v.provenance.utility}|${v.provenance.schedule}`);
  const entries = [...bySchedule.values()].map((vs) => ({
    state: vs[0].id.slice(0, 2).toUpperCase(), utility: vs[0].provenance.utility, chargeTypes: vs[0].chargeTypes,
    levels: vs.map((v) => { const r = run(v); return { agree: r.status === 'pass' && agrees(r.expected, r.computed), difference: round2((r.computed ?? 0) - r.expected), percent: Math.round((((r.computed ?? 0) - r.expected) / r.expected) * 1000) / 10 }; }),
  }));
  return counts(entries, untestable.length);
}
