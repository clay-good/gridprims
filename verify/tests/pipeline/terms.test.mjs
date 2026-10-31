// Terms capture, takedown, raw release assets, and generated-at (foundation
// tasks 10.11, 10.12, 10.13).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compareTerms, pageText, postureInForce, safer } from '../../../pipeline/lib/terms.mjs';
import { scheduledRun } from '../../../pipeline/scheduled.mjs';
import { readHealth } from '../../../pipeline/lib/health.mjs';
import { datasetPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import entry from '../../../pipeline/registry/eia-861.mjs';
import { eia861Zip, smallTables } from '../../fixtures/data/eia-861/workbook.mjs';
import { ROOT } from '../../../pipeline/run.mjs';
import { tempDir } from '../../lib/temp.mjs';

const termsHtml = (text) => `<html><body><h1>Copyrights and Reuse</h1><h2>Public domain and use of EIA content</h2><p>${text.replace(/"/g, '&quot;')}</p><h2>Protected materials</h2><p>Reproduction of protected items requires the written permission of the copyright owners.</p></body></html>`;
const i18n = createI18n(strings, 'en-US');
const manifest = JSON.parse(readFileSync(join(ROOT, 'data/eia-861/2026-10/manifest.json'), 'utf8'));

test('unchanged terms keep the posture, even with restrictive wording about other material elsewhere on the page', () => {
  assert.deepEqual(compareTerms(entry, termsHtml(entry.terms.text)), { changed: false, posture: 'mirror' });
});

test('terms page changes: the posture drops to the safer option and the new text is kept', () => {
  const r = compareTerms(entry, termsHtml('Our data may be used for non-commercial purposes only.'));
  assert.equal(r.changed, true);
  assert.equal(r.posture, 'derive');
  assert.match(r.excerpt, /non-commercial purposes only/);
  assert.equal(safer('mirror', 'link'), 'link');
});

test('a publisher objects: the dataset drops to link, without argument', () => {
  assert.equal(postureInForce({ ...entry, takedown: { date: '2026-11-02', note: 'Publisher asked us to stop republishing' } }, { posture: 'mirror' }), 'link');
});

test('the page shows the posture in force: link hides every value and download, derive says so', () => {
  const link = String(datasetPage({ manifest, i18n, posture: 'link', takedown: { date: '2026-11-02' } }));
  assert.match(link, /We publish no values from this data, only a description and a link\./);
  assert.match(link, /At the publisher’s request \(Nov 2, 2026\)/);
  assert.doesNotMatch(link, /sales\.csv\.gz/);
  const derive = String(datasetPage({ manifest, i18n, posture: 'derive', termsRow: { changed: true, checked: '2026-11-05' } }));
  assert.match(derive, /We publish only values we computed from this data/);
  assert.match(derive, /terms page changed on or before Nov 5, 2026/);
  const mirror = String(datasetPage({ manifest, i18n }));
  assert.match(mirror, /sales\.csv\.gz/);
  assert.match(mirror, /data-age-from="2026-10-31T00:00:00Z"/);
  assert.match(mirror, /Generated Oct 31, 2026/, 'a no-script reader still sees when the data is from');
});

test('a refresh attaches the raw file to a release, records the link, and captures the terms', async () => {
  const root = tempDir('gridprims-root-');
  mkdirSync(join(root, 'data/health'), { recursive: true });
  const URL25 = 'https://www.eia.gov/electricity/data/eia861/zip/f8612025.zip';
  const site = {
    [URL25]: () => new Response(eia861Zip(), { headers: { 'content-length': '1', 'last-modified': 'Wed, 07 Oct 2026 13:48:05 GMT' } }),
    [entry.terms.url]: () => new Response(termsHtml(entry.terms.text)),
  };
  const fetchFake = async (url, init = {}) => (site[url] ? (init.method === 'HEAD' ? new Response(null, { headers: { 'content-length': '1', 'last-modified': 'Wed, 07 Oct 2026 13:48:05 GMT' } }) : site[url]()) : new Response('', { status: 404 }));
  const uploads = [];
  const host = { available: true, async reenableInactive() { return []; }, async openIssue() {}, async publishRawAsset(a) { uploads.push(a); return `https://github.com/clay-good/gridprims/releases/download/${a.tag}/${a.name}`; } };
  const small = { ...entry, vintages: { 2025: { url: URL25, asOf: '2026-10-07', sha256: null } }, tables: smallTables(entry) };
  await scheduledRun('refresh-data', { root, outDir: join(root, 'data'), host, fetch: fetchFake, entries: { 'eia-861': small }, now: () => new Date('2026-10-31T09:17:00Z') });
  assert.deepEqual(uploads.map((u) => [u.tag, u.name]), [['data-eia-861-2026-10', 'f8612025.zip']]);
  const m = JSON.parse(readFileSync(join(root, 'data/eia-861/2026-10/manifest.json'), 'utf8'));
  assert.equal(m.raw[0].release, 'https://github.com/clay-good/gridprims/releases/download/data-eia-861-2026-10/f8612025.zip');
  assert.equal(m.generatedAt, '2026-10-31T00:00:00Z');
  const row = readHealth(root).datasets.find((d) => d.id === 'eia-861');
  assert.deepEqual(row.terms, { checked: '2026-10-31', changed: false, posture: 'mirror' });
  assert.ok(!JSON.stringify(readHealth(root).runs).includes('"bytes"'), 'the run log holds no file bytes');
});

test('page text extraction drops markup and normalizes quotes', () => {
  assert.equal(pageText('<p>“Source:&nbsp;EIA”</p><script>x()</script>'), '"Source: EIA"');
});
