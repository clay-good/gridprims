// The driver itself (foundation task 4.8): load a page, record its requests,
// resize to 320 px, in each installed engine.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findBrowser, fromBidi, launch } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';

const dir = mkdtempSync(join(tmpdir(), 'gridprims-driver-'));
writeFileSync(join(dir, 'index.html'), '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/a.css"><script type="module" src="/b.mjs"></script><p>hello</p>');
writeFileSync(join(dir, 'a.css'), 'p { color: green }');
writeFileSync(join(dir, 'b.mjs'), 'globalThis.loaded = 42; await fetch("/c.json");');
writeFileSync(join(dir, 'c.json'), '{}');

for (const kind of ['chrome', 'firefox']) {
  test(`${kind}: loads a page, records requests, and resizes to 320 px`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 60_000 }, async () => {
    const server = await serve(dir);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/`);
      assert.equal(await browser.evaluate('document.querySelector("p").textContent'), 'hello');
      assert.equal(await browser.evaluate('new Promise((r) => setTimeout(() => r(globalThis.loaded), 50))'), 42);
      const paths = browser.requests.map((u) => new URL(u).pathname);
      for (const p of ['/', '/a.css', '/b.mjs', '/c.json']) assert.ok(paths.includes(p), `${p} not recorded in ${paths}`);
      await browser.setViewport(320, 640);
      assert.equal(await browser.evaluate('window.innerWidth'), 320);
      assert.deepEqual(await browser.evaluate('({ a: [1, "x", null], b: { c: true } })'), { a: [1, 'x', null], b: { c: true } });
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

test('BiDi remote values convert to plain values', () => {
  assert.deepEqual(fromBidi({ type: 'object', value: [['a', { type: 'array', value: [{ type: 'number', value: 1 }, { type: 'number', value: 'NaN' }] }]] }), { a: [1, NaN] });
  assert.equal(fromBidi({ type: 'undefined' }), undefined);
});
