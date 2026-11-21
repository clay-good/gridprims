// Builds the Montana PSC average residential electric bill ground truth (add-tariff-conformance-suite 1.2 and
// 1.3) from the Commission's Gas and Electric Rate Summary, read by both methods in pipeline/lib/mt-psc-bills.mjs.
// Dev-time only, with poppler's pdftotext:
//   pdftotext -layout summary.pdf summary.txt && pdftotext -bbox summary.pdf summary-bbox.html
//   node verify/tools/mt-psc-ground-truth.mjs summary.pdf summary.txt summary-bbox.html > data/curated/conformance/ground-truth/mt-psc-2026-11.json
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readByLines, readByPositions, reconcile } from '../../pipeline/lib/mt-psc-bills.mjs';

const [pdf, text, bbox] = process.argv.slice(2);
const document = {
  publisher: 'Montana Public Service Commission',
  title: '2026 Gas and Electric Rate Summary (Average Bill - Electric, Assume 30 days/750 kwh)',
  url: 'https://psc.mt.gov/_docs/Energy/pdf/2026GasandElectricRateSummary.pdf',
  retrieved: '2026-11-21',
  sha256: createHash('sha256').update(readFileSync(pdf)).digest('hex'),
  asOf: '2026-11-01',
  service: 'Residential',
  taxes: 'included',
  assumptions: 'A 30-day month at 750 kWh, at the rates filed and processed for each utility as of the first day of the month; mid-month changes appear the next month. Tax tracking adjustments are included. Montana-Dakota Utilities\' bills from April 2026 include an interim increase of 22.008% on the monthly service charge and the energy charge (Docket 2025.09.072).',
  terms: 'A Montana public record; the summary states no restriction on reuse. Only the figures are kept here, each with its page.',
};
const r = reconcile(readByLines(readFileSync(text, 'utf8')), readByPositions(readFileSync(bbox, 'utf8')));
console.log(JSON.stringify({ document, extraction: r.extraction, excluded: r.excluded, rows: r.rows }, null, 2));
