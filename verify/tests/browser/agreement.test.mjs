// One file, one set of numbers (foundation task 3.6): the browser workbench
// and the MCP server report the same peak and time for the same file, before
// and after a receipt change.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { createServer } from '../../../mcp/protocol.mjs';
import { DIR } from '../../fixtures/intake/make.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
build({ outDir: out });
const FILES = ['smart-meter-texas.csv', 'conflicting-duplicate.csv', 'dst-fall-back.csv'];
const ZONE = 'America/Chicago';

async function mcpPeak(file, zone) {
  const s = createServer({ allowDirs: [realpathSync(DIR)] });
  const r = await s.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'gridprims_analyze_file', arguments: { path: file, zone } } });
  const series = r.result.structuredContent.series[0];
  return { kw: series.peakKw, at: Date.parse(series.peakStartUtc) };
}

for (const kind of ['chrome', 'firefox']) {
  test(`${kind}: the workbench and the MCP server agree on the peak, before and after a time-zone change`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 120_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await waitFor(browser, 'document.documentElement.dataset.ready');
      for (const file of FILES) {
        for (const zone of [ZONE, 'America/New_York']) {
          const b64 = readFileSync(join(DIR, file)).toString('base64');
          const loads = () => browser.evaluate('Number(document.documentElement.dataset.loads)');
          let n = await loads();
          await browser.evaluate(`(() => {
            const dt = new DataTransfer();
            dt.items.add(new File([Uint8Array.from(atob('${b64}'), (c) => c.charCodeAt(0))], '${file}'));
            const input = document.querySelector('[data-file]'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
          })()`);
          await waitFor(browser, `Number(document.documentElement.dataset.loads) > ${n}`);
          n = await loads();
          await browser.evaluate(`(() => { const s = document.querySelector('[data-choice=zone]'); s.value = '${zone}'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
          await waitFor(browser, `Number(document.documentElement.dataset.loads) > ${n}`);
          const web = await browser.evaluate(`({ kw: document.querySelector('[data-output=peak]').firstChild.textContent, at: Number(document.querySelector('[data-output=peak]').dataset.ms) })`);
          const agent = await mcpPeak(file, zone);
          assert.equal(web.at, agent.at, `${file} ${zone}: peak time`);
          assert.equal(Number(web.kw.replace(/,/g, '')), Number(agent.kw.toPrecision(3)), `${file} ${zone}: peak kW`);
        }
      }
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
