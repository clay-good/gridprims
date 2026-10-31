// Runs the parser suite in every installed browser engine. Skips an engine that
// is not installed here; CI's runner image has Chrome and Firefox.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { availableBrowsers, findBrowser, launch, runInSafari } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { WORKBOOKS } from '../../fixtures/xlsx/workbooks.mjs';
import { run } from '../../browser/parsers-suite.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const routes = Object.fromEntries(WORKBOOKS.map((w) => [`/fixtures/xlsx/${w.id}.xlsx`, { body: w.bytes() }]));
const expected = WORKBOOKS.map((w) => ({ id: w.id, rows: w.rows, date1904: w.date1904 ?? false }));
const suite = `import('/verify/browser/parsers-suite.mjs').then((m) => m.run(${JSON.stringify(expected)}))`;

test('the parser suite passes in Node (the baseline the engines must match)', async () => {
  const server = await serve(root, { routes });
  const realFetch = globalThis.fetch;
  globalThis.fetch = (u, o) => realFetch(new URL(u, server.url), o);
  try {
    assert.deepEqual(await run(expected), []);
  } finally {
    globalThis.fetch = realFetch;
    await server.close();
  }
});

for (const kind of ['chrome', 'firefox']) {
  test(`the parser suite passes in ${kind}`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 60_000 }, async () => {
    const server = await serve(root, { routes });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/verify/browser/blank.html`);
      assert.deepEqual(await browser.evaluate(suite), []);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

test('the parser suite passes in Safari', { skip: process.platform !== 'darwin' || !process.env.GRIDPRIMS_SAFARI_TESTS ? 'set GRIDPRIMS_SAFARI_TESTS=1 on a Mac with Allow Remote Automation on' : false, timeout: 60_000 }, async (t) => {
  const server = await serve(root, { routes });
  try {
    const r = await runInSafari(`${server.url}/verify/browser/blank.html`, `const done = arguments[0]; ${suite}.then(done, (e) => done(['threw ' + e.message]));`);
    if (r === null) {
      // On CI the job enables automation first, so a missing session is a failure, not a skip.
      assert.ok(!process.env.CI, 'Safari automation is not enabled on the CI runner');
      return t.skip('Safari automation is not enabled');
    }
    assert.deepEqual(r, []);
  } finally {
    await server.close();
  }
});

test('at least one browser engine is available when CI runs', { skip: !process.env.CI && 'only enforced in CI' }, () => {
  assert.ok(availableBrowsers().length >= 1);
});
