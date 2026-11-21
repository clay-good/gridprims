// DESIGN.md gates on the hosting-capacity directory (add-interconnection-screens 5.3 and 5.4): the audit in both
// themes, no sideways scroll from 320 px up with its wide table, and every link and control reachable by keyboard.

import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { findBrowser, launch } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const PAGES = ['/interconnect/hosting-capacity/', '/interconnect/inverter-settings/'];
const WIDTHS = [320, 360, 768, 1024, 1280];
const routes = { '/verify/browser/a11y-audit.mjs': { body: readFileSync(join(import.meta.dirname, '../../browser/a11y-audit.mjs')), type: 'text/javascript' } };
const settled = `new Promise((r) => { const f = () => document.documentElement.dataset.shellReady ? setTimeout(r, 100) : setTimeout(f, 20); f(); })`;

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: the hosting-capacity directory and the settings reference pass the audit in both themes, never scroll sideways, and every control takes the keyboard`, { skip, timeout: 120_000 }, async () => {
    const server = await serve(out, { routes });
    const browser = await launch(kind);
    const failures = [];
    try {
      for (const theme of ['light', 'dark']) {
        await browser.goto(`${server.url}/`);
        await browser.evaluate(`localStorage.setItem('gridprims-theme', '${theme}')`);
        for (const p of PAGES) {
          await browser.setViewport(1280, 900);
          await browser.goto(server.url + p);
          await browser.evaluate(settled);
          for (const problem of await browser.evaluate(`import('/verify/browser/a11y-audit.mjs').then((m) => m.audit())`)) failures.push(`${theme} ${p}: ${problem}`);
          const unreachable = await browser.evaluate(`[...document.querySelectorAll('main button, main a[href], main summary')].filter((el) => (el.offsetWidth || el.offsetHeight) && el.tabIndex < 0).length`);
          if (unreachable) failures.push(`${theme} ${p}: ${unreachable} controls the keyboard cannot reach`);
          for (const w of WIDTHS) {
            await browser.setViewport(w, 800);
            const over = await browser.evaluate('document.documentElement.scrollWidth - window.innerWidth');
            if (over > 0) failures.push(`${theme} ${p} at ${w} px scrolls sideways by ${over} px`);
          }
        }
      }
      assert.deepEqual(failures, []);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

