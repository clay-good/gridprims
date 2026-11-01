// The GO 95 watch (add-overhead-line-checks 2.5): one extractor serves both
// the stored capture and the weekly check, so a difference means the CPUC's
// page changed; a doctored capture is detected and the tables it affects read
// "needs review" on the health record; and a page we cannot reach leaves the
// stored capture standing rather than raising an alarm.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { GO95_PAGES, checkGo95, readCapture, tableText } from '../../../pipeline/lib/go95.mjs';
import { runGo95Watch } from '../../../pipeline/go95-watch.mjs';
import { WORKFLOWS } from '../../../pipeline/workflows.mjs';
import { tempDir } from '../../lib/temp.mjs';

/** A page that serves back exactly the stored capture's rows, as the CPUC's own markup would. */
const asPage = (body) => `<html><body><table>${body.split('\n').map((r) => `<tr>${r.split(' | ').map((c) => `<td>${c.replace(/&/g, '&amp;')}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
/** The CPUC serves these pages as Windows-1252, so a fake server must too, or every row would differ. */
const CP1252 = { 0x2013: 0x96, 0x2014: 0x97, 0x2019: 0x92, 0x2018: 0x91, 0x201c: 0x93, 0x201d: 0x94, 0x2026: 0x85 };
const encode1252 = (s) => Uint8Array.from([...s], (c) => CP1252[c.codePointAt(0)] ?? c.codePointAt(0));
const serve = (byUrl) => async (url) => (byUrl[url] === undefined
  ? { ok: false, status: 404 }
  : { ok: true, status: 200, arrayBuffer: async () => encode1252(byUrl[url]).buffer });

function clone() {
  const root = tempDir('gridprims-go95-');
  for (const p of ['data/curated/captures/go95', 'data/health']) { mkdirSync(join(root, p), { recursive: true }); cpSync(join(ROOT, p), join(root, p), { recursive: true }); }
  return root;
}

test('the extractor that made each capture is the one the watch uses: the committed captures round-trip', () => {
  for (const p of GO95_PAGES) {
    const stored = readCapture(ROOT, p.capture);
    assert.ok(stored.body.split('\n').length > 100, `Table ${p.table} capture looks short`);
    assert.equal(tableText(encode1252(asPage(stored.body))), stored.body, `Table ${p.table} does not round-trip`);
    assert.match(stored.source, /^https:\/\/ia\.cpuc\.ca\.gov\/gos\/go95\/go_95_table_\d\.html$/);
  }
});

test('a page that matches its capture is not a change', async () => {
  const pages = Object.fromEntries(GO95_PAGES.map((p) => [p.url, asPage(readCapture(ROOT, p.capture).body)]));
  const r = await checkGo95(ROOT, serve(pages));
  assert.deepEqual(r.map((x) => x.changed), [false, false]);
});

test('a doctored capture is detected, and the tables it affects read "needs review" on the health record', async () => {
  const root = clone();
  // The CPUC's page is unchanged; the stored capture is the thing that no longer matches it.
  const pages = Object.fromEntries(GO95_PAGES.map((p) => [p.url, asPage(readCapture(ROOT, p.capture).body)]));
  const file = join(root, GO95_PAGES[0].capture);
  writeFileSync(file, readFileSync(file, 'utf8').replace('18 Feet (j) (l) (m) (ii) (kkk)', '19 Feet (j) (l) (m) (ii) (kkk)'));
  const { results, review, notes } = await runGo95Watch({ root, fetch: serve(pages) });
  assert.deepEqual(results.map((x) => x.changed), [true, false]);
  assert.deepEqual(review, ['1']);
  assert.match(notes[0], /^GO 95 Table 1: changed, the table text differs from the stored capture$/);
  const health = JSON.parse(readFileSync(join(root, 'data/health/pipeline.json'), 'utf8'));
  assert.deepEqual(health.curated['go95-clearances'].needsReview, ['1']);
  assert.ok(health.runs[0].notes.length === 2 && health.runs[0].workflow === 'go95-watch');
});

test('a page we cannot reach leaves the stored capture standing, and the watch declares its interval', async () => {
  const root = clone();
  const { results, review } = await runGo95Watch({ root, fetch: serve({}) });
  assert.deepEqual(results.map((x) => x.changed), [false, false]);
  assert.match(results[0].reason, /HTTP 404; the stored capture still stands/);
  assert.deepEqual(review, []);
  const w = WORKFLOWS.find((x) => x.id === 'go95-watch');
  assert.deepEqual([w.intervalHours, w.thresholdHours], [168, 504]);
});
