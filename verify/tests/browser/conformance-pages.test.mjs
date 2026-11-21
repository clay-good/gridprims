// DESIGN.md gates on the conformance pages (add-tariff-conformance-suite 4.3): /data/ground-truth/ and its
// scorecard pass the accessibility audit in both themes, never scroll sideways from 320 px up, let the
// keyboard reach every control, print without the rail and command bar while keeping the limits strip, and
// stay inside the page-weight budget.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { findBrowser, launch } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';
import { BUDGETS } from '../../lib/reference-profile.mjs';

const out = await sharedSite();
const PAGES = ['/data/ground-truth/', '/data/ground-truth/scorecard/'];
const WIDTHS = [320, 360, 768, 1024, 1280];
const routes = { '/verify/browser/a11y-audit.mjs': { body: readFileSync(join(import.meta.dirname, '../../browser/a11y-audit.mjs')), type: 'text/javascript' } };
const settled = `new Promise((r) => { const f = () => document.documentElement.dataset.shellReady ? setTimeout(r, 100) : setTimeout(f, 20); f(); })`;

test('page weight: each conformance page is inside the entity-page HTML budget', () => {
  for (const p of PAGES) {
    const bytes = gzipSync(readFileSync(join(out, p, 'index.html'))).length;
    assert.ok(bytes <= BUDGETS.entityPageHtmlGzipBytes, `${p}: ${bytes} bytes gzip`);
  }
});

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: the conformance pages pass the audit in both themes, never scroll sideways, and every control takes the keyboard`, { skip, timeout: 120_000 }, async () => {
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
      // The run panel's results table, once filled, must not push the page sideways at 320 px either.
      await browser.setViewport(320, 800);
      await browser.goto(`${server.url}/data/ground-truth/`);
      await browser.evaluate(settled);
      await browser.evaluate("document.querySelector('[data-vector-run] button').click()");
      await browser.evaluate("new Promise((r) => { const f = () => document.documentElement.dataset.vectorsRun ? r() : setTimeout(f, 20); f(); })");
      const over = await browser.evaluate('document.documentElement.scrollWidth - window.innerWidth');
      if (over > 0) failures.push(`the run results at 320 px scroll sideways by ${over} px`);
      assert.deepEqual(failures, []);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

test('chrome: the conformance pages print without the rail or command bar, keeping the limits strip', { skip: !findBrowser('chrome') && 'chrome is not installed (print emulation needs the DevTools Protocol)', timeout: 60_000 }, async () => {
  const server = await serve(out, { routes });
  const browser = await launch('chrome');
  try {
    for (const p of PAGES) {
      await browser.goto(server.url + p);
      await browser.evaluate(settled);
      await browser.cdp('Emulation.setEmulatedMedia', { media: 'print' });
      const shown = await browser.evaluate(`({ rail: getComputedStyle(document.querySelector('.rail')).display, command: getComputedStyle(document.querySelector('.command')).display, strip: getComputedStyle(document.querySelector('[data-limits]')).display })`);
      assert.deepEqual([shown.rail, shown.command], ['none', 'none'], p);
      assert.notEqual(shown.strip, 'none', p);
      await browser.cdp('Emulation.setEmulatedMedia', { media: '' });
    }
  } finally {
    await browser.close();
    await server.close();
  }
});
