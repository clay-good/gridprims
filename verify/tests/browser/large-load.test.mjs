// The large-load screen in real browsers (add-large-load-screen 1.3, 2.1,
// 2.2): a Birmingham ZIP fills Alabama Power's peak, sales, and home use, and
// says no public large-load tariff was found, with the regulator's docket
// search; a Columbus ZIP links AEP Ohio's terms; the terms page compares AEP
// Ohio and Dominion GS-5 side by side; and choosing AEP Ohio prefills the
// calculator and asks for the rates. In Chrome no request names a ZIP.

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
      assert.equal(await browser.evaluate("document.querySelector('[data-who-pays]').dataset.whoPays"), 'none');
      assert.match(await browser.evaluate("document.querySelector('[data-who-pays]').textContent"), /No public large-load tariff was found for Alabama Power Co.*Alabama Public Service Commission/s);
      await browser.evaluate("(() => { document.querySelector('#large-load-zip').value = '43215'; document.querySelector('[data-large-load-picker] [data-picker-zip]').requestSubmit(); })()");
      await waitFor(browser, "document.querySelector('[data-who-pays]')?.dataset.whoPays === 'terms'");
      assert.match(await browser.evaluate("document.querySelector('[data-who-pays] a').getAttribute('href')"), /\/large-load\/terms\/#aep-ohio-dct$/);
      if (browser.requests) for (const url of browser.requests) assert.doesNotMatch(url, /35203|43215/, url);
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: the terms page compares AEP Ohio and Dominion GS-5, and AEP Ohio prefills the calculator`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/large-load/terms/`);
      await waitFor(browser, "document.querySelector('[data-terms-shown]').textContent !== ''");
      await browser.evaluate("['aep-ohio-dct', 'dominion-gs5'].forEach((id) => { const c = document.querySelector(`[data-compare][value=\"${id}\"]`); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); })");
      await waitFor(browser, "document.querySelector('[data-terms-filters]').dataset.compared === '2'");
      const rows = await browser.evaluate("[...document.querySelectorAll('[data-compare-table] tbody tr')].map((r) => r.dataset.row + ':' + r.dataset.differs).join(' ')");
      assert.match(rows, /threshold:true/);
      assert.match(rows, /minimum:true/);
      assert.match(await browser.evaluate("document.querySelector('[data-compare-table] [data-row=\"term\"]').textContent"), /ramp period plus 8 years.*14 years/s);
      await browser.evaluate("(() => { const s = document.querySelector('[name=\"state\"]'); s.value = 'TX'; s.dispatchEvent(new Event('change', { bubbles: true })); })()");
      assert.equal(await browser.evaluate("[...document.querySelectorAll('[data-term-entry]')].filter((e) => !e.hidden).map((e) => e.id).join(' ')"), 'texas-25-194');

      await browser.goto(`${server.url}/tools/grid/large-load/take-or-pay/`);
      await waitFor(browser, "document.querySelector('[data-terms-picker]').dataset.ready === 'true'");
      await browser.evaluate("(() => { const s = document.querySelector('[data-terms-picker-entry]'); s.value = 'aep-ohio-dct'; s.dispatchEvent(new Event('change', { bubbles: true })); })()");
      await waitFor(browser, "document.querySelector('[data-terms-picker]').dataset.chosen === 'aep-ohio-dct'");
      const v = await browser.evaluate("['components', 'ramp', 'years', 'ratchetPct', 'exitRule'].map((n) => document.querySelector('[data-inputs]').elements.namedItem(n).value).join(' | ')");
      assert.equal(v, 'demand: 57,500 kW + 100% above 75 MW, cap 85% at $/kW-month | 50, 65, 80, 90, 100 | 12 | 85 | 36 months');
      assert.match(await browser.evaluate("document.querySelector('[data-terms-picker] [data-picker-note]').textContent"), /enter them where it says \$\/kW-month/);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
