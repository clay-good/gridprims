// Builds the Louisiana PSC residential bill ground truth (add-tariff-conformance-suite 1.2 and 1.3) from the
// monthly Residential Bill Comparison, read by both methods in pipeline/lib/la-psc-bills.mjs. Dev-time only,
// with poppler's pdftotext:
//   pdftotext -layout report.pdf report.txt && pdftotext -bbox report.pdf report-bbox.html
//   node verify/tools/la-psc-ground-truth.mjs report.pdf report.txt report-bbox.html > data/curated/conformance/ground-truth/la-psc-2026-11.json
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readByLines, readByPositions, readSummary, reconcile } from '../../pipeline/lib/la-psc-bills.mjs';

const [pdf, text, bbox] = process.argv.slice(2);
const layout = readFileSync(text, 'utf8');
const document = {
  publisher: 'Louisiana Public Service Commission',
  title: 'Louisiana Public Service Commission Jurisdictional Electric Utilities Residential Bill Comparison, November 2026',
  url: 'https://lpsc.louisiana.gov/docs/utilities/Comparisons/Electric/Residential-Electric-Bill-Comparison-November-2026.pdf',
  retrieved: '2026-11-21',
  sha256: createHash('sha256').update(readFileSync(pdf)).digest('hex'),
  asOf: '2026-11-13',
  billingMonth: '2026-11',
  service: 'Residential',
  taxes: 'unstated',
  assumptions: 'Bills for the November 2026 billing month, so each schedule\'s November energy rate and adjustment factors apply. Whether taxes are included is unstated; municipal franchise fee riders charged in some towns are not included (the report\'s notes for Pointe Coupee and Washington-St. Tammany). The report says it was compiled from information the utilities provided and that the Commission does not attest to its accuracy.',
  terms: 'The Commission\'s disclaimer limits its liability and states no restriction on reuse. The figures and line items are kept here, each with its page.',
};
const r = reconcile(readByLines(layout), readByPositions(readFileSync(bbox, 'utf8')), readSummary(layout));
console.log(JSON.stringify({ document, extraction: r.extraction, notes: r.notes, excluded: r.excluded, rows: r.rows }, null, 2));
