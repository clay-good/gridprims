// Accessibility and mobile gates on every built page, both themes (foundation
// task 8.5): the audit, no sideways scroll at every breakpoint, keyboard
// reachability, and screen-reader pacing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { browserPages } from '../../browser/pages.mjs';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const pages = browserPages(out);
const WIDTHS = [320, 360, 768, 1024, 1280];
// The audit is test code, not part of the site, so the test server adds it as a route.
const routes = { '/verify/browser/a11y-audit.mjs': { body: readFileSync(join(import.meta.dirname, '../../browser/a11y-audit.mjs')), type: 'text/javascript' } };
const settled = `new Promise((r) => { const f = () => document.documentElement.dataset.shellReady ? setTimeout(r, 100) : setTimeout(f, 20); f(); })`;

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: every page passes the audit in both themes and never scrolls sideways`, { skip, timeout: 300_000 }, async () => {
    const server = await serve(out, { routes });
    const browser = await launch(kind);
    const failures = [];
    try {
      for (const theme of ['light', 'dark']) {
        await browser.goto(`${server.url}/`);
        await browser.evaluate(`localStorage.setItem('gridprims-theme', '${theme}')`);
        for (const p of pages) {
          await browser.setViewport(1280, 900);
          await browser.goto(server.url + p);
          await browser.evaluate(settled);
          for (const problem of await browser.evaluate(`import('/verify/browser/a11y-audit.mjs').then((m) => m.audit())`)) failures.push(`${theme} ${p}: ${problem}`);
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

  test(`${kind}: keyboard reaches every control on the workbench and the calculator`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out, { routes });
    const browser = await launch(kind);
    try {
      for (const p of ['/files/', '/tools/calc/energy-units/convert/']) {
        await browser.goto(server.url + p);
        await waitFor(browser, 'document.documentElement.dataset.ready');
        const unreachable = await browser.evaluate(`[...document.querySelectorAll('main button, main a[href], main input:not([type=hidden]), main select, main summary')].filter((el) => (el.offsetWidth || el.offsetHeight) && el.tabIndex < 0).map((el) => el.outerHTML.slice(0, 80))`);
        assert.deepEqual(unreachable, [], p);
        // The dropzone's chooser is a real button, so Enter opens the file picker.
        if (p === '/files/') assert.equal(await browser.evaluate(`document.querySelector('[data-choose]').tagName`), 'BUTTON');
      }
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: screen readers hear the answer once, 500 ms after typing settles`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out, { routes });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/tools/calc/energy-units/convert/`);
      await waitFor(browser, 'document.documentElement.dataset.ready');
      const log = await browser.evaluate(`(async () => {
        const live = document.querySelector('[data-announce]');
        const seen = [];
        new MutationObserver(() => seen.push([performance.now(), live.textContent])).observe(live, { childList: true, characterData: true, subtree: true });
        const input = document.querySelector('#in-value');
        const t0 = performance.now();
        for (let i = 1; i <= 10; i++) { input.value = String(i); input.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); }
        const typed = performance.now();
        await new Promise((r) => setTimeout(r, 900));
        return { seen: seen.map(([t, x]) => [Math.round(t - typed), x]), typedAfter: Math.round(typed - t0) };
      })()`);
      assert.equal(log.seen.length, 1, `announced ${log.seen.length} times: ${JSON.stringify(log.seen)}`);
      assert.ok(log.seen[0][0] >= 400, `announced ${log.seen[0][0]} ms after the last keystroke`);
      assert.equal(log.seen[0][1], '10 MWh is 34.12 MMBtu.');
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

for (const kind of ['chrome', 'firefox']) {
  test(`${kind}: at 320 px the limits page's first screen states the summary and the invitation to report`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 60_000 }, async () => {
    const server = await serve(out, { routes });
    const browser = await launch(kind);
    try {
      await browser.setViewport(320, 640);
      await browser.goto(`${server.url}/limits/`);
      await browser.evaluate(settled);
      const box = await browser.evaluate(`(() => { const s = document.querySelector('main .strip'); const r = s.getBoundingClientRect(); return { bottom: r.bottom, text: s.textContent }; })()`);
      assert.ok(box.bottom <= 640, `the summary ends ${Math.round(box.bottom)} px down, below the first screen`);
      assert.match(box.text, /screening estimates.*problem reports.*Tell us when a number looks wrong/s);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

test('chrome: pages print without the rail or controls, keeping the answer and the strip', { skip: !findBrowser('chrome') && 'chrome is not installed (print emulation needs the DevTools Protocol)', timeout: 60_000 }, async () => {
  const server = await serve(out, { routes });
  const browser = await launch('chrome');
  try {
    for (const p of ['/limits/', '/tools/calc/energy-units/convert/']) {
      await browser.goto(server.url + p);
      await browser.evaluate(settled);
      await browser.cdp('Emulation.setEmulatedMedia', { media: 'print' });
      const shown = await browser.evaluate(`({ rail: getComputedStyle(document.querySelector('.rail')).display, command: getComputedStyle(document.querySelector('.command')).display, strip: getComputedStyle(document.querySelector('.strip')).display, over: document.documentElement.scrollWidth - window.innerWidth })`);
      assert.deepEqual([shown.rail, shown.command], ['none', 'none'], p);
      assert.notEqual(shown.strip, 'none', p);
      await browser.cdp('Emulation.setEmulatedMedia', { media: '' });
    }
  } finally {
    await browser.close();
    await server.close();
  }
});
