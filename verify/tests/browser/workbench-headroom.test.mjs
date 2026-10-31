// The workbench's service headroom panel in real browsers
// (add-electrification-tools 1.2): the two-week sample is too short, a
// four-month 15-minute file qualifies for the 30-day period with every step
// shown, and a site with solar gets no 30-day figure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';
import { headroom } from '../../../core/lib/service-headroom.mjs';

const out = await sharedSite();
const FILE = join(import.meta.dirname, '../../fixtures/bill/files/ercot-4cp-2025.csv');
const peakKw = Math.max(...readFileSync(FILE, 'utf8').trim().split('\n').slice(1).map((l) => Number(l.split(',')[1]) * 4));
const want = headroom({ maxKw: peakKw, powerFactor: 0.95, volts: 480, phase: 3, ratingA: 2000 }).headroomA.toFixed(1);
const run = (fields) => `(() => { const f = document.querySelector('[data-headroom-form]'); ${fields} f.requestSubmit(); })()`;

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: service headroom: too little data, then a 30-day figure with its steps, then no figure for a solar site`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await waitFor(browser, "document.documentElement.dataset.ready === 'true' && document.querySelector('[data-headroom]').dataset.ready && document.querySelector('#cp-year option')");
      // No edition is chosen for the user.
      await browser.evaluate(run(''));
      await waitFor(browser, "document.querySelector('[data-headroom]').dataset.ran === '1'");
      assert.match(await browser.evaluate("document.querySelector('[data-headroom-result]').textContent"), /Choose the NEC edition/);
      // The sample covers two weeks.
      await browser.evaluate(run("f.edition.value = '2023';"));
      await waitFor(browser, "document.querySelector('[data-headroom]').dataset.ran === '2'");
      assert.match(await browser.evaluate("document.querySelector('[data-headroom-result]').textContent"), /At least 30 days of 15-minute data, or 12 months, are needed/);

      const b64 = readFileSync(FILE).toString('base64');
      await browser.evaluate(`(() => {
        const dt = new DataTransfer();
        dt.items.add(new File([Uint8Array.from(atob('${b64}'), (c) => c.charCodeAt(0))], 'ercot-4cp-2025.csv'));
        const input = document.querySelector('[data-file]'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
      await waitFor(browser, "/ercot-4cp-2025\\.csv/.test(document.querySelector('[data-receipt]').textContent)");
      await browser.evaluate(run("f.volts.value = '480'; f.phase.value = '3'; f.rating.value = '2000'; f.pf.value = '0.95'; f.edition.value = '2023';"));
      await waitFor(browser, "document.querySelector('[data-headroom]').dataset.ran === '3'");
      const text = await browser.evaluate("document.querySelector('[data-headroom-result]').textContent");
      assert.equal(await browser.evaluate("document.querySelector('[data-headroom-amps]').textContent"), `${Number(want).toLocaleString('en-US', { minimumFractionDigits: 1 })} A`);
      assert.match(text, /days in a row/);
      assert.match(text, /2023 NEC 220\.87/);
      assert.match(text, /authority having jurisdiction/);
      assert.ok(await browser.evaluate("!!document.querySelector('[data-balanced]')"), 'the balanced-phase note sits beside the maximum demand');
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-headroom-steps] li').length"), 8);
      assert.ok(await browser.evaluate("!!document.querySelector('[data-headroom-print]')"));
      // With solar, the 30-day figure is withheld.
      await browser.evaluate(run('f.generation.checked = true;'));
      await waitFor(browser, "document.querySelector('[data-headroom]').dataset.ran === '4'");
      assert.match(await browser.evaluate("document.querySelector('[data-headroom-result]').textContent"), /does not allow the 30-day option/);
      assert.equal(await browser.evaluate("document.querySelector('[data-headroom-amps]')"), null);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
