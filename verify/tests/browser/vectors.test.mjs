// The bill test vectors run on the visitor's device (add-tariff-conformance-suite 2.6, "Visitor runs the
// suite"): on /data/ground-truth/ the button downloads the latest release, and every vector shows pass, fail,
// or skipped with the commission's bill and our engine's, in real browsers, matching the release gate.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';
import { runVector } from '../../../core/lib/run-vector.mjs';

const out = await sharedSite();
const release = JSON.parse(readFileSync(join(out, 'data/ground-truth/vectors.json'), 'utf8'));
const expected = release.vectors.map(runVector);

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: every vector runs on the device and shows its result beside the commission's bill`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/data/ground-truth/`);
      await waitFor(browser, "document.querySelector('[data-vector-run] button')");
      await browser.evaluate("document.querySelector('[data-vector-run] button').click()");
      await waitFor(browser, 'document.documentElement.dataset.vectorsRun');
      assert.equal(Number(await browser.evaluate('document.documentElement.dataset.vectorsRun')), release.vectors.length);
      const rows = JSON.parse(await browser.evaluate("JSON.stringify([...document.querySelectorAll('[data-run]')].map((r) => [r.dataset.run, r.dataset.status, r.cells[2].textContent, r.cells[3].textContent]))"));
      assert.deepEqual(rows.map(([id, status]) => [id, status]), expected.map((r) => [r.id, r.status]));
      for (const [id, , expectedText, computedText] of rows) {
        const r = expected.find((x) => x.id === id);
        assert.equal(expectedText, `$${r.expected.toFixed(2)}`);
        assert.equal(computedText, `$${r.computed.toFixed(2)}`);
      }
      assert.match(await browser.evaluate("document.querySelector('[data-run-summary]').textContent"), new RegExp(`Release ${release.version.replace(/\./g, '\\.')} on this device: ${expected.filter((r) => r.status === 'pass').length} passed, 0 failed, 0 skipped`));
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
