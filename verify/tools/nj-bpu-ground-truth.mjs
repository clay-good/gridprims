// Builds the New Jersey BPU average residential bill ground truth (add-tariff-conformance-suite 1.2 and 1.3) from
// the Board's release certifying the 2026 BGS auction, read by both methods in pipeline/lib/nj-bpu-bills.mjs.
// Dev-time only:
//   curl -o release.html https://nj.gov/bpu/newsroom/2026/approved/20260212.html
//   node verify/tools/nj-bpu-ground-truth.mjs release.html > data/curated/conformance/ground-truth/nj-bpu-2026-02-12.json
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readByCells, readByText, reconcile } from '../../pipeline/lib/nj-bpu-bills.mjs';

const [file] = process.argv.slice(2);
const page = readFileSync(file, 'utf8');
const document = {
  publisher: 'New Jersey Board of Public Utilities',
  title: 'New Jersey Board of Public Utilities Certifies 2026 Electricity Auction Results (Monthly Impact of BGS Auction on Average Residential Accounts)',
  url: 'https://nj.gov/bpu/newsroom/2026/approved/20260212.html',
  retrieved: '2026-11-21',
  sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
  asOf: '2026-02-12',
  service: 'Residential (Basic Generation Service)',
  taxes: 'unstated',
  assumptions: 'The average residential account at 650 kWh a month on Basic Generation Service, on the rates in force when the release was issued (2026-02-12) and on the rates from June 1, 2026, the new bill before credits or offsets. Whether taxes are included is unstated.',
  terms: 'The State of New Jersey says anyone "may view, copy or distribute State information found here without obligation to the State" (nj.gov legal notice). Only the figures are kept here.',
};
const r = reconcile(readByCells(page), readByText(page), { issued: '2026-02-12', from: '2026-06-01' });
console.log(JSON.stringify({ document, extraction: r.extraction, excluded: r.excluded, rows: r.rows }, null, 2));
