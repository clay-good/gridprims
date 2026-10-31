// Performance budgets on the reference profile (foundation tasks 2.1, 6.2,
// 8.5). Chrome only: the throttling is a DevTools Protocol feature. Each run
// prints its measurements as BUDGET lines for the record.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { findBrowser, launch } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { applyReferenceProfile, BUDGETS } from '../../lib/reference-profile.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
build({ outDir: out });
const skip = !findBrowser('chrome') && 'chrome is not installed';
const ready = 'new Promise((r) => { const f = () => document.documentElement.dataset.ready ? r() : setTimeout(f, 20); f(); })';

/** Compressed bytes of every script a page loaded. */
export function jsGzipBytes(requests, origin, dist) {
  const scripts = [...new Set(requests.filter((u) => u.startsWith(origin) && /\.(m?js)$/.test(new URL(u).pathname)).map((u) => new URL(u).pathname))];
  return { files: scripts.length, bytes: scripts.reduce((n, p) => n + gzipSync(readFileSync(join(dist, p))).length, 0) };
}

test('reference profile: the tool page answers within 1.5 s with at most 150 KB of compressed JavaScript', { skip, timeout: 120_000 }, async () => {
  const server = await serve(out);
  const chrome = await launch('chrome');
  try {
    await chrome.setViewport(412, 823);
    await applyReferenceProfile(chrome);
    await chrome.goto(`${server.url}/tools/calc/energy-units/convert/`);
    await chrome.evaluate(ready);
    const lcp = await chrome.evaluate(`new Promise((r) => new PerformanceObserver((l) => { const e = l.getEntries(); r({ ms: e[e.length - 1].startTime, el: e[e.length - 1].element?.className ?? '' }); }).observe({ type: 'largest-contentful-paint', buffered: true }))`);
    const js = jsGzipBytes(chrome.requests, server.url, out);
    console.log(`BUDGET tool-page first-answer ${lcp.ms.toFixed(0)} ms (element "${lcp.el}"), JS ${js.bytes} bytes gzip in ${js.files} files`);
    assert.ok(lcp.ms <= BUDGETS.firstAnswerMs, `first answer at ${lcp.ms.toFixed(0)} ms, over ${BUDGETS.firstAnswerMs} ms`);
    assert.ok(js.bytes <= BUDGETS.toolPageJsGzipBytes, `JavaScript ${js.bytes} bytes gzip, over ${BUDGETS.toolPageJsGzipBytes}`);
  } finally {
    await chrome.close();
    await server.close();
  }
});

test('reference profile: a year of 15-minute rows parses in the worker within 1 s', { skip, timeout: 120_000 }, async () => {
  const lines = ['Interval Start,kWh'];
  const t0 = Date.parse('2025-01-01T00:00:00Z');
  for (let i = 0; i < 35_040; i++) lines.push(`${new Date(t0 + i * 900_000).toISOString().slice(0, 16).replace('T', ' ')},${((i * 37) % 50) / 10}`);
  writeFileSync(join(out, 'year.csv'), lines.join('\n'));
  const server = await serve(out);
  const chrome = await launch('chrome');
  try {
    await chrome.goto(`${server.url}/files/`);
    await chrome.evaluate(ready);
    await chrome.cdp('Emulation.setCPUThrottlingRate', { rate: 4 });
    const ms = await chrome.evaluate(`(async () => {
      const bytes = new Uint8Array(await (await fetch('/year.csv')).arrayBuffer());
      const w = new Worker('/site/pages/intake-worker.js', { type: 'module' });
      // Warm the worker's module graph first, as a returning visitor's cache would.
      await new Promise((r) => { w.onmessage = (e) => e.data.type !== 'progress' && r(); w.postMessage({ bytes: new TextEncoder().encode('Interval Start,kWh\\n2026-01-01 00:00,1\\n2026-01-01 00:15,1\\n').buffer, name: 'warm.csv', choices: { zone: 'America/Phoenix' } }); });
      const t = performance.now();
      const m = await new Promise((r) => { w.onmessage = (e) => e.data.type !== 'progress' && r(e.data); w.postMessage({ bytes: bytes.buffer, name: 'year.csv', choices: { zone: 'America/Phoenix' } }); });
      return { wall: performance.now() - t, parseMs: m.result.receipt.parseMs, rows: m.result.series[0].startMs.length };
    })()`);
    console.log(`BUDGET parse-35040-rows worker ${ms.parseMs} ms in intake, ${ms.wall.toFixed(0)} ms round trip, 4x CPU slowdown`);
    assert.equal(ms.rows, 35_040);
    assert.ok(ms.wall <= BUDGETS.parse35040RowsMs, `parse took ${ms.wall.toFixed(0)} ms, over ${BUDGETS.parse35040RowsMs} ms`);
  } finally {
    await chrome.close();
    await server.close();
  }
});

test('the budget check fails and names the overage on an oversized page', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gridprims-big-'));
  let big = '';
  for (let i = 0; i < 60_000; i++) big += `export const v${i} = ${(i * 7919) % 104729};\n`;
  writeFileSync(join(dir, 'big.js'), big);
  const js = jsGzipBytes(['http://x/big.js'], 'http://x', dir);
  assert.ok(js.bytes > BUDGETS.toolPageJsGzipBytes, `fixture is only ${js.bytes} bytes`);
});
