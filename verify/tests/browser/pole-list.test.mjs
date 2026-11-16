// The pole list on the attachment height page (add-overhead-line-checks 3.5),
// in each installed engine: a field file checked in a worker, one line per
// pole, a CSV export, an unreadable row named, a pole opened above, and a
// share link that names the file but holds none of its rows.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowser, launch, waitFor } from '../../lib/browser.mjs';
import { serve } from '../../lib/static-server.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';
import { leaks } from '../../lib/requests.mjs';
import { writeXlsx } from '../../lib/zip-writer.mjs';

const out = await sharedSite();
const PAGE = '/tools/lines/attachment-height/find/';
const ready = 'new Promise((r) => { const f = () => document.documentElement.dataset.ready && document.querySelector("[data-pole-list]")?.dataset.ready ? r(true) : setTimeout(f, 20); f(); })';
const MARK = 'POLE918273';
const rows = ['pole_id,owner,kind,height,note'];
for (let p = 0; p < 120; p++) rows.push(`${MARK}-${p},Coop,neutral,${27 + (p % 4)} ft,`, `${MARK}-${p},TelCo,telephone,${19 + (p % 3)} ft,`, `${MARK}-${p},Fiber,fiber,${p === 5 ? 'see photo' : '21 ft'},`);
const b64 = Buffer.from(rows.join('\n')).toString('base64');
const book = Buffer.from(writeXlsx({ Instructions: [['How to fill in this workbook']], Standards: [['rule_id', 'applies_to', 'value', 'unit', 'source_document', 'source_locator', 'note'], ['sep.neutral.comm', '', 40, 'in', 'Our standard', '4.2', ''], ['sep.comm.comm', '', 12, 'in', 'Our standard', '4.3', ''], ['ground.pole.comm', '', 18, 'ft', 'Our standard', '4.1', '']] })).toString('base64');
const load = (sel, data, name, type) => `(() => { const dt = new DataTransfer(); dt.items.add(new File([Uint8Array.from(atob('${data}'), (c) => c.charCodeAt(0))], '${name}', { type: '${type}' })); const i = document.querySelector('${sel}'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()`;

for (const kind of ['chrome', 'firefox']) {
  test(`${kind}: a pole list is checked on the device, exported, and opened one pole at a time`, { skip: !findBrowser(kind) && `${kind} is not installed`, timeout: 90_000 }, async () => {
    const log = [];
    const server = await serve(out, { onRequest: (r) => log.push(r) });
    const browser = await launch(kind);
    try {
      await browser.goto(server.url + PAGE);
      await browser.evaluate(ready);
      // Rules from a workbook whose first sheet is instructions: the second sheet is read and named.
      await browser.evaluate(load('[data-rules-file]', book, 'standards.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
      await waitFor(browser, '/sheet "Standards"/.test(document.querySelector("[data-rules-result]").textContent)');
      assert.match(await browser.evaluate('document.querySelector("#in-rules").value'), /^rule_id,.*\nsep\.neutral\.comm,,40,in,Our standard,4\.2,/s);
      // Two rows setting one rule differently: the page offers each, and the pick rewrites the record the checks read.
      const clash = btoa('rule_id,applies_to,value,unit\nsep.neutral.comm,,40,in\nsep.neutral.comm,,30,in\nsep.comm.comm,,12,in\nground.pole.comm,,18,ft');
      await browser.evaluate(load('[data-rules-file]', clash, 'standards.csv', 'text/csv'));
      await waitFor(browser, '/Rows 2 and 3 both set sep\\.neutral\\.comm/.test(document.querySelector("[data-rules-result]").textContent)');
      await browser.evaluate('[...document.querySelectorAll("[data-rules-result] button")].find((b) => /Use row 3/.test(b.textContent)).click()');
      assert.match(await browser.evaluate('document.querySelector("[data-rules-result]").textContent'), /Using row 3 for sep\.neutral\.comm/);
      assert.equal(await browser.evaluate('document.querySelector("#in-rules").value'), 'rule_id,applies_to,value,unit\n\nsep.neutral.comm,,30,in\nsep.comm.comm,,12,in\nground.pole.comm,,18,ft');
      // A PDF of standards is not read, and the answer links the template.
      await browser.evaluate(load('[data-rules-file]', btoa('%PDF-1.7'), 'standards.pdf', 'application/pdf'));
      assert.match(await browser.evaluate('document.querySelector("[data-rules-result]").textContent'), /PDF standards are not read/);
      assert.equal(await browser.evaluate('document.querySelector("[data-rules-result] a").getAttribute("href")'), '/lines/standards-template.csv');

      await browser.evaluate(`(() => { const dt = new DataTransfer(); dt.items.add(new File([Uint8Array.from(atob('${b64}'), (c) => c.charCodeAt(0))], 'poles.csv', { type: 'text/csv' })); const i = document.querySelector('[data-pole-file]'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await waitFor(browser, 'document.querySelector("[data-pole-list]").dataset.poles === "120"');
      const csv = await browser.evaluate('document.querySelector("[data-pole-list]").dataset.csv');
      assert.equal(csv.trim().split('\n').length, 121, 'one CSV row per pole');
      assert.match(await browser.evaluate('document.querySelector("[data-pole-result]").textContent'), /Row 19: height could not be read\./);

      // Open one pole: its rows fill the form, and the link names the file instead of holding them.
      await browser.evaluate('document.querySelector("[data-pole=\\"1\\"]").click()');
      await browser.evaluate('new Promise((r) => setTimeout(r, 100))');
      assert.match(await browser.evaluate('document.querySelector("#in-attachments").value'), /neutral, Coop, 28 ft/);
      const hash = await browser.evaluate('location.hash');
      assert.match(hash, /attachments=your\+pole\+list/);
      assert.doesNotMatch(hash, new RegExp(MARK));

      // A fresh load of that link asks for the list.
      await browser.goto('about:blank');
      await browser.goto(`${server.url}${PAGE}${hash}`);
      await browser.evaluate(ready);
      assert.equal(await browser.evaluate('document.querySelector("#in-attachments").value'), '');
      assert.match(await browser.evaluate('document.querySelector("#in-attachments-error").textContent'), /one pole from a pole list/);

      assert.deepEqual(leaks(log, MARK), []);
      assert.deepEqual(leaks(browser.requests.map((url) => ({ url })), MARK), []);
    } finally {
      await browser.close();
      await server.close();
    }
  });
}
