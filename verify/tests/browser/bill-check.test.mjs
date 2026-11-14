// The bill check page in real browsers (household bill check task 2.1): ZIP
// 78701 lists Austin Energy's residential rates with their URDB dates, a
// chosen rate prices the entered period, a tariff entered by hand gives the
// spec's $115.00, overlapping periods are asked about before anything is
// priced, and the ZIP appears in no request.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const PAGE = '/tools/household/bill-totals/check/';
const austin = JSON.parse(readFileSync(join(out, 'bills/tariffs/TX.json'), 'utf8'))[1015];

const setPeriods = (text) => `(() => { const a = document.querySelector('#in-periods'); a.value = ${JSON.stringify(text)}; a.dispatchEvent(new Event('input', { bubbles: true })); })()`;
const answer = "document.querySelector('[data-output=total]')?.textContent ?? ''";

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: ZIP 78701 lists Austin Energy's rates with their dates, and the chosen rate prices the period`, { skip, timeout: 60_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r.url) });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}${PAGE}`);
      await waitFor(browser, "document.documentElement.dataset.ready && document.querySelector('[data-tariff-picker]').dataset.ready");
      log.length = 0;
      browser.requests.length = 0;
      await browser.evaluate("(() => { document.querySelector('#picker-zip').value = '78701'; document.querySelector('[data-picker-zip]').requestSubmit(); })()");
      await waitFor(browser, "!document.querySelector('[data-picker-rate-field]').hidden");
      const utilities = await browser.evaluate("[...document.querySelectorAll('#picker-utility option')].map((o) => o.textContent)");
      assert.ok(utilities.includes('Austin Energy · TX'), utilities.join('; '));
      await browser.evaluate("(() => { const s = document.querySelector('#picker-utility'); s.value = [...s.options].find((o) => o.textContent === 'Austin Energy · TX').value; s.dispatchEvent(new Event('change')); })()");
      await waitFor(browser, "document.documentElement.dataset.tariffChosen === " + JSON.stringify(austin[0].label));
      const rates = await browser.evaluate("[...document.querySelectorAll('#picker-rate option')].map((o) => o.textContent)");
      assert.equal(rates.length, austin.length);
      for (const r of austin) assert.ok(rates.some((x) => x.startsWith(r.name) && x.includes(`effective ${r.effective}`)), r.name);

      const periods = '2026-03-01 to 2026-03-30, 800 kWh, paid $131.40';
      await browser.evaluate(setPeriods(periods));
      const { manifest, impl } = getTool('household.bill-totals.check');
      const expected = runTool(manifest, impl, { periods, tariff: JSON.stringify(austin[0].tariff), prorate: 'yes' });
      assert.equal(expected.status, 'ok');
      await waitFor(browser, `${answer} === ${JSON.stringify(`$${expected.outputs.total.display}`)}`);

      const seen = [...log, ...browser.requests];
      assert.deepEqual(seen.filter((u) => u.includes('78701')), [], 'the ZIP appears in no request');
      const tariffShards = [...new Set(log.map((u) => new URL(u, server.url).pathname).filter((p) => p.startsWith('/bills/tariffs/')))];
      assert.deepEqual(tariffShards, ['/bills/tariffs/TX.json'], 'only the utility\'s state');
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: from a data guide, the utility arrives in the fragment and its rates open without a ZIP`, { skip, timeout: 60_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r.url) });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}${PAGE}#utility=1015&state=TX`);
      await waitFor(browser, "document.documentElement.dataset.utilityPreset === '1015'");
      await waitFor(browser, "document.documentElement.dataset.tariffChosen === " + JSON.stringify(austin[0].label));
      assert.deepEqual(await browser.evaluate("[...document.querySelectorAll('#picker-utility option')].map((o) => o.textContent)"), ['Austin Energy · TX']);
      assert.equal(await browser.evaluate("document.querySelector('[data-picker-utility-field]').hidden"), false);
      // The fragment is never sent: no request names the utility.
      assert.deepEqual(log.filter((u) => /utility=|1015/.test(u)), []);
      // An unknown utility or a malformed state leaves the ZIP form as it was.
      await browser.goto(`${server.url}/limits/`);
      await browser.goto(`${server.url}${PAGE}#utility=999999999&state=TX`);
      await waitFor(browser, "document.documentElement.dataset.ready && document.querySelector('[data-tariff-picker]').dataset.ready");
      await browser.evaluate('new Promise((r) => setTimeout(r, 300))');
      assert.equal(await browser.evaluate("document.querySelector('[data-picker-utility-field]').hidden"), true);
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: a tariff entered by hand prices 800 kWh at $115.00, and overlapping periods are asked about first`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}${PAGE}`);
      await waitFor(browser, "document.documentElement.dataset.ready && document.querySelector('[data-tariff-picker]').dataset.ready");
      await browser.evaluate(`(() => {
        const m = document.querySelector('[data-picker-manual]'); m.open = true;
        for (const [n, v] of [['fixed', '10'], ['rate', '12'], ['tier', '500'], ['rate2', '15']]) m.querySelector('[name=' + n + ']').value = v;
        m.querySelector('[name=rate2]').dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      await browser.evaluate(setPeriods('2026-03-01 to 2026-03-30, 800 kWh'));
      await waitFor(browser, `${answer} === '$115.00'`);
      // A Texas plan from its EFL plus delivery: 9.5 cents, $9.95 base, $4.39 and 5.4 cents delivery, at 1,000 kWh.
      await browser.evaluate(`(() => {
        const r = document.querySelector('[data-picker-retail]'); r.open = true;
        for (const [n, v] of [['energy', '9.5'], ['base', '9.95'], ['tduMonthly', '4.39'], ['tduKwh', '5.4']]) r.querySelector('[name=' + n + ']').value = v;
        r.querySelector('[name=tduKwh]').dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      await browser.evaluate(setPeriods('2026-07-01 to 2026-07-31, 1,000 kWh'));
      await waitFor(browser, `${answer} === '$163.34'`);
      assert.deepEqual(await browser.evaluate("[...document.querySelectorAll('[data-tariff-picker] a')].map((a) => a.href).filter((h) => !h.startsWith(location.origin))"), ['https://www.powertochoose.org/'], 'the only provider-related element is a link to Power to Choose');
      await browser.evaluate(setPeriods('2026-03-01 to 2026-03-30, 800 kWh\n2026-03-26 to 2026-04-28, 700 kWh'));
      await waitFor(browser, "document.querySelector('[data-answer] .sign').dataset.state === 'invalid'");
      assert.match(await browser.evaluate("document.querySelector('#in-periods-error').textContent"), /Lines 1 and 2 overlap by 5 days\. Which dates are correct\?/);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: on "Is my use high?", ZIP 78701 and Austin Energy fill EIA-861's averages, and 14,400 kWh compares with them`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/tools/household/usage-benchmark/compare/`);
      await waitFor(browser, "document.documentElement.dataset.ready && document.querySelector('[data-average-picker]').dataset.ready");
      await browser.evaluate("(() => { document.querySelector('#averages-zip').value = '78701'; document.querySelector('[data-average-picker] [data-picker-zip]').requestSubmit(); })()");
      await waitFor(browser, "!document.querySelector('[data-average-picker] [data-picker-utility-field]').hidden");
      await browser.evaluate("(() => { const s = document.querySelector('#averages-utility'); s.value = [...s.options].find((o) => o.textContent === 'Austin Energy · TX').value; s.dispatchEvent(new Event('change')); })()");
      await waitFor(browser, "document.documentElement.dataset.averagesChosen === '1015'");
      const tx = JSON.parse(readFileSync(join(out, 'lookup/TX.json'), 'utf8'));
      assert.equal(await browser.evaluate("document.querySelector('#in-utilityAverage').value"), String(tx.utilities[1015].resKwh));
      assert.equal(await browser.evaluate("document.querySelector('#in-stateAverage').value"), String(tx.resKwh));
      await browser.evaluate(setPeriods('2025-01-01 to 2025-12-31, 14,400 kWh, confirmed'));
      const pct = Math.round((14400 / tx.utilities[1015].resKwh - 1) * 1000) / 10;
      await waitFor(browser, `document.querySelector('[data-output=vsUtility]')?.textContent === ${JSON.stringify(`${pct}%`)}`);
      assert.match(await browser.evaluate("document.querySelector('[data-answer] .sentence').textContent"), /\(EIA-861, 2025\)/);
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: "Is my use high?" opened from a utility page fills that utility's averages without a ZIP`, { skip, timeout: 60_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r.url) });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/tools/household/usage-benchmark/compare/#utility=1015&state=TX`);
      await waitFor(browser, "document.documentElement.dataset.averagesChosen === '1015'");
      const tx = JSON.parse(readFileSync(join(out, 'lookup/TX.json'), 'utf8'));
      assert.equal(await browser.evaluate("document.querySelector('#in-utilityAverage').value"), String(tx.utilities[1015].resKwh));
      assert.equal(await browser.evaluate("document.querySelector('#in-stateAverage').value"), String(tx.resKwh));
      assert.deepEqual(log.filter((u) => /utility=|1015/.test(u)), [], 'the fragment is never sent');
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
