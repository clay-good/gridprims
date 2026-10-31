// The ampacity tool's rating table in real browsers (grid calculators task
// 1.3 and 1.4): the RUS conductor library fills the diameter, and one row per degree with day and night amps, the assumptions in a
// header comment, and the exclusion label.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: the rating table exports one row per temperature with day and night amps and its assumptions`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/tools/calc/line-rating/ampacity/`);
      await waitFor(browser, "document.documentElement.dataset.ready && document.querySelector('[data-rating-table]').dataset.ready");
      // Drake from the RUS library fills 1.108 in with its citation, and asks for the manufacturer's resistance.
      await browser.evaluate("(() => { const s = document.querySelector('[data-conductor]'); s.value = 'Drake'; s.dispatchEvent(new Event('change')); })()");
      await waitFor(browser, "document.querySelector('[data-conductor-picker]').dataset.chosen === 'Drake'");
      assert.equal(await browser.evaluate("document.querySelector('#in-diameter').value"), '1.108');
      assert.match(await browser.evaluate("document.querySelector('[data-conductor-note]').textContent"), /795 kcmil 26\/7 ACSR "Drake": 1\.108 in diameter, from USDA RUS Bulletin 1724E-200[\s\S]*no public-domain resistance table exists/);
      await browser.evaluate("document.querySelector('[data-table-make]').click()");
      await waitFor(browser, "document.querySelector('[data-rating-table]').dataset.rows === '66'");
      const csv = (await browser.evaluate("document.querySelector('[data-rating-table]').dataset.csv")).trim().split('\n');
      assert.match(csv[1], /excludes terminal equipment and emergency ratings/);
      assert.ok(csv.some((l) => /^# Wind: 2 ft\/s at 90 degrees/.test(l)));
      const h = csv.indexOf('ambient_c,day_amps,night_amps');
      assert.equal(csv.length - h - 1, 66);
      assert.ok(await browser.evaluate("document.querySelector('[data-table-result] a[download]').href.startsWith('blob:')"));
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
