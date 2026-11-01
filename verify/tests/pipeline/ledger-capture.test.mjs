// Posted release dates captured each check (add-data-continuity-ledger 1.3):
// the calendar page's promise is read, archived when it changes, and a
// promise that disappears is recorded beside the one before it, with no cause.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { capturePromise } from '../../../pipeline/check.mjs';
import { readHealth, recordRun } from '../../../pipeline/lib/health.mjs';
import { ledgerRow } from '../../../core/lib/ledger.mjs';
import { tempDir } from '../../lib/temp.mjs';

const entry = { id: 'x', title: 'X data', publisher: 'Agency', sourceUrl: 'https://example.gov/x', cadence: { every: 'annual' }, releaseCalendar: { url: 'https://example.gov/calendar', pattern: 'Next release:[^.]*' } };
const page = (body) => async () => new Response(`<html><body><p>${body}</p></body></html>`, { status: 200 });

test('a promise read, then removed: both versions kept with their dates and archived copies, and no cause', async () => {
  const root = tempDir('gridprims-ledger-capture-');
  mkdirSync(join(root, 'data/health'), { recursive: true });
  const outDir = join(root, 'data');
  const first = await capturePromise({ entry, fetch: page('Next release: March 2026. Thank you.'), today: '2026-01-05', outDir });
  assert.equal(first.text, 'Next release: March 2026');
  assert.ok(existsSync(join(outDir, 'release-pages/x/2026-01-05.txt')));
  assert.match(readFileSync(join(outDir, 'release-pages/x/2026-01-05.txt'), 'utf8'), /Next release: March 2026/);
  recordRun(root, { workflow: 'refresh-data', started: '2026-01-05T09:00:00Z', finished: '2026-01-05T09:10:00Z', ok: true, datasets: [{ id: 'x', checked: true, refreshed: false, releasePromise: first }] });
  const second = await capturePromise({ entry, fetch: page('Data releases are listed on this page.'), today: '2026-02-05', outDir });
  assert.equal(second.text, null);
  recordRun(root, { workflow: 'refresh-data', started: '2026-02-05T09:00:00Z', finished: '2026-02-05T09:10:00Z', ok: true, datasets: [{ id: 'x', checked: true, refreshed: false, releasePromise: second }] });
  // A third check with the same reading adds nothing.
  recordRun(root, { workflow: 'refresh-data', started: '2026-02-12T09:00:00Z', finished: '2026-02-12T09:10:00Z', ok: true, datasets: [{ id: 'x', checked: true, refreshed: false, releasePromise: second }] });
  const h = readHealth(root);
  const row = ledgerRow({ ...entry, asOf: '2025-03-01' }, { health: h, now: Date.parse('2026-02-12T00:00:00Z') });
  assert.deepEqual(row.promiseHistory.map((p) => [p.seen, p.text]), [['2026-01-05', 'Next release: March 2026'], ['2026-02-05', null]]);
  assert.match(row.promiseHistory[0].archive, /\/data\/release-pages\/x\/2026-01-05\.txt$/);
});
