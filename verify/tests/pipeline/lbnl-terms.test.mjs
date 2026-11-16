// LBNL Queued Up's terms, captured each refresh (add-public-grid-data 5.2): the recorded CC BY 4.0 notice
// gives mirror; changed wording that no recognized license matches drops the queue to derive; and a terms page
// that refuses the request, as LBNL's refuses scripted ones, leaves the recorded terms in force and says so.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import entry from '../../../pipeline/registry/lbnl-queued-up.mjs';
import { compareTerms } from '../../../pipeline/lib/terms.mjs';
import { postureOf } from '../../../pipeline/lib/registry.mjs';
import { checkDataset } from '../../../pipeline/check.mjs';
import { datasetPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { ROOT } from '../../../pipeline/run.mjs';
import { tempDir } from '../../lib/temp.mjs';

const page = (notice) => `<html><body><h1>Interconnection queues</h1><h2>Copyright Notice</h2><p>${notice}</p><h2>Contact</h2><p>queues@lbl.gov</p></body></html>`;

test('terms are a recognized license: the recorded CC BY 4.0 notice gives mirror', () => {
  assert.equal(postureOf(entry).posture, 'mirror');
  assert.deepEqual(compareTerms(entry, page(entry.terms.text)), { changed: false, posture: 'mirror' });
});

test('terms not a recognized license: changed wording drops the queue to derive, never higher', () => {
  const r = compareTerms(entry, page('The Queued Up data file may be used for research. Contact LBNL before any other use.'));
  assert.equal(r.changed, true);
  assert.equal(r.posture, 'derive', 'counts and totals we compute still publish; the rows do not');
  assert.match(r.excerpt, /Contact LBNL before any other use/);
});

test('a terms page that refuses the request is recorded, and the recorded terms stand', async () => {
  const dir = tempDir('gridprims-lbnl-');
  const refuse = async () => new Response('Forbidden', { status: 403 });
  const r = await checkDataset({ dataset: 'lbnl-queued-up', entry, outDir: dir, today: '2026-11-16', fetch: refuse });
  assert.equal(r.terms.unreachable, 'HTTP 403');
  assert.equal(r.terms.captured, entry.terms.captured);
  assert.equal(r.terms.checked, '2026-11-16');
  assert.equal(r.terms.posture, undefined, 'no new posture: the build falls back to the one the recorded terms give');

  const cur = JSON.parse(readFileSync(join(ROOT, 'data/lbnl-queued-up/current.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(ROOT, 'data/lbnl-queued-up', cur.version, 'manifest.json'), 'utf8'));
  const html = String(datasetPage({ manifest, i18n: createI18n(strings, 'en-US'), posture: 'mirror', termsRow: r.terms, entry }));
  assert.match(html, /The terms page could not be read on Nov 16, 2026, so the terms recorded on Oct 31, 2026 stand\./);
});
