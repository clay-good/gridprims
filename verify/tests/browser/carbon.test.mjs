// The hourly carbon tools in real browsers (add-hourly-carbon 2.2 to 2.5):
// the cleanest-hours picker works from a region alone and fills the
// load-shift calculator, and the workbench's carbon panel computes the
// sample file's hourly CO2 in ERCOT with the timing and eGRID gaps, matches
// a flat clean block, and copies a card carrying the caveat and the labels.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';
import { CAVEAT, DRAFT_LABEL, PRODUCTION_LABEL, windows } from '../../../core/lib/hourly-carbon.mjs';

const out = await sharedSite();
const typical = JSON.parse(readFileSync(join(out, 'carbon/typical/ERCO.json'), 'utf8'));
const july = windows(typical.months[6]);
const clock = (h) => (h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h} am` : `${h - 12} pm`);

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: cleanest hours from a region alone: the July day, its windows, and the calculator filled`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/tools/carbon/load-shift/estimate/`);
      await waitFor(browser, "document.documentElement.dataset.ready && document.querySelector('[data-cleanest-picker]').dataset.ready && document.querySelector('[data-cleanest-region] option[value=ERCO]')");
      await browser.evaluate("(() => { const p = document.querySelector('[data-cleanest-picker]'); p.querySelector('[data-cleanest-month]').value = '7'; const r = p.querySelector('[data-cleanest-region]'); r.value = 'ERCO'; r.dispatchEvent(new Event('change')); })()");
      await waitFor(browser, "document.querySelector('[data-cleanest-picker]').dataset.chosen === 'ERCO' && document.querySelector('[data-cleanest-sentence]')");
      const sentence = await browser.evaluate("document.querySelector('[data-cleanest-sentence]').textContent");
      assert.match(sentence, new RegExp(`cleanest two hours in Electric Reliability Council of Texas, Inc\\. are typically ${clock(july.cleanest.from)} to ${clock(july.cleanest.to)}`));
      assert.match(sentence, new RegExp(`dirtiest ${clock(july.dirtiest.from)} to ${clock(july.dirtiest.to)}`));
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-cleanest-note] figure.chart path.series').length"), 3);
      assert.notEqual(await browser.evaluate("document.querySelector('#in-currentLbPerMwh').value"), '1000', 'the evening window\'s figure replaced the example');
      await waitFor(browser, "/metric tons of CO₂ a year/.test(document.querySelector('[data-answer] .sentence')?.textContent ?? '')");
      assert.match(await browser.evaluate("document.querySelector('[data-cleanest-note]').textContent"), /attributional/);
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: the workbench's hourly emissions on the sample file, a flat clean block, and the copied card`, { skip, timeout: 60_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/files/`);
      await waitFor(browser, "document.documentElement.dataset.ready === 'true' && document.querySelector('[data-carbon]').dataset.ready && document.querySelector('#carbon-region option[value=ERCO]')");
      await browser.evaluate("(() => { const f = document.querySelector('[data-carbon-form]'); f.region.value = 'ERCO'; f.subregion.value = 'ERCT'; f.requestSubmit(); })()");
      await waitFor(browser, "document.querySelector('[data-carbon]').dataset.ran === '1'");
      const text = await browser.evaluate("document.querySelector('[data-carbon-result]').textContent");
      assert.match(text, /Hour by hour, this load comes to [\d.,]+ metric tons of CO₂/);
      assert.match(text, /Timing: [+−][\d.]+%/);
      assert.match(text, /Region, basis, and year: [+−][\d.]+%/);
      assert.match(text, /4 intervals of each clock hour are summed and matched to the EIA hour with the same UTC start/);
      assert.ok(text.includes(CAVEAT));
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-carbon-month]').length"), 1);
      // A 1 MW block in every hour covers this office's load hour by hour.
      await browser.evaluate("(() => { const f = document.querySelector('[data-carbon-form]'); f.supply.value = 'block'; f.supply.dispatchEvent(new Event('change')); f.mw.value = '1'; f.requestSubmit(); })()");
      await waitFor(browser, "document.querySelector('[data-carbon]').dataset.ran === '2'");
      assert.match(await browser.evaluate("document.querySelector('[data-carbon-match]').textContent"), /covers 100\.0% of this load over the year, and 100\.0% hour by hour/);
      await browser.evaluate("document.querySelector('[data-copy-card=carbon]').click()");
      await waitFor(browser, "document.querySelector('[data-carbon]').dataset.card");
      const card = await browser.evaluate("document.querySelector('[data-carbon]').dataset.card");
      assert.ok(card.includes(CAVEAT) && card.includes(DRAFT_LABEL), 'the card carries the caveat and the draft-method label');
      assert.ok(!card.includes('4.50'), 'no reading from the file');
      assert.equal(card.includes(PRODUCTION_LABEL), card.includes('Combined score'));
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
