// The workbench's bill on a meter file in real browsers (load and bill
// analyzer task 3.3): the sample file priced on an Austin Energy commercial
// rate, month by month, with each demand line naming the interval that set it
// and showing it on the chart; only the rate files of the utilities shown are fetched.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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
      assert.equal(await browser.evaluate("document.querySelector('#cp-program').value"), 'ercot-4cp', 'Austin Energy is in ERCOT');
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
      // A proposal: the fixed charge raised by $10 a month shows in the difference list and the impact, and the draft states it.
      assert.equal(await browser.evaluate("document.querySelector('[data-proposal]').hidden"), false);
      const fixedNow = Number(await browser.evaluate("document.querySelector('[data-path=fixed]').value"));
      await browser.evaluate(`(() => { document.querySelector('[data-path=fixed]').value = '${fixedNow + 10}'; document.querySelector('[data-proposal-run]').click(); })()`);
      await waitFor(browser, "document.querySelector('[data-proposal]').dataset.compared === '1'");
      assert.match(await browser.evaluate("document.querySelector('[data-differences]').textContent"), /^Fixed charge: \$[\d.,]+ → \$[\d.,]+ per month$/);
      assert.match(await browser.evaluate("document.querySelector('[data-proposal-diff]').textContent"), /^\+\$10\.00$/, 'the sample covers one month');
      await browser.evaluate("(() => { const f = document.querySelector('[data-draft-form]'); f.regulator.value = 'Public Utility Commission of Texas'; f.docket.value = '55555'; f.requestSubmit(); })()");
      await waitFor(browser, "document.querySelector('[data-proposal]').dataset.draft");
      const draft = await browser.evaluate("document.querySelector('[data-proposal]').dataset.draft");
      assert.match(draft, /^To the Public Utility Commission of Texas, regarding docket 55555:/);
      assert.match(draft, /\[Your own views go here\.\]/);
      assert.doesNotMatch(draft, /sample-office-15min/);
      // The comparison card: the top three rates, the period, the URDB date, and gridprims.com.
      await browser.evaluate("document.querySelector('[data-copy-card=ranking]').click()");
      await waitFor(browser, "document.querySelector('[data-bill]').dataset.card?.startsWith('What this load would have cost')");
      const card = await browser.evaluate("document.querySelector('[data-bill]').dataset.card");
      assert.match(card, /^What this load would have cost on Austin Energy's rates, 2026-06-01 to 2026-06-14:\n1\. /);
      assert.match(card, /snapshot of 2026-10-30\.\ngridprims\.com · workbench /);
      await browser.evaluate("(() => { const f = document.querySelector('[data-shift]'); f.kw.value = '20'; f.from.value = '14'; f.to.value = '11'; f.requestSubmit(); })()");
      await waitFor(browser, "document.querySelector('[data-bill]').dataset.compared === '2'");
      assert.match(await browser.evaluate("document.querySelector('[data-compare-result] .strip').textContent"), /With 20 kW moved from 2 pm to 11 am for 4 hours, on weekdays\./);
      // The battery screen on the same rate: savings, the upper-bound label, and what it leaves out.
      await browser.evaluate("(() => { const f = document.querySelector('[data-screen]'); f.power.value = '20'; f.energy.value = '40'; f.cost.value = '30000'; f.requestSubmit(); })()");
      await waitFor(browser, "document.querySelector('[data-bill]').dataset.screened === '1'");
      assert.match(await browser.evaluate("document.querySelector('[data-screen-savings]').textContent"), /^\$[\d,]+\.\d\d$/);
      assert.match(await browser.evaluate("document.querySelector('[data-upper-bound]').textContent"), /upper bound/);
      assert.match(await browser.evaluate("document.querySelector('[data-excluded]').textContent"), /^Not modeled: auxiliary load, forecast error/);
      assert.match(await browser.evaluate("document.querySelector('[data-payback]').textContent"), /^Simple payback: [\d.,]+ years\.$|^With no annual savings/);
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

// A utility with an EV plan among its residential rates, a ZIP it serves, and its name in the lookup.
const evUtility = (() => {
  const shards = readdirSync(join(out, 'lookup')).filter((f) => /^[A-Z]{2}\.json$/.test(f)).map((f) => JSON.parse(readFileSync(join(out, 'lookup', f), 'utf8')));
  for (const f of readdirSync(join(out, 'bills/rates')).sort()) {
    const id = Number(f.replace('.json', ''));
    const res = JSON.parse(readFileSync(join(out, 'bills/rates', f), 'utf8')).rates.filter((r) => r.sector === 'Residential');
    const ev = res.find((r) => /electric vehicle/i.test(r.name) && !r.unmodeled.length);
    const plain = res.find((r) => /^Residential( Service)?$/i.test(r.name) && !r.unmodeled.length);
    if (!ev || !plain) continue;
    for (const sh of shards) {
      if (!sh.utilities[id]) continue;
      const zip = Object.entries(sh.zctas).find(([, cs]) => cs.length === 1 && sh.counties[cs[0][0]]?.utilities.includes(id))?.[0];
      if (zip) return { id, ev, plain, zip, option: `${sh.utilities[id].name} · ${sh.state}` };
    }
  }
  return null;
})();

for (const kind of ['chrome', 'firefox']) {
  const skip = (!findBrowser(kind) && `${kind} is not installed`) || (!evUtility && 'no utility with an EV plan');

  test(`${kind}: household plans: an EV plan waits under "Requires" until "I have an electric vehicle" is checked`, { skip, timeout: 90_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await waitFor(browser, "document.documentElement.dataset.ready === 'true' && document.querySelector('[data-bill]').dataset.ready");
      await browser.evaluate(`(() => { document.querySelector('#bill-zip').value = '${evUtility.zip}'; document.querySelector('[data-bill-zip]').requestSubmit(); })()`);
      await waitFor(browser, `[...document.querySelectorAll('#bill-utility option')].some((o) => o.textContent === ${JSON.stringify(evUtility.option)})`);
      await browser.evaluate(`(() => { const s = document.querySelector('#bill-utility'); s.value = [...s.options].find((o) => o.textContent === ${JSON.stringify(evUtility.option)}).value; s.dispatchEvent(new Event('change')); })()`);
      await waitFor(browser, `[...document.querySelectorAll('#bill-rate option')].some((o) => o.textContent.startsWith(${JSON.stringify(evUtility.plain.name)}))`);
      await browser.evaluate(`(() => { const s = document.querySelector('#bill-rate'); s.value = [...s.options].find((o) => o.textContent.startsWith(${JSON.stringify(evUtility.plain.name + ' · ')})).value; s.dispatchEvent(new Event('change')); })()`);
      await waitFor(browser, `document.querySelector('[data-bill]').dataset.priced === ${JSON.stringify(evUtility.plain.id)}`);
      assert.equal(await browser.evaluate("document.querySelector('[data-conditions]').hidden"), false);
      const runs = Number(await browser.evaluate("document.querySelector('[data-bill]').dataset.compared ?? 0"));
      await browser.evaluate("document.querySelector('[data-compare-run]').click()");
      await waitFor(browser, `document.querySelector('[data-bill]').dataset.compared === '${runs + 1}'`);
      assert.ok(await browser.evaluate(`!!document.querySelector('[data-requires] [data-rate-id="${evUtility.ev.id}"]')`), 'the EV plan is under Requires');
      assert.match(await browser.evaluate("document.querySelector('[data-compare-result]').textContent"), /Based on your past 12 months of use\./);
      await browser.evaluate("(() => { const b = document.querySelector('[data-conditions] input[value=electric-vehicle]'); b.checked = true; b.dispatchEvent(new Event('change', { bubbles: true })); })()");
      await waitFor(browser, `document.querySelector('[data-bill]').dataset.compared === '${runs + 2}'`);
      assert.ok(await browser.evaluate(`!!document.querySelector('[data-ranking] [data-rate-id="${evUtility.ev.id}"]')`), 'now ranked');
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
