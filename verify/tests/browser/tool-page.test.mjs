// The reference tool page in each installed engine: worked state on first
// paint, live recompute, share links, no third-party requests, 320 px.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
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
      assert.equal(await browser.evaluate(`document.querySelector('[data-strip]')?.textContent ?? ''`).then((x) => /Example values/.test(x)), false);
      assert.equal(await browser.evaluate(`Boolean(document.querySelector('[data-report-answer]'))`), true, 'a report control stays beside every answer');
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
      // No saved choice: light unless the device asks for dark.
      if (!(await browser.evaluate(`matchMedia('(prefers-color-scheme: dark)').matches`))) {
        assert.equal(await browser.evaluate('document.documentElement.dataset.theme ?? null'), null);
        assert.equal(await browser.evaluate(`getComputedStyle(document.body).backgroundColor`), 'rgb(243, 245, 242)');
      }
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

for (const kind of ['chrome', 'firefox']) {
  test(`${kind}: typing "12 MWh to MMBtu" and Enter opens the converter filled in`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(server.url + '/limits/');
      await browser.evaluate('new Promise((r) => { const f = () => document.documentElement.dataset.shellReady ? r() : setTimeout(f, 20); f(); })');
      await browser.evaluate(`(async () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
        const i = document.activeElement;
        if (i.id !== 'command-input') throw new Error('slash did not focus the command bar');
        i.value = '12 MWh to MMBtu';
        i.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      const preview = await waitFor(browser, `(document.querySelector('#command-option-0 .hint')?.textContent ?? '') && document.querySelector('#command-option-0').textContent`);
      assert.match(preview, /Energy unit converter = 40\.95 MMBtu/);
      await browser.evaluate(`document.querySelector('#command-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
      await waitFor(browser, `location.pathname === '${PATH}' && document.documentElement.dataset.ready`);
      assert.equal(await browser.evaluate('location.pathname'), PATH);
      assert.equal(await browser.evaluate(text('[data-answer] .sentence')), '12 MWh is 40.95 MMBtu.');
      assert.equal(await browser.evaluate(`document.querySelector('#in-value').value`), '12');
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

for (const kind of ['chrome', 'firefox']) {
  test(`${kind}: every worked example gives the same structured result in the page as through the MCP server`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 60_000 }, async () => {
    const { createServer } = await import('../../../mcp/protocol.mjs');
    const { TOOLS } = await import('../../../core/tools/index.mjs');
    const mcp = createServer();
    const cases = TOOLS.flatMap(({ manifest }) => manifest.examples.map((ex) => ({ tool: manifest.id, inputs: ex.inputs })));
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(server.url + '/');
      const inPage = await browser.evaluate(`(async () => {
        const { runTool } = await import('/core/contract/run.mjs');
        const { getTool } = await import('/core/tools/index.mjs');
        return ${JSON.stringify(cases)}.map((c) => { const t = getTool(c.tool); return runTool(t.manifest, t.impl, c.inputs); });
      })()`);
      let id = 0;
      for (const [i, c] of cases.entries()) {
        const r = await mcp.handle({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name: 'gridprims_run', arguments: c } });
        assert.deepEqual(inPage[i], r.result.structuredContent, `${c.tool} ${JSON.stringify(c.inputs)}`);
      }
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
