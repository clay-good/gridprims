// The bill test vector (add-tariff-conformance-suite: bill test vectors): a
// tariff in URPX, a load, an expected bill by line, a tolerance, where the
// expected value came from, and the charge types it exercises. A vector whose
// expected bill came from our own engine never publishes, and one a person
// contributed from their own bill carries no account number, address, meter
// identifier, or bill document.

import { PERSONAL } from './curated.mjs';

/** The charge types the suite counts coverage by, in the order the coverage table lists them. */
export const CHARGE_TYPES = ['fixed', 'tiered-energy', 'seasonal-energy', 'tou-energy', 'flat-demand', 'tou-demand', 'ratchet', 'power-factor', 'minimum-bill', 'rider'];

/** Where an expected bill may come from, and the citation fields each needs. */
export const PROVENANCE = {
  'commission-publication': ['document', 'date', 'page', 'utility', 'consumptionLevel'],
  'utility-typical-bill': ['document', 'date', 'utility', 'url'],
  'user-bill': ['period', 'entered'],
  'tariff-arithmetic': ['tariffSheet', 'arithmetic'],
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const URPX_VERSION = /^v\d+\.\d+\.\d+$/;
const present = (x) => x !== undefined && x !== null && !(typeof x === 'string' && x.trim() === '') && !(Array.isArray(x) && !x.length);
const money = (x) => Number.isFinite(x?.amount) && x.unit === 'USD';

/**
 * The problems with one vector; an empty list when it may publish.
 * @param {any} v
 * @returns {string[]}
 */
export function checkVector(v) {
  const id = v?.id ?? '(no id)';
  const p = [];
  const need = (cond, msg) => { if (!cond) p.push(`${id}: ${msg}`); };

  // The tariff: a URPX document with its version recorded.
  need(v.tariff?.format === 'URPX', 'the tariff must be in URPX (tariff.format "URPX")');
  need(URPX_VERSION.test(String(v.tariff?.version ?? '')), 'the tariff must record its URPX version, such as v0.5.1');
  need(JSON.stringify(v.tariff?.document?.['@context'] ?? '').includes('urpx'), 'the tariff document must be URPX JSON-LD, with the URPX context');

  // The load: monthly totals with their period dates, or an interval series.
  if (v.load?.kind === 'monthly') {
    need(present(v.load.periods) && v.load.periods.every((x) => ISO_DATE.test(x.start) && ISO_DATE.test(x.end) && Number.isFinite(x.kwh)), 'each monthly period needs its start and end dates and its kWh');
  } else if (v.load?.kind === 'interval') {
    need(Number.isFinite(v.load.intervalMinutes) && present(v.load.zone) && present(v.load.start) && present(v.load.kwh), 'an interval load needs its interval minutes, time zone, start, and kWh values');
  } else p.push(`${id}: the load must be "monthly" or "interval"`);

  // The expected bill: a total and every charge line, each with its unit and charge type.
  const lines = v.expected?.lines ?? [];
  need(money(v.expected?.total), 'the expected total needs an amount and its unit, USD');
  need(lines.length > 0, 'the expected bill needs its charge lines');
  for (const [i, l] of lines.entries()) {
    need(present(l.label) && money(l), `expected line ${i + 1} needs a label, an amount, and its unit, USD`);
    need(CHARGE_TYPES.includes(l.type), `expected line ${i + 1} needs a charge type, one of ${CHARGE_TYPES.join(', ')}`);
  }
  if (money(v.expected?.total) && lines.length && lines.every(money)) {
    const sum = lines.reduce((s, l) => s + l.amount, 0);
    need(Math.abs(sum - v.expected.total.amount) < 0.005, `the expected lines sum to $${sum.toFixed(2)}, not the expected total of $${v.expected.total.amount.toFixed(2)}`);
  }

  // The tolerance, with its unit.
  need(Number.isFinite(v.tolerance?.amount) && v.tolerance.amount >= 0 && ['USD', '%'].includes(v.tolerance?.unit), 'a tolerance needs an amount and its unit, USD or %');

  // The charge types: declared, and exactly those the expected lines exercise.
  const declared = v.chargeTypes ?? [];
  if (!present(declared)) p.push(`${id}: the vector must declare the charge types it exercises`);
  else {
    const used = new Set(lines.map((l) => l.type).filter((t) => CHARGE_TYPES.includes(t)));
    for (const t of declared) {
      if (!CHARGE_TYPES.includes(t)) p.push(`${id}: "${t}" is not a charge type the suite counts`);
      else if (!used.has(t)) p.push(`${id}: declares ${t}, but no expected line exercises it, so it would claim coverage it does not give`);
    }
    for (const t of used) if (!declared.includes(t)) p.push(`${id}: an expected line exercises ${t}, which the vector does not declare`);
  }

  p.push(...checkProvenance(v).map((m) => `${id}: ${m}`));
  return p;
}

/**
 * The provenance rules: an independent source with its own citation, never our engine, and no personal data
 * in a figure a person read off their own bill.
 * @param {any} v
 * @returns {string[]}
 */
export function checkProvenance(v) {
  const pr = v.provenance;
  if (!pr) return ['a vector needs a provenance record: where its expected bill came from'];
  if (pr.kind === 'engine' || /gridprims/i.test(String(pr.producedBy ?? ''))) {
    return ['its expected bill came from our own engine; a vector must have independent provenance (a commission publication, a utility\'s typical-bill table, a figure from a person\'s own bill, or a computation from the filed tariff with its full arithmetic), so that it can catch our mistakes'];
  }
  const fields = PROVENANCE[pr.kind];
  if (!fields) return [`provenance "${pr.kind}" is not one of ${Object.keys(PROVENANCE).join(', ')}`];
  const problems = fields.filter((f) => !present(pr[f])).map((f) => `its ${pr.kind} provenance needs ${f}`);
  if (pr.kind === 'user-bill') {
    if (present(pr.document) || present(pr.attachment)) problems.push('a figure from a person\'s own bill keeps the amounts only, never the bill document');
    if (Object.keys(pr).some((k) => /account|meter|address/i.test(k))) problems.push('a contributed bill carries no account number, meter identifier, or address');
    const text = JSON.stringify(v);
    for (const [re, what] of PERSONAL) if (re.test(text)) problems.push(`holds what looks like ${what}; a contributed bill keeps the amounts, the tariff, and the period only`);
  }
  return problems;
}
