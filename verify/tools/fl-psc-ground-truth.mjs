// Builds the Florida PSC typical residential bill ground truth (add-tariff-conformance-suite 1.2 and 1.3) from
// the Comparative Rate Statistics report, read by both methods in pipeline/lib/fl-psc-bills.mjs. Dev-time only,
// with poppler's pdftotext:
//   pdftotext -layout report.pdf report.txt && pdftotext -bbox report.pdf report-bbox.html
//   node verify/tools/fl-psc-ground-truth.mjs report.pdf report.txt report-bbox.html > data/curated/conformance/ground-truth/fl-psc-2025-12-31.json
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readByLines, readByPositions, readRanking, reconcile } from '../../pipeline/lib/fl-psc-bills.mjs';

const [pdf, text, bbox] = process.argv.slice(2);
const layout = readFileSync(text, 'utf8');
const document = {
  publisher: 'Florida Public Service Commission',
  title: 'Comparative Rate Statistics as of December 31, 2025',
  url: 'https://www.floridapsc.com/pscfiles/website-files/PDF/Publications/Reports/General/Comparative/December%2031,%202025.pdf',
  retrieved: '2026-11-16',
  sha256: createHash('sha256').update(readFileSync(pdf)).digest('hex'),
  asOf: '2025-12-31',
  assumptions: 'Excludes local taxes, franchise fees, and gross receipts taxes billed as a separate line item; includes cost recovery clause factors effective December 2025 (the tables\' own footnote). Bills marked ** were sourced by the PSC from the utility\'s website.',
  terms: 'A Florida public record (Chapter 119, Florida Statutes); the report states no restriction on reuse. Only the figures are kept here, each with its page.',
};
const r = reconcile(readByLines(layout), readByPositions(readFileSync(bbox, 'utf8')), readRanking(layout), {});
console.log(JSON.stringify({ document, extraction: r.extraction, excluded: r.excluded, rows: r.rows }, null, 2));
