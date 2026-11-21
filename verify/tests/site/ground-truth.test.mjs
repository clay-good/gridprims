// The regulator ground truth (add-tariff-conformance-suite 1.4 and 1.5):
// every state and DC has a publication record, an absent state is named with
// its reason and the date we last looked, the limits sentence comes before
// every table and heads every download, and each figure carries its
// commission, document, date, and page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import PUBLICATIONS from '../../../data/curated/conformance-publications.mjs';
import REGULATORS from '../../../data/curated/regulators.mjs';
import { LIMITS, checkPublications, coverage, groundTruthCsv, groundTruthJson, loadGroundTruth } from '../../../site/entities/ground-truth.mjs';
import { groundTruthPage } from '../../../site/templates/ground-truth.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const i18n = createI18n(strings, 'en-US');
const docs = loadGroundTruth(ROOT);
const cov = coverage(docs);

test('the committed list covers every state and DC, and each record carries what its status claims', () => {
  assert.deepEqual(checkPublications(PUBLICATIONS, REGULATORS, ROOT), []);
  assert.equal(cov.states.length, 51);
});

test('missing state: dropping a state\'s record fails by name, and a not-found state shows its reason and last-looked date', () => {
  assert.ok(checkPublications(PUBLICATIONS.filter((p) => p.state !== 'TX'), REGULATORS).includes('TX: no record of whether its commission publishes a bill comparison'));
  const tx = cov.states.find((s) => s.state === 'TX');
  assert.equal(tx.absence, 'no publication found');
  assert.match(tx.checked, /^\d{4}-\d{2}-\d{2}$/);
  const html = String(groundTruthPage({ documents: docs, coverage: cov, i18n }));
  const row = /<tr data-state="TX"[^>]*>(.*?)<\/tr>/s.exec(html)[1];
  assert.match(row, /no publication found/);
  assert.match(row, new RegExp(i18n.date(tx.checked)));
});

test('a record that overclaims fails: excluded without its terms, used without its file, an unknown status', () => {
  const base = PUBLICATIONS.filter((p) => !['IN', 'FL', 'TX'].includes(p.state));
  const errors = checkPublications([...base,
    { state: 'IN', publisher: 'x', checked: '2026-11-01', status: 'excluded', reason: 'r', terms: null },
    { state: 'FL', publisher: 'x', checked: '2026-11-01', status: 'used', reason: 'r', url: 'https://x' },
    { state: 'TX', publisher: 'x', checked: '2026-11-01', status: 'maybe', reason: 'r' }], REGULATORS, ROOT);
  assert.ok(errors.includes('IN: excluded without the terms that restrict reuse'), errors.join('\n'));
  assert.ok(errors.includes('FL: used without its extracted file'));
  assert.ok(errors.some((e) => e.startsWith('TX: status "maybe"')));
});

test('coverage counts states, commissions, utilities, and levels from the extracted rows', () => {
  const fl = docs.find((d) => d.state === 'FL');
  assert.equal(cov.totals.utilities, new Set(docs.flatMap((d) => d.rows.map((r) => `${d.state}|${r.utility}`))).size);
  assert.equal(cov.totals.figures, docs.reduce((n, d) => n + d.rows.length, 0));
  assert.equal(cov.totals.states + cov.totals.absent, 51);
  assert.deepEqual(cov.totals.levels, [...new Set(docs.flatMap((d) => d.rows.map((r) => r.kwh)))].sort((a, b) => a - b));
  assert.ok(cov.totals.states >= 2, 'Florida and Louisiana');
  assert.equal(cov.extraction.figures, fl.extraction.figures + docs.filter((d) => d !== fl).reduce((n, d) => n + d.extraction.figures, 0));
});

test('limits stated: the sentence precedes every table on the page and heads both downloads', () => {
  assert.equal(strings['gt.limits'], LIMITS, 'the page and the downloads say the same thing');
  const html = String(groundTruthPage({ documents: docs, coverage: cov, i18n }));
  const tables = [...html.matchAll(/<table/g)].map((m) => m.index);
  assert.ok(tables.length >= 2);
  for (const at of tables) {
    const before = html.slice(0, at);
    const lastLimits = before.lastIndexOf('data-limits');
    const lastTableEnd = before.lastIndexOf('</table>');
    assert.ok(lastLimits > lastTableEnd, `a table at ${at} has no limits sentence since the previous table`);
  }
  assert.equal(groundTruthCsv(docs).split('\n')[0], `# ${LIMITS}`);
  assert.equal(groundTruthJson(docs).limits, LIMITS);
});

