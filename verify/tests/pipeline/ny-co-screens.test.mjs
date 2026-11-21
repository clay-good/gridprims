// New York's and Colorado's screens as records (add-interconnection-screens 1.2): every number is in its own
// screen's paragraph of each stored capture (New York's in both the PSC's SIR and Con Edison's tariff
// addendum, Colorado's in the rule), and each record passes the curated and screen-record rules.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as NY from '../../../data/curated/interconnect/ny/_screens.mjs';
import * as CO from '../../../data/curated/interconnect/co/_screens.mjs';
import { checkRecord } from '../../../pipeline/lib/curated.mjs';
import { checkScreenRecord } from '../../../pipeline/lib/screen-records.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const body = (file) => readFileSync(`${ROOT}/data/curated/captures/interconnect/${file}`, 'utf8').split('\n----\n')[1];
/** The paragraphs whose locator line mentions a screen. */
const paragraphs = (text, key) => text.split('\n\n').filter((p) => p.startsWith('[') && p.split('\n')[0].includes(key)).join('\n');

test('New York: every number is in its screen\'s paragraph of both the SIR and Con Edison\'s addendum', () => {
  for (const file of ['ny-sir-2026-10-01-appendix-g.txt', 'ny-coned-psc10-addendum-sir-23.txt']) {
    const text = body(file);
    for (const s of NY.SCREENS) for (const x of s.numbers) assert.ok(paragraphs(text, `${s.locator.replace(', item 3', '')}`).includes(x), `${file} ${s.locator}: ${x}`);
  }
  assert.match(paragraphs(body('ny-sir-2026-10-01-appendix-g.txt'), 'Screen E'), /or 15% of the annual peak load \(where daytime minimum load data is not available\)/);
});

test('Colorado: every number is in its rule paragraph', () => {
  const text = body('co-4ccr723-3-3852-3855.txt');
  for (const s of CO.SCREENS) for (const x of s.numbers) {
    const keys = s.locator.replace('Rule ', '').split(' and ').map((k) => k.replace('Rule ', ''));
    assert.ok(keys.some((k) => paragraphs(text, k.replace(/\(A\)$/, '')).includes(x)), `${s.locator}: ${x}`);
  }
});

test('each record passes, and New York\'s thresholds rest on both primary sources', () => {
  for (const [m, n] of [[NY, 2], [CO, 1]]) for (const s of m.SCREENS) {
    const r = m.record(s.id);
    assert.deepEqual(checkScreenRecord(r), [], r.id);
    assert.deepEqual(checkRecord(r, ROOT).problems, [], r.id);
    assert.equal(r.fields.threshold.sources.length, n, r.id);
  }
});
