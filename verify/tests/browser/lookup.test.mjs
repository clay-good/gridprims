// The on-device ZIP lookup in real browsers (public grid data task 5.1): the
// only state shard fetched is the ZIP's own, the ZIP appears in no request, and
// a four-digit ZIP fetches no shard.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();

const submitZip = (zip) => `(() => { const i = document.querySelector('#lookup-zip'); i.value = '${zip}'; document.querySelector('[data-lookup-zip]').requestSubmit(); })()`;

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: a ZIP lookup fetches only the prefix table and its state shard, and never sends the ZIP`, { skip, timeout: 60_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r.url) });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/lookup/`);
      await waitFor(browser, 'document.documentElement.dataset.ready');
      browser.requests.length = 0;
      log.length = 0;
      await browser.evaluate(submitZip('78701'));
      await waitFor(browser, "document.documentElement.dataset.lookupDone === '78701'");
      const text = await browser.evaluate("document.querySelector('[data-lookup-result]').textContent");
      assert.match(text, /Travis County, TX/);
      assert.match(text, /Census Bureau's ZIP Code Tabulation Areas/);
      const seen = [...log, ...browser.requests];
      assert.deepEqual(seen.filter((u) => u.includes('78701')), [], 'the ZIP appears in no request');
      // The service worker may precache the page and the prefix table meanwhile; a state shard is fetched only for a lookup.
      const shards = [...new Set(log.map((u) => new URL(u, server.url).pathname).filter((p) => /^\/lookup\/[A-Z]{2}\.json$/.test(p)))];
      assert.deepEqual(shards, ['/lookup/TX.json'], 'only the state the ZIP is in');
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: a four-digit ZIP suggests the leading zero and fetches nothing`, { skip, timeout: 60_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r.url) });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/lookup/`);
      await waitFor(browser, 'document.documentElement.dataset.ready');
      log.length = 0;
      await browser.evaluate(submitZip('4321'));
      await waitFor(browser, "document.querySelector('[data-zip-error]').textContent.length > 0");
      assert.match(await browser.evaluate("document.querySelector('[data-zip-error]').textContent"), /five digits\. Did you mean 04321\?/);
      await browser.evaluate('new Promise((r) => setTimeout(r, 200))');
      assert.deepEqual(log.filter((u) => /\/lookup\/[A-Z]{2}\.json$/.test(u)), [], 'no state shard is fetched');
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
