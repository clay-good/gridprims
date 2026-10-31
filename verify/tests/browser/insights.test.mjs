// "What this file says" in real browsers (load and bill analyzer tasks 2.1 to
// 2.4): the sample file's metrics, a 60-minute demand window, the flags, the
// data-quality report, the duration curve and profiles, and a heatmap with a
// cell for every hour of every day.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: the sample file's insights: metrics, a 60-minute window, flags, data quality, and a full heatmap`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await waitFor(browser, "document.documentElement.dataset.ready === 'true' && document.querySelector('[data-insights]').dataset.rendered");
      const text = await browser.evaluate("document.querySelector('[data-insights]').textContent");
      assert.match(text, /Baseload \(5th percentile\)/);
      assert.match(text, /kWh per 15-minute interval × 4/);
      assert.match(text, /1 month of data: figures cover only that span/);
      assert.match(text, /Coverage: 100% of expected intervals \(1,344 of 1,344\)/);
      // 14 days × 24 hours, plus the six steps of the scale.
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-insights] .heatmap rect').length"), 14 * 24 + 6);
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-insights] .series-compare').length"), 1, 'the weekend profile');
      const before = await browser.evaluate("document.querySelector('[data-insights]').dataset.rendered");
      await browser.evaluate("(() => { const s = document.querySelector('#window-minutes'); s.value = '60'; s.dispatchEvent(new Event('change', { bubbles: true })); })()");
      await waitFor(browser, `document.querySelector('[data-insights]').dataset.rendered !== '${before}'`);
      assert.match(await browser.evaluate("document.querySelector('[data-window-result]').textContent"), /^Peak 60-minute block demand: [\d.,]+ kW, starting \w{3} \d+, 2026 at/);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
