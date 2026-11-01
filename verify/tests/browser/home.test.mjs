// The home page is the instrument (site/home-and-navigation): a dropped file
// replaces the sample in place, on this page, and nothing is uploaded.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const FIXTURE = join(import.meta.dirname, '../../fixtures/bill/files/ercot-4cp-2025.csv');

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: dropping a file on the home page replaces the sample in place and sends nothing`, { skip, timeout: 60_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r.url) });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/`);
      await waitFor(browser, "document.documentElement.dataset.shellReady === 'true'");
      const sample = await browser.evaluate("document.querySelector('.proof .number').textContent");
      assert.match(sample, /^166\.1/, 'the page opens already working on the sample');
      log.length = 0;

      const b64 = readFileSync(FIXTURE).toString('base64');
      await browser.evaluate(`(() => {
        const dt = new DataTransfer();
        dt.items.add(new File([Uint8Array.from(atob('${b64}'), (c) => c.charCodeAt(0))], 'ercot-4cp-2025.csv'));
        const i = document.querySelector('[data-home-file]'); i.files = dt.files;
        i.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
      await waitFor(browser, "document.querySelector('[data-proof]').dataset.source === 'yours'", 30_000);

      // The figures, the basis band and the curve all follow the file, on the same page.
      assert.notEqual(await browser.evaluate("document.querySelector('.proof .number').textContent"), sample);
      assert.match(await browser.evaluate("document.querySelector('.proof .source-tab').textContent"), /^Basis · ercot-4cp-2025\.csv/);
      assert.match(await browser.evaluate("document.querySelector('.proof .sentence').textContent"), /nothing was uploaded/);
      assert.equal(await browser.evaluate('location.pathname'), '/', 'it never navigated');
      assert.equal(await browser.evaluate("document.querySelectorAll('.proof-table tbody tr').length"), 24);
      // Nothing left the device: no request carried the file.
      const leaked = log.filter((u) => u.includes('ercot-4cp-2025.csv'));
      assert.deepEqual(leaked, [], 'the dropped file name never appears in a request');
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
