// The workbench's bill on a meter file in real browsers (load and bill
// analyzer task 3.3): the sample file priced on an Austin Energy commercial
// rate, month by month, with each demand line naming the interval that set it
// and showing it on the chart; only the rate files of the utilities shown are fetched.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const austin = JSON.parse(readFileSync(join(out, 'bills/rates/1015.json'), 'utf8')).rates;
// A rate the sample office (a peak well under 300 kW) is eligible for, with a monthly demand charge.
const pick = austin.findIndex((r) => /^Commercial - Secondary Voltage 10kW-300kW - Inside/.test(r.name));

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: the sample file on an Austin Energy demand rate: monthly bills, the demand line's setting interval, shown on the chart`, { skip, timeout: 90_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r.url) });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await waitFor(browser, "document.documentElement.dataset.ready === 'true' && document.querySelector('[data-bill]').dataset.ready");
      log.length = 0;
      await browser.evaluate("(() => { document.querySelector('#bill-zip').value = '78701'; document.querySelector('[data-bill-zip]').requestSubmit(); })()");
      await waitFor(browser, "!document.querySelector('[data-bill-rate-field]').hidden");
      await browser.evaluate("(() => { const s = document.querySelector('#bill-utility'); s.value = [...s.options].find((o) => o.textContent === 'Austin Energy · TX').value; s.dispatchEvent(new Event('change')); })()");
      await waitFor(browser, `document.querySelectorAll('#bill-rate option').length === ${austin.length}`);
      await browser.evaluate(`(() => { const s = document.querySelector('#bill-rate'); s.value = '${pick}'; s.dispatchEvent(new Event('change')); })()`);
      await waitFor(browser, `document.querySelector('[data-bill]').dataset.priced === ${JSON.stringify(austin[pick].id)}`);
      const months = await browser.evaluate("document.querySelectorAll('[data-bill-month]').length");
      assert.ok(months >= 1);
      assert.match(await browser.evaluate("document.querySelector('[data-bill-total]').textContent"), /^\$[\d,]+\.\d\d$/);
      assert.match(await browser.evaluate("document.querySelector('[data-bill-result]').textContent"), new RegExp(`URDB rate ${austin[pick].id}`));
      const ms = await browser.evaluate("document.querySelector('[data-line=demand] [data-show-ms]').dataset.showMs");
      assert.match(await browser.evaluate("document.querySelector('[data-line=demand] [data-show-ms]').textContent"), /^Set by \w{3} \d+, \d{4} at \d+:\d\d (am|pm), [\d.,]+ kW: show on the chart$/);
      // An actual bill 6% above the first month's computed total: the difference and its causes, never a billing error.
      const first = await browser.evaluate("document.querySelector('[data-bill-month]').dataset.billMonth");
      const computed = await browser.evaluate("Number(document.querySelector('[data-bill-month] summary').textContent.match(/\\$([\\d,]+\\.\\d\\d)/)[1].replace(/,/g, ''))");
      const actual = (Math.round(computed * 106) / 100).toFixed(2);
      await browser.evaluate(`(() => { const i = document.querySelector('[data-actual="${first}"]'); i.value = '${actual}'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await waitFor(browser, `document.querySelector('[data-compare="${first}"]').textContent.includes('Likely causes')`);
      const said = await browser.evaluate(`document.querySelector('[data-compare="${first}"]').textContent`);
      assert.match(said, /\(\+6%\)/);
      assert.match(said, /A difference is not a billing error\./);
      // Every commercial rate on the file, ranked, then again with 20 kW shifted from 2 pm to 11 am on weekdays.
      await browser.evaluate("document.querySelector('[data-compare-run]').click()");
      await waitFor(browser, "document.querySelector('[data-bill]').dataset.compared === '1'");
      const ranked = await browser.evaluate("[...document.querySelectorAll('[data-ranking] tbody tr')].map((r) => r.dataset.rateId)");
      const listed = await browser.evaluate("document.querySelectorAll('[data-compare-result] li').length");
      assert.equal(ranked.length + listed, austin.filter((r) => r.sector === 'Commercial').length, 'every commercial rate is ranked or listed as not eligible');
      assert.ok(ranked.includes(austin[pick].id));
      assert.match(await browser.evaluate("document.querySelector('[data-compare-result]').textContent"), /Based on this file's past use\./);
      await browser.evaluate("(() => { const f = document.querySelector('[data-shift]'); f.kw.value = '20'; f.from.value = '14'; f.to.value = '11'; f.requestSubmit(); })()");
      await waitFor(browser, "document.querySelector('[data-bill]').dataset.compared === '2'");
      assert.match(await browser.evaluate("document.querySelector('[data-compare-result] .strip').textContent"), /With 20 kW moved from 2 pm to 11 am for 4 hours, on weekdays\./);
      await browser.evaluate("document.querySelector('[data-line=demand] [data-show-ms]').click()");
      await waitFor(browser, `document.querySelector('[data-chart]').dataset.highlight === '${ms}'`);
      // The first utility listed is shown on arrival, then the chosen one: no other utility's rates are fetched.
      const fetched = [...new Set(log.map((u) => new URL(u, server.url).pathname).filter((p) => p.startsWith('/bills/rates/')))].sort();
      assert.deepEqual(fetched, ['/bills/rates/1015.json', '/bills/rates/44372.json']);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
