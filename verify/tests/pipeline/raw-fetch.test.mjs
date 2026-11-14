// Fetching a publisher's raw file, when the network drops part-way
// (issue #2: the EIA-930 refresh failed because the PJM workbook was never
// read to the end, so its SHA-256 was unknown).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRaw } from '../../../pipeline/run.mjs';

/** A publisher that fails in a given way the first `failures` times, then answers. */
function flaky(failures, fail) {
  let calls = 0;
  const f = async (url) => {
    calls += 1;
    if (calls <= failures) return fail(url);
    return new Response('the workbook', { status: 200 });
  };
  return { fetch: f, calls: () => calls };
}

const nap = { delayMs: 0, sleep: async () => {} };
const dropped = () => { throw new TypeError('fetch failed'); };

test('a dropped connection is retried, and the file still arrives', async () => {
  const site = flaky(2, dropped);
  const { res, value } = await fetchRaw('https://eia.gov/PJM.xlsx', (x) => x.text(), { ...nap, fetch: site.fetch });
  assert.equal(res.status, 200);
  assert.equal(value, 'the workbook');
  assert.equal(site.calls(), 3, 'two failures, then the attempt that worked');
});

test('a connection that never comes back throws the publisher\'s own error, after every attempt', async () => {
  const site = flaky(Infinity, dropped);
  await assert.rejects(
    () => fetchRaw('https://eia.gov/PJM.xlsx', (x) => x.text(), { ...nap, fetch: site.fetch }),
    (e) => e.message === 'fetch failed',
  );
  assert.equal(site.calls(), 3);
});

test('a failure part-way through the body is retried from the start of the download', async () => {
  let calls = 0;
  const f = async () => {
    calls += 1;
    if (calls === 1) return new Response(new ReadableStream({ start: (c) => c.error(new TypeError('terminated')) }), { status: 200 });
    return new Response('the workbook', { status: 200 });
  };
  const { value } = await fetchRaw('https://eia.gov/PJM.xlsx', (x) => x.text(), { ...nap, fetch: f });
  assert.equal(value, 'the workbook', 'a half-read 100 MB workbook is downloaded again, not left without a SHA-256');
  assert.equal(calls, 2);
});

test('a 503 is retried; the last response is returned when it never clears', async () => {
  const slow = flaky(1, () => new Response('busy', { status: 503 }));
  assert.equal((await fetchRaw('https://eia.gov/PJM.xlsx', (x) => x.text(), { ...nap, fetch: slow.fetch })).res.status, 200);
  assert.equal(slow.calls(), 2);

  const down = flaky(Infinity, () => new Response('busy', { status: 503 }));
  const { res } = await fetchRaw('https://eia.gov/PJM.xlsx', (x) => x.text(), { ...nap, fetch: down.fetch });
  assert.equal(res.status, 503, 'the caller still reports "HTTP 503", as it did before the retry');
  assert.equal(down.calls(), 3);
});

test('a 404 is the publisher\'s answer, not a blip: it is returned at once, unread', async () => {
  const gone = flaky(Infinity, () => new Response('no such file', { status: 404 }));
  const { res, value } = await fetchRaw('https://eia.gov/WAUE.xlsx', (x) => x.text(), { ...nap, fetch: gone.fetch });
  assert.equal(res.status, 404);
  assert.equal(value, null);
  assert.equal(gone.calls(), 1, 'a missing file is not asked for three times');
});

test('without a reader the response is handed back unread, for a file that is streamed', async () => {
  const site = flaky(1, dropped);
  const { res, value } = await fetchRaw('https://eia.gov/eaglei.csv', undefined, { ...nap, fetch: site.fetch });
  assert.equal(value, res);
  assert.equal(await res.text(), 'the workbook', 'the body is still unread, so it can be streamed');
});

test('the wait grows with each attempt, so a busy publisher is not hammered', async () => {
  const waits = [];
  const site = flaky(2, dropped);
  await fetchRaw('https://eia.gov/PJM.xlsx', (x) => x.text(), { fetch: site.fetch, delayMs: 100, sleep: async (ms) => { waits.push(ms); } });
  assert.deepEqual(waits, [100, 200]);
});
