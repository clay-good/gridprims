// The revenue requirement explainer's Form 1 prefill in real browsers
// (ratepayer tools task 1.3): Georgia Power fills from its FERC Form 1,
// labeled total-company; Austin Energy, which does not file, starts empty.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const ferc1 = JSON.parse(readFileSync(join(out, 'bills/ferc1.json'), 'utf8'));

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: Georgia Power prefills from FERC Form 1, labeled total-company; Austin Energy says it does not file`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    const pick = async (zip, name) => {
      await browser.evaluate(`(() => { document.querySelector('#ferc1-zip').value = '${zip}'; document.querySelector('[data-ferc1-picker] [data-picker-zip]').requestSubmit(); })()`);
      await waitFor(browser, `[...document.querySelectorAll('#ferc1-utility option')].some((o) => o.textContent.startsWith(${JSON.stringify(name)}))`);
      await browser.evaluate(`(() => { const s = document.querySelector('#ferc1-utility'); s.value = [...s.options].find((o) => o.textContent.startsWith(${JSON.stringify(name)})).value; s.dispatchEvent(new Event('change')); })()`);
    };
    try {
      await browser.goto(`${server.url}/tools/ratepayer/revenue-requirement/explain/`);
      await waitFor(browser, "document.documentElement.dataset.ready && document.querySelector('[data-ferc1-picker]').dataset.ready");
      await pick('30303', 'Georgia Power');
      await waitFor(browser, "document.querySelector('[data-ferc1-picker]').dataset.chosen === '7140'");
      assert.equal(await browser.evaluate("document.querySelector('#in-rateBase').value"), String(Math.round(ferc1.utilities['7140'].rateBase)));
      assert.match(await browser.evaluate("document.querySelector('[data-ferc1-picker] [data-picker-note]').textContent"), /total-company, approximate, from Form 1/);
      await pick('78701', 'Austin Energy');
      await waitFor(browser, "document.querySelector('[data-ferc1-picker]').dataset.chosen === '1015'");
      assert.match(await browser.evaluate("document.querySelector('[data-ferc1-picker] [data-picker-note]').textContent"), /does not file FERC Form 1/);
      assert.equal(await browser.evaluate("document.querySelector('#in-rateBase').value"), '');
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
