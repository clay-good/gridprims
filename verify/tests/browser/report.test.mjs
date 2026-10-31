// The report dialog end to end (foundation task 9.3), through the real Worker:
// the default payload holds no inputs and no file data, the preview is exact,
// a sent report returns its id, and an agent's prepared report opens for review.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serveWorker } from '../../lib/worker-server.mjs';
import { createServer } from '../../../mcp/protocol.mjs';
import { DIR } from '../../fixtures/intake/make.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
await build({ outDir: out });
const preview = `JSON.parse(document.querySelector('[data-report-preview]').textContent)`;

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: the report dialog previews exactly what is sent, and a sent report returns its id`, { skip, timeout: 90_000 }, async () => {
    const server = await serveWorker(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/tools/calc/energy-units/convert/#value=7&from=therm&to=kWh`);
      await waitFor(browser, 'document.documentElement.dataset.ready');
      await browser.evaluate(`document.querySelector('[data-strip] [data-report]').click()`);
      assert.equal(await browser.evaluate(`document.querySelector('[data-report-dialog]').open`), true);
      assert.deepEqual(await browser.evaluate(preview), {
        toolId: 'calc.energy-units.convert', toolVersion: '0.1.0', datasets: [],
        pageUrl: `${server.url}/tools/calc/energy-units/convert/`, message: '',
      }, 'default payload: ids, versions, the page without its fragment, an empty message');

      await browser.evaluate(`(() => { const m = document.querySelector('[data-report-message]'); m.value = 'The therm figure looks off.'; m.dispatchEvent(new Event('input')); const a = document.querySelector('[data-report-attach]'); a.checked = true; a.dispatchEvent(new Event('change')); })()`);
      const withInputs = await browser.evaluate(preview);
      assert.deepEqual(withInputs.attachment.inputs, { value: '7', from: 'therm', to: 'kWh' });
      assert.equal(withInputs.message, 'The therm figure looks off.');

      await browser.evaluate(`document.querySelector('[data-report-send]').click()`);
      const status = await waitFor(browser, `(document.querySelector('[data-report-status]').textContent.match(/report id is (r_\\w+)/) ?? [])[1]`);
      assert.equal(server.env.DB.rows.length, 1);
      assert.equal(server.env.DB.rows[0].id, status);
      assert.deepEqual(JSON.parse(server.env.DB.rows[0].payload), withInputs, 'stored exactly what the preview showed');
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: on the workbench with a file loaded, the default report carries no file data`, { skip, timeout: 90_000 }, async () => {
    const server = await serveWorker(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await waitFor(browser, 'document.documentElement.dataset.ready');
      const b64 = readFileSync(join(DIR, 'iso-timestamp.csv')).toString('base64');
      const n = await browser.evaluate('Number(document.documentElement.dataset.loads)');
      await browser.evaluate(`(() => { const dt = new DataTransfer(); dt.items.add(new File([Uint8Array.from(atob('${b64}'), (c) => c.charCodeAt(0))], 'iso-timestamp.csv')); const i = document.querySelector('[data-file]'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await waitFor(browser, `Number(document.documentElement.dataset.loads) > ${n}`);
      await browser.evaluate(`document.querySelector('footer [data-report]').click()`);
      const p = await browser.evaluate(preview);
      assert.equal(p.attachment, undefined);
      assert.doesNotMatch(JSON.stringify(p), /2026-01-01|iso-timestamp/);
      assert.equal(await browser.evaluate(`document.querySelector('[data-report-attach-row]').hidden`), true, 'nothing to attach on the workbench');
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: a report an agent prepared opens for a person to review, with nothing sent`, { skip, timeout: 60_000 }, async () => {
    const server = await serveWorker(out);
    const browser = await launch(kind);
    try {
      const prepared = (await createServer().handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'gridprims_prepare_report', arguments: { tool: 'calc.energy-units.convert', message: 'Coal looks low.' } } })).result.structuredContent;
      await browser.goto(`${server.url}/report/#${prepared.link.split('#')[1]}`);
      await waitFor(browser, `document.querySelector('[data-report-dialog]').open`);
      assert.equal(await browser.evaluate(`document.querySelector('[data-report-agent]').hidden`), false);
      assert.deepEqual(await browser.evaluate(preview), prepared.payload);
      assert.equal(server.env.DB.rows.length, 0);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
