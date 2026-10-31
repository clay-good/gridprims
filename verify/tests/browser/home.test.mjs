// The home page and catalog in real browsers (site experience tasks 3.1 and
// 3.2): the phone first viewport shows the command bar and both lanes, and
// the catalog's filters work on the device.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../../../site/build.mjs';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { tempDir } from '../../lib/temp.mjs';

const out = tempDir('gridprims-dist-');
await build({ outDir: out });
const settled = `new Promise((r) => { const f = () => document.documentElement.dataset.shellReady ? setTimeout(r, 50) : setTimeout(f, 20); f(); })`;

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: at 360 × 640 the first viewport shows the command bar and both lanes with a cell each`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.setViewport(360, 640);
      await browser.goto(`${server.url}/`);
      await browser.evaluate(settled);
      const tops = await browser.evaluate(`(() => {
        const top = (el) => el ? el.getBoundingClientRect().top + window.scrollY : null;
        return { command: top(document.querySelector('#command-input')),
          home: top(document.querySelector('[data-lane=home] .tool-cell a')), work: top(document.querySelector('[data-lane=work] .tool-cell a')), height: window.innerHeight };
      })()`);
      for (const k of ['command', 'home', 'work']) assert.ok(tops[k] !== null && tops[k] < tops.height, `${k} at ${tops[k]} px, past the ${tops.height} px viewport`);
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: filtering the catalog by "bill totals" hides every tool and says none match`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/tools/`);
      await waitFor(browser, 'document.documentElement.dataset.ready');
      const visible = () => browser.evaluate(`[...document.querySelectorAll('[data-catalog] > li')].filter((c) => !c.hidden).length`);
      const all = await visible();
      assert.ok(all >= 3);
      const pick = (name, value) => browser.evaluate(`(() => { const s = document.querySelector('select[name=${name}]'); s.value = '${value}'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await pick('needs', 'bill');
      assert.equal(await visible(), 0);
      assert.equal(await browser.evaluate(`document.querySelector('[data-catalog-empty]').hidden`), false);
      await pick('needs', 'zip');
      assert.equal(await visible(), 1, 'the ZIP lookup');
      await pick('needs', '');
      assert.equal(await visible(), all);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
