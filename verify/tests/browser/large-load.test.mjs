// The large-load request card's utility picker in real browsers
// (add-large-load-screen 1.3): a Birmingham ZIP finds Alabama Power, fills
// its Form 714 peak, sales, and average home use, and the card answers; in
// Chrome no request names the ZIP.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: ZIP 35203 fills Alabama Power's peak, sales, and home use`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/tools/grid/large-load/context/`);
      await waitFor(browser, 'document.documentElement.dataset.ready');
      if (browser.requests) browser.requests.length = 0;
      await browser.evaluate("(() => { document.querySelector('#large-load-zip').value = '35203'; document.querySelector('[data-large-load-picker] [data-picker-zip]').requestSubmit(); })()");
      await waitFor(browser, "document.documentElement.dataset.largeLoadChosen === '195'");
      const v = await browser.evaluate("['peakMw', 'salesMwh', 'residentialKwh'].map((n) => document.querySelector('[data-inputs]').elements.namedItem(n).value).join(' ')");
      assert.equal(v, '14872 52177426 13546');
      assert.match(await browser.evaluate("document.querySelector('[data-large-load-picker] [data-picker-note]').textContent"), /Alabama Power Co: a 14,872 MW annual peak in 2025 \(FERC Form 714\)/);
      if (browser.requests) for (const url of browser.requests) assert.doesNotMatch(url, /35203/, url);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
