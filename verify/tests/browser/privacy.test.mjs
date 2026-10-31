// Privacy end to end (foundation tasks 5.2 to 5.4): the third-party request
// audit on every page, the sentinel egress test, and erasing local data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { walk } from '../../lib/walk.mjs';
import { findBrowser, launch } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { foreign, leaks } from '../../lib/requests.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
await build({ outDir: out });
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
      assert.deepEqual((await browser.evaluate('caches.keys()')).filter((k) => !k.startsWith('gridprims-shell-')), [], 'only the app shell cache is kept');
      assert.equal(await browser.evaluate(`document.querySelector('[data-empty]').hidden`), false);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

for (const kind of ['chrome', 'firefox']) {
  test(`${kind}: a dataset past its cadence shows the staleness note, computed on the device`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/data/eia-861/`);
      await browser.evaluate('new Promise((r) => { const f = () => document.documentElement.dataset.shellReady ? r() : setTimeout(f, 20); f(); })');
      const chip = `document.querySelector('[data-late-from]')`;
      const lateFrom = await browser.evaluate(`${chip}.dataset.lateFrom`);
      assert.equal(lateFrom, '2027-11-06', 'as of 2026-10-07, annual, not posted: due 2027-10-07, late from 2027-11-06');
      assert.equal(await browser.evaluate(`${chip}.hidden`), true, 'not late today');
      // Move the device clock past the due date: the same page now shows the note.
      await browser.evaluate(`(async () => { const real = Date; globalThis.Date = class extends real { constructor(...a) { super(...(a.length ? a : [real.parse('2027-12-01T00:00:00Z')])); } static now() { return real.parse('2027-12-01T00:00:00Z'); } }; await import('/site/pages/shell.js?again'); })()`);
      assert.equal(await browser.evaluate(`${chip}.hidden`), false);
      assert.match(await browser.evaluate(`${chip}.textContent`), /May be out of date\. The next release was due by Oct 7, 2027\. Last checked for an update: Oct 31, 2026\./);
      assert.deepEqual(foreign(browser.requests, server.url), [], 'no publisher request from a data page');
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

for (const kind of ['chrome', 'firefox']) {
  test(`${kind}: the limits page judges each scheduled job's staleness on the device`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/limits/`);
      await browser.evaluate('new Promise((r) => { const f = () => document.documentElement.dataset.shellReady ? r() : setTimeout(f, 20); f(); })');
      const rows = await browser.evaluate(`[...document.querySelectorAll('[data-health-row]')].map((c) => [c.dataset.lastSuccess, c.dataset.thresholdHours, c.textContent])`);
      const health = JSON.parse(readFileSync(join(out, 'health/pipeline.json'), 'utf8'));
      assert.equal(rows.length, health.workflows.length);
      for (const [last, hours, text] of rows) {
        const stalled = !last || Date.now() - Date.parse(last) > Number(hours) * 3_600_000;
        assert.match(text, stalled ? /^Stalled/ : /^On schedule$/);
      }
      // A month with no run: the same page, a later clock, every job reads stalled.
      await browser.evaluate(`(async () => { const real = Date; globalThis.Date = class extends real { static now() { return real.now() + 40 * 86400000; } }; await import('/site/pages/shell.js?later'); })()`);
      const later = await browser.evaluate(`[...document.querySelectorAll('[data-health-row]')].map((c) => c.textContent)`);
      assert.ok(later.every((x) => x.startsWith('Stalled')), later.join(' | '));
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
