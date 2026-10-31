// Privacy end to end (foundation tasks 5.2 to 5.4): the third-party request
// audit on every page, the sentinel egress test, and erasing local data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { walk } from '../../lib/walk.mjs';
import { findBrowser, launch } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { foreign, leaks } from '../../lib/requests.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
build({ outDir: out });
const pages = walk(out).filter((f) => f.endsWith('.html')).map((f) => `/${f.replace(/index\.html$/, '')}`);
const SENTINEL = '918273.645';

// A deliberately leaking page and a page that loads an external font, to prove the checks can fail.
writeFileSync(join(out, 'leak.html'), `<!doctype html><meta charset="utf-8"><input id="v"><script type="module">document.querySelector('#v').addEventListener('input', (e) => fetch('/collect?v=' + e.target.value));</script>`);
writeFileSync(join(out, 'font.html'), '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.example.invalid/css?family=X"><p>x</p>');

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: third-party audit: every page requests only our origin`, { skip, timeout: 120_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      for (const p of pages) {
        browser.requests.length = 0;
        await browser.goto(server.url + p);
        await browser.evaluate('new Promise((r) => setTimeout(r, 150))');
        assert.deepEqual(foreign(browser.requests, server.url), [], p);
        assert.equal(await browser.evaluate('document.cookie'), '', `${p} set a cookie`);
      }
      browser.requests.length = 0;
      await browser.goto(`${server.url}/font.html`);
      await browser.evaluate('new Promise((r) => setTimeout(r, 300))');
      assert.ok(foreign(browser.requests, server.url).length > 0, 'the audit must catch an external font');
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: sentinel egress: a sentinel typed into the calculator never reaches the network`, { skip, timeout: 90_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r) });
    const browser = await launch(kind);
    const type = (sel) => `(() => { const i = document.querySelector('${sel}'); i.value = '${SENTINEL}'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`;
    try {
      await browser.goto(`${server.url}/tools/calc/energy-units/convert/`);
      await browser.evaluate('new Promise((r) => { const f = () => document.documentElement.dataset.ready ? r() : setTimeout(f, 20); f(); })');
      await browser.evaluate(type('#in-value'));
      await browser.evaluate(`(() => { const i = document.querySelector('#command-input'); i.focus(); i.value = '${SENTINEL} MWh to MMBtu'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await browser.evaluate('new Promise((r) => setTimeout(r, 500))');
      assert.deepEqual(leaks(log, SENTINEL), []);
      assert.deepEqual(leaks(browser.requests.map((url) => ({ url })), SENTINEL), []);

      await browser.goto(`${server.url}/leak.html`);
      await browser.evaluate(type('#v'));
      await browser.evaluate('new Promise((r) => setTimeout(r, 300))');
      assert.ok(leaks(log, SENTINEL).length > 0, 'the sentinel test must catch a leaking page');
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: a fresh visit stores nothing, and erase removes everything we wrote`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    const ready = 'new Promise((r) => { const f = () => document.documentElement.dataset.ready ? r() : setTimeout(f, 20); f(); })';
    try {
      await browser.goto(`${server.url}/tools/calc/energy-units/convert/`);
      await browser.evaluate(ready);
      assert.equal(await browser.evaluate('localStorage.length + sessionStorage.length'), 0);
      await browser.evaluate(`(async () => { localStorage.setItem('gridprims-theme', 'dark'); sessionStorage.setItem('gridprims-x', '1'); await (await caches.open('gridprims-data-v1')).put('/x', new Response('x')); })()`);
      await browser.goto(`${server.url}/settings/`);
      await browser.evaluate(ready);
      assert.match(await browser.evaluate(`document.querySelector('[data-stored]').textContent`), /gridprims-theme/);
      await browser.evaluate(`document.querySelector('[data-erase]').click()`);
      await browser.evaluate(`document.querySelector('[data-erase-yes]').click()`);
      await browser.evaluate('new Promise((r) => setTimeout(r, 300))');
      assert.equal(await browser.evaluate('localStorage.length + sessionStorage.length'), 0);
      assert.deepEqual(await browser.evaluate('caches.keys()'), []);
      assert.equal(await browser.evaluate(`document.querySelector('[data-empty]').hidden`), false);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
