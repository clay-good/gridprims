// The 200-page entity sweep in real browsers (public grid data task 7.2):
// the accessibility audit and no sideways scroll at 320 px on each, and the
// reference-profile budgets on ten.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { entitySample } from '../../browser/pages.mjs';
import { findBrowser, launch } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { applyReferenceProfile, BUDGETS, jsGzipBytes } from '../../lib/reference-profile.mjs';
import { tempDir } from '../../lib/temp.mjs';

const out = tempDir('gridprims-dist-');
await build({ outDir: out });
const sample = entitySample(out);
const routes = { '/verify/browser/a11y-audit.mjs': { body: readFileSync(join(import.meta.dirname, '../../browser/a11y-audit.mjs')), type: 'text/javascript' } };
const settled = `new Promise((r) => { const f = () => document.documentElement.dataset.shellReady ? setTimeout(r, 50) : setTimeout(f, 20); f(); })`;

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;
  test(`${kind}: 200 sampled entity pages pass the audit and never scroll sideways at 320 px`, { skip, timeout: 600_000 }, async () => {
    const server = await serve(out, { routes });
    const browser = await launch(kind);
    const failures = [];
    try {
      for (const p of sample) {
        await browser.setViewport(1280, 900);
        await browser.goto(server.url + p);
        await browser.evaluate(settled);
        for (const problem of await browser.evaluate(`import('/verify/browser/a11y-audit.mjs').then((m) => m.audit())`)) failures.push(`${p}: ${problem}`);
        await browser.setViewport(320, 800);
        const over = await browser.evaluate('document.documentElement.scrollWidth - window.innerWidth');
        if (over > 0) failures.push(`${p} at 320 px scrolls sideways by ${over} px`);
      }
      assert.deepEqual(failures, []);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}

test('chrome reference profile: ten entity pages show their heading within 1.5 s with the JavaScript budget', { skip: !findBrowser('chrome') && 'chrome is not installed', timeout: 300_000 }, async () => {
  const server = await serve(out);
  const chrome = await launch('chrome');
  try {
    await chrome.setViewport(412, 823);
    await applyReferenceProfile(chrome);
    for (const p of sample.filter((_, i) => i % 20 === 0)) {
      chrome.requests.length = 0;
      await chrome.goto(server.url + p);
      const lcp = await chrome.evaluate(`new Promise((r) => new PerformanceObserver((l) => { const e = l.getEntries(); r(e[e.length - 1].startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }))`);
      const js = jsGzipBytes(chrome.requests, server.url, out);
      console.log(`BUDGET entity ${p} first-answer ${lcp.toFixed(0)} ms, JS ${js.bytes} bytes gzip`);
      assert.ok(lcp <= BUDGETS.firstAnswerMs, `${p}: ${lcp.toFixed(0)} ms`);
      assert.ok(js.bytes <= BUDGETS.toolPageJsGzipBytes, `${p}: ${js.bytes} bytes of JavaScript`);
    }
  } finally {
    await chrome.close();
    await server.close();
  }
});
