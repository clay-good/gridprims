// The queue explorer (public grid data tasks 5.2 and 5.3): summaries by
// place, type, and status, the credit and as-of date on every page, the
// live-status handoff, and the posture deciding whether project rows show.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { median, queuePages, summarize } from '../../../site/entities/queue.mjs';
import { queueIndexPage, queueStatePage } from '../../../site/templates/queue.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';

const i18n = createI18n(strings, 'en-US');
const q = queuePages(join(ROOT, 'data'));
const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const tx = q.states.find((s) => s.state === 'TX');

test('a county view shows active MW by type, the project count, and median years in queue, with the as-of date', () => {
  const brazoria = tx.counties.find((c) => c.county === 'Brazoria');
  const html = String(queueStatePage({ q, state: tx, i18n, posture: 'mirror' }));
  const row = html.split('<tr>').find((r) => r.includes('<th scope="row">Brazoria</th>'));
  assert.ok(row);
  const cells = [...row.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((m) => m[1]);
  assert.equal(cells[0], Math.round(brazoria.summary.activeMw).toLocaleString('en-US'));
  assert.equal(cells[1], String(brazoria.summary.activeCount));
  assert.equal(cells[8], brazoria.summary.medianYears.toFixed(1));
  assert.match(html, /Queue requests by county in Texas, as of Dec 31, 2025/);
});

test('every queue page credits LBNL and GridTracker with the as-of date and hands off to live status', () => {
  for (const html of [queueIndexPage({ q, i18n, posture: 'mirror' }), queueStatePage({ q, state: tx, i18n, posture: 'mirror' })].map(text)) {
    assert.match(html, /Data: Lawrence Berkeley National Laboratory and GridTracker, Queued Up, as of Dec 31, 2025\./);
    assert.match(html, /This is an annual snapshot\. A request's status may have changed since\. Current status at Interconnection\.fyi\./);
  }
  const rows = String(queueStatePage({ q, state: tx, i18n, posture: 'mirror' })).split('<tr>').filter((r) => r.includes('Current status</a>'));
  assert.equal(rows.length, tx.projects.length, 'every project row links to live status');
});

test('under derive, the pages show only computed values; under mirror, project rows too', () => {
  const derived = text(queueStatePage({ q, state: tx, i18n, posture: 'derive' }));
  assert.match(derived, /Only counts and totals we computed are shown/);
  assert.doesNotMatch(derived, /Active requests Status is as of/);
  assert.doesNotMatch(String(queueStatePage({ q, state: tx, i18n, posture: 'derive' })), /Current status<\/a><\/td>/);
  const mirrored = text(queueStatePage({ q, state: tx, i18n, posture: 'mirror' }));
  assert.match(mirrored, /LBNL licenses the file CC BY 4\.0, so project rows are shown/);
});

test('summaries: medians, the withdrawal cohort, and types add up to the active total', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), null);
  const s = summarize([
    { q_status: 'active', q_date: '2023-12-31', q_year: 2023, mw_1: 100, type_clean: 'Solar' },
    { q_status: 'active', q_date: '2021-12-31', q_year: 2021, mw_1: 50, type_clean: 'Solar+Battery' },
  ], '2025-12-31');
  assert.ok(Math.abs(s.medianYears - 3) < 0.01);
  assert.equal(s.withdrawn, null, 'too few requests entered by 2020 to give a share');
  assert.deepEqual(Object.keys(s.byType).sort(), ['hybrid', 'solar']);
  const nat = q.national;
  assert.ok(Math.abs(Object.values(nat.byType).reduce((n, x) => n + x.mw, 0) - nat.activeMw) < 1e-6);
  assert.ok(nat.withdrawn.share > 0.5 && nat.withdrawn.n > 10000);
});

test('a negative published capacity is shown as published, named by count, and still reconciles', () => {
  const travis = tx.counties.find((c) => c.county === 'Travis');
  assert.ok(travis.summary.byType.solar.mw < 0, 'LBNL publishes a negative solar capacity in Travis County');
  assert.deepEqual(travis.summary.negative, { count: 1, mw: travis.summary.byType.solar.mw });
  const html = String(queueStatePage({ q, state: tx, i18n, posture: 'mirror' }));
  const row = html.split('<tr>').find((r) => r.includes('<th scope="row">Travis</th>'));
  const cells = [...row.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((m) => m[1]);
  // The publisher's own figure, not a clamp at zero.
  assert.equal(cells[0], Math.round(travis.summary.activeMw).toLocaleString('en-US'));
  assert.equal(cells[2], Math.round(travis.summary.byType.solar.mw).toLocaleString('en-US'));
  assert.ok(text(html).includes(`LBNL\u2019s file gives ${tx.summary.negative.count} of these requests a negative capacity, ${Math.round(tx.summary.negative.mw).toLocaleString('en-US')} MW in all`), 'the state page names how many rows are negative and by how much');
  // The county figures still add up to the state's, negatives included.
  const countySolar = tx.counties.reduce((n, c) => n + (c.summary.byType.solar?.mw ?? 0), 0);
  assert.ok(Math.abs(countySolar - tx.summary.byType.solar.mw) < 1e-6);
  const countyNegatives = tx.counties.reduce((n, c) => n + (c.summary.negative?.count ?? 0), 0);
  assert.equal(countyNegatives, tx.summary.negative.count);
  // A place with no negative row carries no note.
  const noNegative = q.states.find((s) => !s.summary.negative);
  assert.doesNotMatch(text(queueStatePage({ q, state: noNegative, i18n, posture: 'mirror' })), /negative capacity/);
});
