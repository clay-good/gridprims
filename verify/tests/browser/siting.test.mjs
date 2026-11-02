// The siting read-out in a real browser (siting/where-and-how-long): the join
// runs on the device, the ZIP and the size appear in no request, and the
// figures the public record cannot support are refused rather than invented.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const submit = (zip, mw, direction) => `(() => { const f = document.querySelector('[data-siting-form]'); f.elements.zip.value = '${zip}'; f.elements.mw.value = '${mw}'; f.elements.direction.value = '${direction}'; f.requestSubmit(); })()`;
const answer = "document.querySelector('[data-siting-answer]').textContent.replace(/\\s+/g, ' ')";

for (const kind of ['chrome', 'firefox']) {
  const skip = !findBrowser(kind) && `${kind} is not installed`;

  test(`${kind}: a place and a size return the utilities, the county queue, and the limits, and send nothing`, { skip, timeout: 90_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r.url) });
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/`);
      await waitFor(browser, "document.querySelector('[data-siting]').dataset.ready === 'true'");
      browser.requests.length = 0;
      log.length = 0;
      await browser.evaluate(submit('78701', '300', 'load'));
      await waitFor(browser, "document.documentElement.dataset.sitingDone === '78701'", 20_000);
      const text = await browser.evaluate(answer);

      // The headline is the range, because EIA lists utilities by county and which one
      // serves a given site is not public.
      assert.match(text, /would use between [\d.]+% and [\d.]+% of everything the utilities here sell in a year/);
      assert.match(text, /Oncor Electric Delivery Company LLC/);
      assert.match(text, /Austin Energy/);
      // Whose peak the share is of is always named; ERCOT's is never Austin Energy's.
      assert.match(text, /of the ERCOT peak of [\d,]+ MW in \d{4}\. This utility files no peak of its own/);
      // The county's queue, with the period it describes and no forecast.
      assert.match(text, /What is already queued in Travis County/);
      assert.match(text, /active requests/);
      assert.match(text, /not a prediction for a new one/);
      // Travis is below the cohort minimum, so the state figure is offered and labelled.
      assert.match(text, /Too few requests here to generalize, so this is the TX figure/);
      // LBNL's own negative capacity is named, not corrected.
      assert.match(text, /negative capacity in the publisher’s file \(solar\)/);
      assert.match(text, /Lawrence Berkeley National Laboratory, Queued Up/);
      // Load is not routed by the federal small generator procedures.
      assert.match(text, /cover generation, not new load/);

      // Nothing typed leaves the device: no request carries the ZIP or the size.
      const urls = [...log, ...browser.requests];
      for (const u of urls) assert.ok(!u.includes('78701') && !/\bmw=|zip=/.test(u), `request carries an input: ${u}`);
      // Only the tables the answer needs are fetched.
      assert.ok(urls.some((u) => u.includes('/queue/tx.json')), 'fetches the state queue summaries');
      assert.ok(urls.some((u) => u.includes('/large-load/utilities.json')), 'fetches the utility prefill');
      assert.ok(!urls.some((u) => /\/queue\/(?!tx\.json)[a-z]{2}\.json/.test(u)), 'fetches only the state it needs');
    } finally {
      await browser.close();
      await server.close();
    }
  });

  test(`${kind}: a generation size is routed to its federal process; a county with a cohort reports its own share`, { skip, timeout: 90_000 }, async () => {
    const server = await serve(out);
    const browser = await launch(kind);
    try {
      await browser.goto(`${server.url}/`);
      await waitFor(browser, "document.querySelector('[data-siting]').dataset.ready === 'true'");
      await browser.evaluate(submit('19104', '3', 'generation'));
      await waitFor(browser, "document.documentElement.dataset.sitingDone === '19104'", 20_000);
      const text = await browser.evaluate(answer);
      assert.match(text, /Philadelphia County/);
      // Philadelphia's cohort clears the minimum, so its own share is reported.
      assert.match(text, /Of the requests that entered this county’s queue by 2020, \d+% were later withdrawn \(\d+ requests\)/);
      // The router is asked with an unknown mainline, so it gives the ceiling that holds anywhere.
      assert.match(text, /Fast Track ceiling is 2,000 kW at any location/);
      assert.match(text, /See every Fast Track screen/);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
