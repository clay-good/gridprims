// The scenario model in real browsers (add-grid-scenario-model 2.4, 3.1, 3.3):
// the device's own backtest is shown before the controls open; retiring a
// region's largest coal unit reports the change by fuel against the bias, the
// CO2 change, and the unmet-residual count; the copied card carries the error
// and the omissions; and in Chrome no request names an added unit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const SENTINEL = 'SENTINEL7731PLANT';

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: the backtest runs first, then a coal retirement is read against the model's bias`, { skip, timeout: 90_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      const page = await (await fetch(`${server.url}/scenario/pace/`)).text();
      assert.match(page, /<form data-scenario-form hidden/, 'the controls are closed until the device has run the backtest');
      await browser.goto(`${server.url}/scenario/pace/`);
      await waitFor(browser, "document.querySelector('[data-scenario]').dataset.backtestShown === 'true'", 60_000);
      assert.equal(await browser.evaluate("document.querySelector('[data-scenario-form]').hidden"), false);
      assert.match(await browser.evaluate("document.querySelector('[data-backtest]').textContent"), /Coal.*Natural gas.*Oil.*All three/s);
      if (browser.requests) browser.requests.length = 0;
      // Retire the largest coal unit and add a sentinel-named gas unit.
      await browser.evaluate(`(() => {
        const f = document.querySelector('[data-scenario-form]');
        const coal = [...f.retire.options].find((o) => / Coal$/.test(o.textContent));
        coal.selected = true;
        f.addName.value = '${SENTINEL}'; f.addMw.value = '300'; f.addCost.value = '1000'; f.addFuel.value = 'gas';
        f.requestSubmit();
      })()`);
      await waitFor(browser, "document.querySelector('[data-scenario]').dataset.ran === '1'");
      const changes = await browser.evaluate("[...document.querySelectorAll('[data-scenario-changes] tbody tr')].map((r) => r.dataset.fuel + ':' + r.dataset.finding).join(' ')");
      assert.match(changes, /^coal:(true|false) gas:(true|false) oil:(true|false)$/);
      assert.match(await browser.evaluate("document.querySelector('[data-scenario-co2]').textContent"), /CO₂ from the dispatched fleet changes by −?[\d,]+ metric tons/);
      assert.match(await browser.evaluate("document.querySelector('[data-scenario-unmet-change]').textContent"), /not whether the grid would have had enough capacity/);
      assert.match(await browser.evaluate("document.querySelector('[data-scenario-added]').textContent"), new RegExp(`${SENTINEL} would not have run`));
      assert.match(await browser.evaluate("document.querySelector('[data-share-warning]').textContent"), /carries the units, capacities, and costs you entered/);
      const card = await browser.evaluate("document.querySelector('[data-scenario-result]').dataset.card");
      assert.match(card, /the backtest's mean bias for the same hours is/);
      assert.match(card, /What it leaves out: Unit commitment/);
      assert.match(card, /This is a screening model/);
      assert.match(card, /of placed capacity uses a regional or national price/);
      assert.match(card, /The national models that do this properly: ReEDS/);
      if (browser.requests) for (const url of browser.requests) assert.doesNotMatch(url, new RegExp(SENTINEL), url);
      // The marginal-unit explorer names a unit, its cost, and its inputs for a summer evening.
      assert.match(await browser.evaluate("document.querySelector('[data-marginal-hour]').textContent"), /marginal unit was .*\/MWh .*MMBtu\/MWh|no dispatched unit was marginal/);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
