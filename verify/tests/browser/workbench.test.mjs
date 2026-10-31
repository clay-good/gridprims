// The file workbench in each engine (foundation tasks 6.2, 6.3, 6.5): sample
// on arrival, a dropped file parsed in a worker, receipt choices re-running
// the read, refusals, keep-this-file consent, and the drag message.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { findBrowser, launch } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { DIR } from '../../fixtures/intake/make.mjs';
import { foreign } from '../../lib/requests.mjs';
import { offsetMinutes } from '../../../parsers/time.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
build({ outDir: out });
const ready = 'new Promise((r) => { const f = () => document.documentElement.dataset.ready ? r() : setTimeout(f, 20); f(); })';
const text = (sel) => `document.querySelector(${JSON.stringify(sel)}).textContent.trim().replace(/\\s+/g, ' ')`;
const settle = (ms = 400) => `new Promise((r) => setTimeout(r, ${ms}))`;

/** Put a file into the page's file input, as choosing it would. */
const choose = (name, b64, type = 'text/csv') => `(() => {
  const bytes = Uint8Array.from(atob('${b64}'), (c) => c.charCodeAt(0));
  const dt = new DataTransfer();
  dt.items.add(new File([bytes], '${name}', { type: '${type}' }));
  const input = document.querySelector('[data-file]');
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
})()`;
const fixture = (f) => readFileSync(join(DIR, f)).toString('base64');

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: the workbench opens on the labeled sample, reads a dropped file, and re-runs on a receipt change`, { skip, timeout: 120_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await browser.evaluate(ready);
      assert.match(await browser.evaluate(text('[data-strip]')), /Sample file/);
      assert.match(await browser.evaluate(text('[data-sentence]')), /^Your peak was 166 kW on Jun 10, 2026 at 2:30 pm\.$/);
      assert.equal(await browser.evaluate(`document.querySelector('[data-progress]').hidden`), true);

      await browser.evaluate(choose('iso-timestamp.csv', fixture('iso-timestamp.csv')));
      await browser.evaluate(settle(800));
      assert.equal(await browser.evaluate(`document.querySelector('[data-strip]')`), null, 'no sample strip on the user\'s file');
      assert.match(await browser.evaluate(text('[data-receipt]')), /iso-timestamp\.csv/);
      assert.match(await browser.evaluate(text('[data-receipt]')), /Read on this device\. Nothing was uploaded\./);
      const peakMs = `Number(document.querySelector('[data-output=peak]').dataset.ms)`;
      const before = await browser.evaluate(peakMs);

      // Change the time zone on the receipt: every time shown moves with it.
      const zone = await browser.evaluate(`document.querySelector('[data-choice=zone]').value`);
      const other = zone === 'America/New_York' ? 'America/Los_Angeles' : 'America/New_York';
      await browser.evaluate(`(() => { const s = document.querySelector('[data-choice=zone]'); s.value = '${other}'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await browser.evaluate(settle(800));
      assert.equal(await browser.evaluate(`document.querySelector('[data-choice=zone]').value`), other);
      // The file's wall-clock times are read in the new zone, so the instant of the peak moves by the zone difference.
      const shift = (await browser.evaluate(peakMs)) - before;
      const jan = Date.UTC(2026, 0, 1);
      assert.equal(shift, (offsetMinutes(zone, jan) - offsetMinutes(other, jan)) * 60_000, 'the peak instant moved by the zone difference');

      // Interval-ending stamps are detected and can be switched.
      await browser.evaluate(choose('hour-ending-1-24.csv', fixture('hour-ending-1-24.csv')));
      await browser.evaluate(settle(800));
      assert.match(await browser.evaluate(text('[data-receipt]')), /timestamps mark the end of each interval \(hour numbers 1 to 24\)/);
      assert.equal(await browser.evaluate(`document.querySelector('[data-choice=stampsMark]').value`), 'end');

      assert.deepEqual(foreign(browser.requests, server.url), []);
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: a PDF is refused plainly, the drag message promises nothing leaves, and reload forgets the file`, { skip, timeout: 90_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await browser.evaluate(ready);
      await browser.evaluate(choose('bill.pdf', Buffer.from('%PDF-1.7 a bill').toString('base64'), 'application/pdf'));
      await browser.evaluate(settle(600));
      assert.match(await browser.evaluate(text('[data-error]')), /PDF bills are not read yet.*How to download your data/);
      assert.match(await browser.evaluate(text('[data-strip]')), /Sample file/, 'the previous result stays');

      await browser.evaluate(`dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }))`);
      assert.equal(await browser.evaluate(`document.querySelector('[data-overlay]').hidden`), false);
      assert.match(await browser.evaluate(text('[data-overlay]')), /Nothing leaves this tab/);
      await browser.evaluate(`dispatchEvent(new DragEvent('dragleave', { bubbles: true }))`);

      await browser.evaluate(choose('iso-timestamp.csv', fixture('iso-timestamp.csv')));
      await browser.evaluate(settle(800));
      await browser.goto(`${server.url}/files/`);
      await browser.evaluate(ready);
      assert.match(await browser.evaluate(text('[data-strip]')), /Sample file/, 'a reload without consent shows the sample');
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: "Keep this file" survives a reload, and erase in settings removes it`, { skip, timeout: 90_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await browser.evaluate(ready);
      await browser.evaluate(choose('iso-timestamp.csv', fixture('iso-timestamp.csv')));
      await browser.evaluate(settle(800));
      await browser.evaluate(`(() => { const k = document.querySelector('[data-keep]'); k.checked = true; k.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await browser.evaluate(settle(300));
      await browser.goto(`${server.url}/files/`);
      await browser.evaluate(ready);
      assert.match(await browser.evaluate(text('[data-receipt]')), /iso-timestamp\.csv/);
      assert.equal(await browser.evaluate(`document.querySelector('[data-keep]').checked`), true);

      await browser.goto(`${server.url}/settings/`);
      await browser.evaluate(ready);
      assert.match(await browser.evaluate(text('[data-stored]')), /gridprims-files/);
      await browser.evaluate(`document.querySelector('[data-erase]').click()`);
      await browser.evaluate(`document.querySelector('[data-erase-yes]').click()`);
      await browser.evaluate(settle(400));
      await browser.goto(`${server.url}/files/`);
      await browser.evaluate(ready);
      assert.match(await browser.evaluate(text('[data-strip]')), /Sample file/);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
