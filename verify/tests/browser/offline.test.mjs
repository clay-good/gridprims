// Offline after one visit (foundation task 8.4): with the server gone, the
// workbench still opens and parses a file, and the calculator still answers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { findBrowser, launch } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { DIR } from '../../fixtures/intake/make.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
await build({ outDir: out });
const ready = 'new Promise((r) => { const f = () => document.documentElement.dataset.ready ? r() : setTimeout(f, 20); f(); })';
const controlled = `new Promise((r) => { const f = () => navigator.serviceWorker.controller ? r(true) : setTimeout(f, 50); f(); })`;

for (const kind of ['chrome', 'firefox']) {
  test(`${kind}: after one visit, the workbench parses a file and the calculator answers with no network`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 120_000 }, async () => {
    const server = await serve(out);
    const port = new URL(server.url).port;
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await browser.evaluate(ready);
      await browser.evaluate('navigator.serviceWorker.ready.then(() => true)');
      await browser.goto(`${server.url}/files/`); // a second load is controlled by the worker
      await browser.evaluate(controlled);
      await server.close(); // airplane mode for this origin

      await browser.goto(`http://127.0.0.1:${port}/files/`);
      await browser.evaluate(ready);
      const b64 = readFileSync(join(DIR, 'iso-timestamp.csv')).toString('base64');
      await browser.evaluate(`(() => {
        const dt = new DataTransfer();
        dt.items.add(new File([Uint8Array.from(atob('${b64}'), (c) => c.charCodeAt(0))], 'iso-timestamp.csv'));
        const input = document.querySelector('[data-file]'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
      await browser.evaluate('new Promise((r) => setTimeout(r, 1000))');
      assert.match(await browser.evaluate(`document.querySelector('[data-receipt]').textContent`), /iso-timestamp\.csv/);
      assert.match(await browser.evaluate(`document.querySelector('[data-receipt]').textContent`), /288/);

      await browser.goto(`http://127.0.0.1:${port}/tools/calc/energy-units/convert/#value=2&from=therm&to=kWh`);
      await browser.evaluate(ready);
      assert.equal(await browser.evaluate(`document.querySelector('[data-answer] .sentence').textContent`), '2 therms is 58.61 kWh.');
    } finally {
      await browser.close();
    }
  });
}