test('row provenance: each figure in the CSV names its commission, document, date, address, and page', () => {
  const [, header, ...lines] = groundTruthCsv(docs).trim().split('\n');
  assert.equal(lines.length, cov.totals.figures);
  const cols = header.split(',');
  const fl = docs.find((d) => d.state === 'FL');
  const first = fl.rows[0];
  const line = lines.find((l) => l.includes(`,${first.page},${first.utility},`));
  assert.ok(line, 'the first Florida figure is in the CSV');
  for (const c of ['commission', 'document', 'document_date', 'document_url', 'page']) assert.ok(cols.includes(c), c);
  assert.ok(line.includes(fl.document.url) && line.includes(fl.document.asOf) && line.includes('Florida Public Service Commission'));
  const html = String(groundTruthPage({ documents: docs, coverage: cov, i18n }));
  assert.ok(html.includes(`href="${fl.document.url}"`), 'the page links the document');
  assert.match(html, new RegExp(`<td class="mono">${first.page}</td>`));
});

test('the error rate on the page is the build\'s own count', () => {
  const html = String(groundTruthPage({ documents: docs, coverage: cov, i18n }));
  assert.match(html, new RegExp(`disagreed on ${cov.extraction.disagreed} of ${cov.extraction.figures} figures`));
});

test('the extraction is published under CC BY 4.0 and the committed file is what the page reads', () => {
  assert.equal(groundTruthJson(docs).license, 'CC BY 4.0');
  const file = JSON.parse(readFileSync(join(ROOT, 'data/curated/conformance/ground-truth/fl-psc-2025-12-31.json'), 'utf8'));
  assert.equal(docs.find((d) => d.state === 'FL').rows.length, file.rows.length);
});

test('the vector section lists every charge type with its count, names the uncovered ones, and keeps the limits first', async () => {
  const release = JSON.parse(readFileSync(join(ROOT, 'data/curated/conformance/release.json'), 'utf8'));
  const html = String(groundTruthPage({ documents: docs, coverage: cov, release, i18n }));
  const section = /<section data-vectors>(.*?)<\/section>/s.exec(html)[1];
  assert.ok(section.indexOf('data-limits') < section.indexOf('<table'));
  for (const [type, n] of Object.entries(release.coverage.byChargeType)) assert.match(section, new RegExp(`data-charge-type="${type}"><th scope="row">[^<]+</th><td class="num mono">${n}</td>`));
  assert.match(section, /No vector exercises: [^<]*Demand ratchet[^<]*\. The suite proves nothing about these\./);
  assert.equal([...section.matchAll(/data-untestable/g)].length, release.untestable.length);
});

test('anyone can run it: each release is listed with its frozen file, and the latest file holds vectors, format, coverage, and limits', async () => {
  const { changelog, releaseFile } = await import('../../../pipeline/lib/vector-releases.mjs');
  const log = changelog(ROOT);
  const release = JSON.parse(readFileSync(join(ROOT, 'data/curated/conformance/release.json'), 'utf8'));
  const html = String(groundTruthPage({ documents: docs, coverage: cov, release, releases: log, i18n }));
  for (const e of log) assert.ok(html.includes(`href="/data/ground-truth/vectors/${releaseFile(e.version)}"`), e.version);
  const latest = JSON.parse(readFileSync(join(ROOT, 'data/curated/conformance/releases', releaseFile(log.at(-1).version)), 'utf8'));
  assert.equal(latest.license, 'CC BY 4.0');
  assert.equal(latest.limits, LIMITS);
  assert.match(latest.formatDocumentation, /^# Bill test vector/);
  assert.deepEqual(latest.coverage, release.coverage);
  assert.equal(latest.vectors.length, release.vectors.length);
});

test('the CSV keeps each bill\'s month and rate date, so a monthly series and a before-and-after pair stay apart', () => {
  const [, header, ...lines] = groundTruthCsv(docs).trim().split('\n');
  const cols = header.split(',');
  for (const c of ['month', 'rates_as_of', 'before_credits']) assert.ok(cols.includes(c), c);
  const mt = lines.filter((l) => l.startsWith('MT,'));
  assert.equal(new Set(mt.map((l) => l.split(',')[cols.indexOf('month') + (l.split(',').length - cols.length)])).size >= 1, true);
  assert.ok(mt.some((l) => l.includes(',2026-11,')) && mt.some((l) => l.includes(',2025-09,')));
  assert.ok(lines.some((l) => l.startsWith('NJ,') && l.includes(',2026-06-01,true,')));
});

test('an excluded figure shows its reason on the page', () => {
  const doc = { ...docs[0], excluded: [{ utility: 'Example', kwh: 1000, why: 'the two methods disagree' }] };
  assert.match(String(groundTruthPage({ documents: [doc], coverage: cov, i18n })), /Example 1000 the two methods disagree/);
});
