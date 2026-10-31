// The section menu below 768 px, the 404 in the browser, and the
// pseudo-locale layout sweep (site-experience tasks 1.1, 1.3, 2.2).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { browserPages } from '../../browser/pages.mjs';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { walk } from '../../lib/walk.mjs';
import { foreign } from '../../lib/requests.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
await build({ outDir: out });
const pseudo = mkdtempSync(join(tmpdir(), 'gridprims-pseudo-'));
await build({ outDir: pseudo, pseudo: true });
const shell = 'new Promise((r) => { const f = () => document.documentElement.dataset.shellReady ? setTimeout(r, 100) : setTimeout(f, 20); f(); })';

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: below 768 px the sections fold into a keyboard menu`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.setViewport(360, 740);
      await browser.goto(`${server.url}/grid/`);
      await browser.evaluate(shell);
      const shown = () => browser.evaluate(`getComputedStyle(document.querySelector('#nav-list')).display`);
      assert.equal(await shown(), 'none');
      await browser.evaluate(`document.querySelector('[data-menu]').click()`);
      assert.notEqual(await shown(), 'none');
      assert.equal(await browser.evaluate(`document.querySelector('[data-menu]').getAttribute('aria-expanded')`), 'true');
      assert.equal(await browser.evaluate(`document.activeElement.textContent`), 'Home', 'focus moves into the menu');
      await browser.evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
      assert.equal(await shown(), 'none');
      assert.equal(await browser.evaluate(`document.activeElement.dataset.menu !== undefined`), true, 'Escape returns focus to the button');
      await browser.setViewport(1024, 740);
      assert.notEqual(await shown(), 'none', 'the full rail returns at 768 px and up');
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: the 404 suggests the closest tool and sends the path nowhere`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/404.html`);
      await browser.evaluate(`history.replaceState(null, '', '/tools/calc/energy-unit/conver/')`);
      await browser.evaluate(`import('/site/pages/not-found.js?x').then(() => true)`);
      await waitFor(browser, `document.querySelector('[data-suggestions] a')`);
      assert.equal(await browser.evaluate(`document.querySelector('[data-suggestions] a').getAttribute('href')`), '/tools/calc/energy-units/convert/');
      assert.ok(!browser.requests.some((u) => u.includes('conver/')), 'no request names the requested path');
      assert.deepEqual(foreign(browser.requests, server.url), []);
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: in the pseudo-locale no page overflows at 320 or 1280 px`, { skip, timeout: 180_000 }, async () => {
    const server = await serve(pseudo);
    const browser = await launch(kind);
    const failures = [];
    try {
      for (const p of browserPages(pseudo)) {
        for (const w of [320, 1280]) {
          await browser.setViewport(w, 800);
          await browser.goto(server.url + p);
          await browser.evaluate(shell);
          const r = await browser.evaluate(`(() => {
            const over = document.documentElement.scrollWidth - window.innerWidth;
            const clipped = [...document.querySelectorAll('main *, header *, footer *')].filter((el) => {
              const s = getComputedStyle(el);
              if (el.closest('.table-wrap, pre, svg') || s.display === 'none' || s.overflowX !== 'visible') return false;
              return el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0;
            }).map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
            return { over, clipped: [...new Set(clipped)].slice(0, 5) };
          })()`);
          if (r.over > 0) failures.push(`${p} at ${w} px scrolls sideways by ${r.over} px`);
          if (r.clipped.length) failures.push(`${p} at ${w} px: text overflows ${r.clipped.join(', ')}`);
        }
      }
      assert.deepEqual(failures, []);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
