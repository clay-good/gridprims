// The workbench's coincident-peak panel in real browsers (load and bill
// analyzer tasks 5.1 to 5.4): ERCOT 4CP for a year ERCOT has published, a
// year it has not, and PJM 5CP asking for five dates and hours with a link to
// PJM's list.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: coincident peaks: 2026 ERCOT intervals are not yet published and not estimated; PJM asks for five peaks and links its list`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await waitFor(browser, "document.documentElement.dataset.ready === 'true' && document.querySelector('[data-cp]').dataset.ready && document.querySelector('#cp-year option')");
      // The sample file is June 2026, a summer ERCOT has not yet published.
      assert.equal(await browser.evaluate("document.querySelector('#cp-year').value"), '2026');
      await browser.evaluate("document.querySelector('[data-cp-form]').requestSubmit()");
      await waitFor(browser, "document.querySelector('[data-cp-result]').textContent.length > 0");
      assert.match(await browser.evaluate("document.querySelector('[data-cp-result]').textContent"), /The ERCOT 4CP intervals for 2026 are not yet published; they are not estimated\./);
      // PJM 5CP: five date-and-hour fields and the link to PJM's list; one hour inside the sample computes once all five are filled.
      await browser.evaluate("(() => { const s = document.querySelector('#cp-program'); s.value = 'pjm-5cp'; s.dispatchEvent(new Event('change')); })()");
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-cp-stamps] input[type=date]').length"), 5);
      assert.match(await browser.evaluate("document.querySelector('[data-cp-stamps] a').href"), /^https:\/\/www\.pjm\.com\//);
      await browser.evaluate(`(() => { const f = document.querySelector('[data-cp-form]'); for (let i = 0; i < 5; i++) { f['date-' + i].value = '2026-06-0' + (i + 2); f['time-' + i].value = '18:00'; } f.rate.value = '329.17'; f.requestSubmit(); })()`);
      await waitFor(browser, "document.querySelector('[data-cp]').dataset.ran === '1'");
      const text = await browser.evaluate("document.querySelector('[data-cp-result]').textContent");
      assert.match(text, /PJM 5CP \(capacity\): 5 peaks of 60 minutes, stamped hour ending, Eastern Prevailing Time\./);
      assert.match(text, /About \$[\d,]+\.\d\d a year, applied to the delivery year from June 1 to May 31\./);
      assert.match(await browser.evaluate("document.querySelector('[data-cp-average]').textContent"), /^[\d.,]+ kW$/);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
