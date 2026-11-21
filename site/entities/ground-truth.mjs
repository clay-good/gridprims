// The regulator ground truth (add-tariff-conformance-suite 1.4 and 1.5): the
// typical bills state commissions publish, as extracted into
// data/curated/conformance/ground-truth, with coverage by state, commission,
// utility, and consumption level, every absent state named with its reason
// and the date we last looked, and the limits of these figures stated before
// every table and in every download.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import PUBLICATIONS from '../../data/curated/conformance-publications.mjs';
import REGULATORS from '../../data/curated/regulators.mjs';

export const GROUND_TRUTH_PATH = '/data/ground-truth/';
export const GROUND_TRUTH_DIR = 'data/curated/conformance/ground-truth';

/** What the figures prove and what they do not (regulator-ground-truth, "What these figures do and do not prove"). */
export const LIMITS = 'These are bills commissions computed at fixed monthly consumption levels, mostly for residential flat-rate service, each on the commission\'s own stated assumptions (kept with every row where the source gives them). They prove nothing about time-of-use rates, demand charges, ratchets, holidays, or power factor.';

/** A publication's status, and the coverage reason it gives an absent state. */
export const STATUSES = {
  used: null,
  excluded: 'restrictive terms',
  'not found': 'no publication found',
  'not extracted': 'not yet extracted',
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Every state and DC needs one publication record, and each record needs what its status claims.
 * @returns {string[]} problems, empty when the list is complete
 */
export function checkPublications(publications = PUBLICATIONS, regulators = REGULATORS, root = null) {
  const problems = [];
  const states = new Set(regulators.map((r) => r.state));
  const seen = new Map();
  for (const p of publications) {
    const id = p.state ?? '(no state)';
    if (!states.has(p.state)) problems.push(`${id}: not a state or DC`);
    if (seen.has(p.state)) problems.push(`${id}: listed twice`);
    seen.set(p.state, p);
    if (!(p.status in STATUSES)) problems.push(`${id}: status "${p.status}" is not one of ${Object.keys(STATUSES).join(', ')}`);
    if (!ISO.test(p.checked ?? '')) problems.push(`${id}: checked is not a date`);
    if (!p.publisher) problems.push(`${id}: missing publisher`);
    if (!p.reason) problems.push(`${id}: missing reason`);
    if (p.status === 'excluded' && !p.terms?.says) problems.push(`${id}: excluded without the terms that restrict reuse`);
    if (p.status === 'used' || p.status === 'not extracted') {
      if (!p.url) problems.push(`${id}: ${p.status} without the publication's address`);
    }
    if (p.status === 'used') {
      if (!p.file) problems.push(`${id}: used without its extracted file`);
      else if (root && !existsSync(join(root, GROUND_TRUTH_DIR, p.file))) problems.push(`${id}: ${p.file} is not in ${GROUND_TRUTH_DIR}`);
    }
  }
  for (const s of states) if (!seen.has(s)) problems.push(`${s}: no record of whether its commission publishes a bill comparison`);
  return problems;
}

/** The extracted documents, each with the state and commission its publication record names. */
export function loadGroundTruth(root, publications = PUBLICATIONS) {
  return publications.filter((p) => p.status === 'used').map((p) => ({ state: p.state, ...JSON.parse(readFileSync(join(root, GROUND_TRUTH_DIR, p.file), 'utf8')) }));
}

/**
 * Coverage by state, commission, utility, and consumption level (regulator-ground-truth, "Coverage published").
 * Absent states keep their reason and the date we last looked.
 */
export function coverage(documents, publications = PUBLICATIONS, regulators = REGULATORS) {
  const byState = new Map(publications.map((p) => [p.state, p]));
  const states = regulators.map((r) => {
    const p = byState.get(r.state);
    const docs = documents.filter((d) => d.state === r.state);
    const rows = docs.flatMap((d) => d.rows);
    return {
      state: r.state, stateName: r.stateName, commission: p?.publisher ?? r.name, status: p?.status ?? null,
      absence: p ? STATUSES[p.status] : 'no publication found', reason: p?.reason ?? null, checked: p?.checked ?? null,
      title: p?.title ?? null, url: p?.url ?? null,
      utilities: new Set(rows.map((x) => x.utility)).size, schedules: new Set(rows.map((x) => `${x.utility}|${x.schedule ?? ''}`)).size, levels: [...new Set(rows.map((x) => x.kwh))].sort((a, b) => a - b), figures: rows.length,
    };
  });
  const covered = states.filter((s) => s.status === 'used');
  const extraction = documents.reduce((t, d) => ({ figures: t.figures + d.extraction.figures, disagreed: t.disagreed + d.extraction.disagreed }), { figures: 0, disagreed: 0 });
  return {
    states,
    totals: {
      states: covered.length, commissions: new Set(covered.map((s) => s.commission)).size,
      utilities: covered.reduce((n, s) => n + s.utilities, 0), levels: [...new Set(covered.flatMap((s) => s.levels))].sort((a, b) => a - b),
      figures: covered.reduce((n, s) => n + s.figures, 0), absent: states.length - covered.length,
    },
    extraction: { ...extraction, rate: extraction.figures ? extraction.disagreed / extraction.figures : 0 },
  };
}

const quote = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export const CSV_COLUMNS = ['state', 'commission', 'document', 'document_date', 'document_url', 'document_sha256', 'page', 'utility', 'tariff_as_named', 'ownership', 'kwh', 'bill_usd', 'customer_charge_usd', 'sourced_from_utility_website', 'taxes', 'assumptions'];

/** Every figure with its provenance, the limits sentence on the first line as a comment. */
export function groundTruthCsv(documents) {
  const rows = documents.flatMap((d) => d.rows.map((r) => [d.state, d.document.publisher, d.document.title, d.document.asOf, d.document.url, d.document.sha256, r.page, r.utility, r.schedule ?? d.document.service, r.ownership, r.kwh, r.bill.toFixed(2), r.customerCharge?.toFixed(2), r.websiteSourced, d.document.taxes ?? 'unstated', d.document.assumptions ?? 'unstated']));
  return [`# ${LIMITS}`, CSV_COLUMNS.join(','), ...rows.map((r) => r.map(quote).join(','))].join('\n') + '\n';
}

/** The JSON download: limits first, then coverage, then every document with its rows. */
export function groundTruthJson(documents, cov = coverage(documents)) {
  return {
    publisher: 'gridprims', license: 'CC BY 4.0', limits: LIMITS,
    credit: 'Figures are the state commissions\' own, each cited to its document and page; credit the commission with gridprims.',
    coverage: cov, documents,
  };
}
