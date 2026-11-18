// The project list in a real browser (projects/pipeline-pages): filters run on
// rows already on the page, say what they found, and send nothing anywhere.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const setFilter = (name, value) => `(() => { const s = document.querySelector('[data-project-filters] [name=${name}]'); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`;
const visible = "[...document.querySelectorAll('[data-projects] tbody tr')].filter((r) => r.offsetParent !== null)";
const count = "document.querySelector('[data-project-count]').textContent";

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: filters narrow the list, report the count, clear, and send nothing`, { skip, timeout: 90_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r.url) });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/projects/tx/`);
      await waitFor(browser, "document.querySelector('[data-projects]').dataset.ready === 'true'");
      const all = await browser.evaluate(`${visible}.length`);
      assert.ok(all > 100, `${all} rows`);
      log.length = 0;
      browser.requests.length = 0;

      await browser.evaluate(setFilter('stage', 'building'));
      await browser.evaluate(setFilter('tech', 'Solar Photovoltaic'));
      const narrowed = await browser.evaluate(`${visible}.map((r) => [r.dataset.stage, r.dataset.tech])`);
      assert.ok(narrowed.length > 0 && narrowed.length < all);
      for (const [stage, tech] of narrowed) assert.ok(stage === 'building' && tech.split('|').includes('Solar Photovoltaic'));
      const line = await browser.evaluate(count);
      assert.match(line, new RegExp(`^Showing ${narrowed.length} projects?, [\\d,]+ MW$`));
      assert.equal(await browser.evaluate("document.querySelector('[data-project-count]').getAttribute('role')"), 'status', 'a screen reader is told the new count');

      await browser.evaluate(setFilter('size', '500'));
      const big = await browser.evaluate(`${visible}.map((r) => Number(r.dataset.mw))`);
      for (const mw of big) assert.ok(mw >= 500, `${mw} MW`);

      // A combination nothing matches says so, hides the table, and offers one way back.
      const emptyCounty = await browser.evaluate("(() => { const rows = [...document.querySelectorAll('[data-projects] tbody tr')]; return [...document.querySelector('[name=county]').options].map((o) => o.value).filter(Boolean).find((c) => !rows.some((r) => r.dataset.county === c && r.dataset.stage === 'approved')); })()");
      await browser.evaluate(setFilter('tech', ''));
      await browser.evaluate(setFilter('size', ''));
      await browser.evaluate(setFilter('stage', 'approved'));
      await browser.evaluate(setFilter('county', emptyCounty));
      assert.equal(await browser.evaluate(count), 'No reported project matches these filters.');
      assert.equal(await browser.evaluate("document.querySelector('[data-project-table]').hidden"), true);
      await browser.evaluate("document.querySelector('[data-project-clear]').click()");
      assert.equal(await browser.evaluate(`${visible}.length`), all);
      assert.equal(await browser.evaluate("document.querySelector('[data-project-clear]').hidden"), true);
      assert.equal(await browser.evaluate("document.activeElement.name"), 'stage', 'focus returns to the first filter');

      // The service worker may still be caching the shell in the background, so the check is on what a request carries.
      const choices = ['building', 'approved', 'Solar', emptyCounty, 'stage=', 'tech=', 'county=', 'size='];
      for (const u of [...log, ...browser.requests]) {
        assert.ok(!choices.some((c) => u.includes(c)), `request carries a filter choice: ${u}`);
        assert.ok(!/\/projects\/[a-z]{2}\.json/.test(u), `filtering fetched data: ${u}`);
      }
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: at 320 px the list fits, with every value readable`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.setViewport(320, 720);
      await browser.goto(`${server.url}/projects/tx/`);
      await waitFor(browser, "document.querySelector('[data-projects]').dataset.ready === 'true'");
      assert.ok(await browser.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'no sideways scroll');
      const clipped = await browser.evaluate("[...document.querySelectorAll('.project-table td')].slice(0, 200).filter((c) => c.getBoundingClientRect().right > window.innerWidth).length");
      assert.equal(clipped, 0);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

test('chrome: with JavaScript off the full list stays and the filters stay hidden', { skip: !findBrowser('chrome') && 'chrome is not installed', timeout: 60_000 }, async () => {
  const server = await serve(out);
  const browser = await launch('chrome');
  try {
    await browser.cdp('Emulation.setScriptExecutionDisabled', { value: true });
    await browser.goto(`${server.url}/projects/dc/`);
    await browser.cdp('Emulation.setScriptExecutionDisabled', { value: false });
    assert.ok(await browser.evaluate("document.querySelectorAll('[data-projects] tbody tr').length > 0"));
    assert.equal(await browser.evaluate("document.querySelector('[data-project-filters]').hidden"), true);
  } finally {
    await browser.close();
    await server.close();
  }
});
