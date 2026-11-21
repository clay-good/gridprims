// Builds the Kansas Corporation Commission residential bill ground truth (add-tariff-conformance-suite 1.2 and
// 1.3) from the 2026 Utilities and Common Carriers Report, read by both methods in pipeline/lib/ks-kcc-bills.mjs.
// Dev-time only, with poppler's pdftotext:
//   pdftotext -layout report.pdf report.txt && pdftotext -bbox -f 34 -l 34 report.pdf page-34.html
//   node verify/tools/ks-kcc-ground-truth.mjs report.pdf report.txt page-34.html > data/curated/conformance/ground-truth/ks-kcc-2026.json
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readByLines, readByPositions, reconcile } from '../../pipeline/lib/ks-kcc-bills.mjs';

const [pdf, text, bbox] = process.argv.slice(2);
const a = readByLines(readFileSync(text, 'utf8'));
const document = {
  publisher: 'Kansas Corporation Commission',
  title: '2026 Utilities and Common Carriers Report: Residential Electric Bill Comparison, July 2024 - June 2025',
  url: 'https://www.kcc.ks.gov/images/PDFs/legislative-reports/2026%20Utilities%20%20Common%20Carriers%20Report.pdf',
  retrieved: '2026-11-21',
  sha256: createHash('sha256').update(readFileSync(pdf)).digest('hex'),
  asOf: '2025-06-30',
  service: 'Residential',
  taxes: 'excluded',
  assumptions: 'Monthly bills at the average residential use of 899 kWh over July 2024 to June 2025, itemized by charge; the total is the bill without tax, as the table labels it.',
  terms: 'A Kansas public record; the report states no restriction on reuse. Only the figures are kept here, each with its page.',
};
const r = reconcile(a, readByPositions(readFileSync(bbox, 'utf8'), a[0]?.page));
console.log(JSON.stringify({ document, extraction: r.extraction, excluded: r.excluded, rows: r.rows }, null, 2));
