// The reference tool page in each installed engine: worked state on first
// paint, live recompute, share links, no third-party requests, 320 px.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { findBrowser, launch } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
build({ outDir: out });
const PATH = '/tools/calc/energy-units/convert/';
const ready = 'new Promise((r) => { const f = () => document.documentElement.dataset.ready ? r(true) : setTimeout(f, 20); f(); })';
const text = (sel) => `document.querySelector(${JSON.stringify(sel)}).textContent.trim().replace(/\\s+/g, ' ')`;

for (const kind of ['chrome', 'firefox']) {
  test(`${kind}: the converter opens worked, recomputes live, and shares by fragment`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 90_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(server.url + PATH);
      await browser.evaluate(ready);
      assert.equal(await browser.evaluate(text('[data-answer] .number')), '40.95MMBtu');
      assert.match(await browser.evaluate(text('[data-strip]')), /Example values/);

      // Change the amount: the answer updates with no submit, and the example label goes away.
      await browser.evaluate(`(() => { const i = document.querySelector('#in-value'); i.value = '1'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      assert.equal(await browser.evaluate(text('[data-answer] .sentence')), '1 MWh is 3.412 MMBtu.');
      assert.doesNotMatch(await browser.evaluate(text('[data-strip]')), /Example values/);
      assert.equal(await browser.evaluate('location.hash'), '#value=1&from=MWh&to=MMBtu');

      // A typed word gives a field message, not a number.
      await browser.evaluate(`(() => { const i = document.querySelector('#in-value'); i.value = 'twelve'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      assert.equal(await browser.evaluate(`document.querySelector('#in-value').getAttribute('aria-invalid')`), 'true');
      assert.match(await browser.evaluate(text('#in-value-error')), /Type a number/);

      // A link pasted while the page is open applies without a reload.
      await browser.evaluate(`location.hash = 'value=2&from=therm&to=kWh'`);
      await browser.evaluate('new Promise((r) => setTimeout(r, 50))');
      assert.equal(await browser.evaluate(text('[data-answer] .sentence')), '2 therms is 58.61 kWh.');

      // A shared link reproduces inputs and result in a fresh load.
      await browser.goto('about:blank');
      await browser.goto(`${server.url}${PATH}#value=1000&from=ft3-natural-gas&to=Btu`);
      await browser.evaluate(ready);
      assert.equal(await browser.evaluate(text('[data-answer] .sentence')), '1,000 ft³ of natural gas is about 1,036,000 Btu.');
      assert.equal(await browser.evaluate(`document.querySelector('#in-from').value`), 'ft3-natural-gas');

      // Every request went to our own origin.
      const foreign = browser.requests.filter((u) => !u.startsWith(server.url) && !u.startsWith('data:') && u !== 'about:blank');
      assert.deepEqual(foreign, []);

      // No sideways scroll at 320 px.
      await browser.setViewport(320, 720);
      assert.ok(await browser.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'page scrolls sideways at 320 px');
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: a saved light theme wins over a dark device, and the toggle saves the choice`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(server.url + '/');
      await browser.evaluate(`localStorage.setItem('gridprims-theme', 'light')`);
      await browser.goto(server.url + '/');
      assert.equal(await browser.evaluate('document.documentElement.dataset.theme'), 'light');
      await browser.evaluate(`document.querySelector('[data-theme-toggle]').click()`);
      assert.equal(await browser.evaluate(`localStorage.getItem('gridprims-theme')`), 'dark');
      assert.equal(await browser.evaluate(`getComputedStyle(document.body).backgroundColor`), 'rgb(17, 22, 19)');
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
