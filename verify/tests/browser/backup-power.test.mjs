// The backup power size's county outage history in real browsers
// (add-electrification-tools 1.6): a ZIP in Austin finds Travis County, its
// EAGLE-I events set the outage length to the 90th percentile, the battery
// for each duration is shown, and the county-proxy label is there.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const travis = JSON.parse(readFileSync(join(out, 'outages/TX.json'), 'utf8')).counties['48453'];

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: ZIP 78701 finds Travis County; its outage history sets the hours and shows the battery for each duration`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/tools/electrify/backup-power/size/`);
      await waitFor(browser, "document.documentElement.dataset.ready && document.querySelector('[data-outage-picker]').dataset.ready");
      await browser.evaluate("(() => { document.querySelector('#outage-zip').value = '78701'; document.querySelector('[data-outage-picker] [data-picker-zip]').requestSubmit(); })()");
      await waitFor(browser, "document.querySelector('[data-outage-picker]').dataset.chosen === '48453'");
      assert.equal(await browser.evaluate("document.querySelector('#in-hours').value"), String(travis.p90));
      const note = await browser.evaluate("document.querySelector('[data-outage-picker] [data-picker-note]').textContent");
      assert.match(note, new RegExp(`Travis County had ${travis.count.toLocaleString('en-US')} outages with at least 1% of customers out`));
      assert.match(note, /A county event means some customers in the county were out, not that this address was\./);
      assert.match(note, /EAGLE-I publishes no coverage figure for 2014, 2015, 2016, 2017, 2023, 2024, 2025/);
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-outage-table] tbody tr').length"), 3);
      // The tool's own answer follows the prefilled hours.
      await waitFor(browser, `document.querySelector('[data-answer] .sentence')?.textContent.startsWith('For ${travis.p90.toLocaleString('en-US', { maximumFractionDigits: 2 })} hours')`);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
