// "Review pending" on the workbench (load and bill analyzer task 8.1): each
// capability's label comes from docs/review-signoffs.md, so nothing waits on
// a reviewer and a sign-off changes only that row.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { filesPage, reviewPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { WORKBENCH_CAPABILITIES } from '../../../site/ui/workbench-review.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const i18n = createI18n(strings, 'en-US');
const out = await sharedSite();
const chips = (html) => [...html.matchAll(/data-review="([^"]+)">([^<]+)</g)].map((m) => [m[1], m[2]]);

test('with no sign-offs, every workbench capability reads "Review pending", and the review page lists all eight', () => {
  const files = readFileSync(join(out, 'files/index.html'), 'utf8');
  assert.deepEqual(chips(files), [['load.bill-explainer', 'Review pending'], ['load.tariff-comparison', 'Review pending'], ['load.storage-screen', 'Review pending'], ['load.coincident-peak', 'Review pending'], ['electrify.service-headroom', 'Review pending'], ['electrify.ev-fleet', 'Review pending'], ['electrify.added-load', 'Review pending']]);
  const review = readFileSync(join(out, 'review-status/index.html'), 'utf8');
  for (const [id] of WORKBENCH_CAPABILITIES) assert.match(review, new RegExp(`data-capability="${id.replace('.', '\\.')}"[\\s\\S]*?Review pending`), id);
});

test('a sign-off row changes only its own capability to "Reviewed"', () => {
  const html = String(filesPage({ i18n, reviewed: new Set(['load.bill-explainer']) }));
  assert.deepEqual(chips(html).find(([id]) => id === 'load.bill-explainer'), ['load.bill-explainer', 'Reviewed']);
  assert.deepEqual(chips(html).find(([id]) => id === 'load.coincident-peak'), ['load.coincident-peak', 'Review pending']);
  const review = String(reviewPage({ tools: [], signoffs: [{ tool: 'load.storage-screen' }], i18n }));
  assert.match(review, /data-capability="load\.storage-screen"[\s\S]*?Reviewed/);
});
