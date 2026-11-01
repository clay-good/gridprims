// The weather tool's station picker in real browsers (add-weather-normalization
// 1.4): a downtown Phoenix ZIP finds Sky Harbor first, its daily temperatures
// fill the tool, the receipt names the station, its distance, and its
// coverage, and in Chrome no request names the ZIP or the station.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: ZIP 85004 finds Phoenix Sky Harbor, fills the temperatures, and names the station in the receipt`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/tools/weather/change/explain/`);
      await waitFor(browser, "document.documentElement.dataset.ready && document.querySelector('[data-weather-picker]').dataset.ready");
      if (browser.requests) browser.requests.length = 0;
      await browser.evaluate("(() => { document.querySelector('#weather-zip').value = '85004'; document.querySelector('[data-weather-picker] [data-picker-zip]').requestSubmit(); })()");
      await waitFor(browser, "document.querySelector('[data-weather-picker]').dataset.chosen === 'USW00023183'");
      const weather = await browser.evaluate("document.querySelector('#in-weather').value");
      assert.match(weather, /^station USW00023183 PHOENIX/);
      assert.ok(weather.split('\n').length > 365, 'two years of days');
      assert.match(weather, /\nnormal 07-15 /);
      const receipt = await browser.evaluate("document.querySelector('[data-weather-picker] [data-picker-note]').textContent");
      assert.match(receipt, /PHOENIX.*\(USW00023183\): [\d.]+ miles away, at [\d,]+ ft, with records from \d{4} to 2026\. Temperatures are present on [\d.]+% of the days/);
      if (browser.requests) for (const url of browser.requests) assert.doesNotMatch(url, /85004|USW00023183|maricopa/i, url);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
