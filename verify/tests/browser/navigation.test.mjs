// The section menu below 768 px, the 404 in the browser, and the
// pseudo-locale layout sweep (site-experience tasks 1.1, 1.3, 2.2).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { browserPages } from '../../browser/pages.mjs';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { walk } from '../../lib/walk.mjs';
import { foreign } from '../../lib/requests.mjs';
import { tempDir } from '../../lib/temp.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const pseudo = tempDir('gridprims-pseudo-');
await build({ outDir: pseudo, pseudo: true });
const shell = 'new Promise((r) => { const f = () => document.documentElement.dataset.shellReady ? setTimeout(r, 100) : setTimeout(f, 20); f(); })';

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: the rail carries what the site answers, no links and no menu, and the search bar works at every width`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      for (const w of [360, 1440]) {
        await browser.setViewport(w, 720);
        await browser.goto(`${server.url}/`);
        await waitFor(browser, "document.documentElement.dataset.shellReady === 'true'");
        assert.equal(await browser.evaluate("document.querySelectorAll('.rail nav a').length"), 0, `${w} px rail holds no links`);
        assert.equal(await browser.evaluate("!!document.querySelector('[data-menu]')"), false, `${w} px has no menu button`);
        // The description stands down on a phone (DESIGN.md Layout); the wordmark never does.
        const whatShown = await browser.evaluate("(() => { const el = document.querySelector('.rail-what'); return el ? el.getBoundingClientRect().width > 0 : false; })()");
        assert.equal(whatShown, w >= 720, `${w} px description visibility`);
        assert.ok(await browser.evaluate("document.querySelector('.rail .wordmark').getBoundingClientRect().width > 0"), `${w} px wordmark is visible`);
        // Breadth lives in the one centred search bar, which must be usable at both widths.
        assert.ok(await browser.evaluate("document.querySelector('.home-search #command-input').getBoundingClientRect().width > 0"), `${w} px search is visible`);
        assert.equal(await browser.evaluate("document.querySelectorAll('#command-input').length"), 1, `${w} px has one command input`);
      }
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
              // A listbox scrolls its own options: the select carries the overflow, so it is the one judged.
              if (el.closest('.table-wrap, pre, svg') || el.matches('option, optgroup') || s.display === 'none' || s.overflowX !== 'visible') return false;
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
