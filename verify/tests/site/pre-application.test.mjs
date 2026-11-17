// The pre-application report walkthrough (add-interconnection-screens 5.1 and 5.2): scenario "Report explained"
// gives the fee, the deadline in business days, the items, and the provision; "No such report" names the path
// the rules do give; "What the fee buys" lists each item against the screens it informs and names the rest.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import FED from '../../../data/curated/pre-application/federal.mjs';
import TX from '../../../data/curated/pre-application/tx.mjs';
import { checkRecord } from '../../../pipeline/lib/curated.mjs';
import { MODEL_ONLY, whatTheFeeBuys } from '../../../core/lib/pre-application.mjs';
import { preApplicationPanel } from '../../../site/ui/pre-application.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const sgip = readFileSync(`${ROOT}/data/curated/captures/interconnect/ferc-sgip-1.2.txt`, 'utf8').split('\n----\n')[1];
const html = String(preApplicationPanel(createI18n(strings, 'en-US')));

test('the records pass, and the fee, deadline, and every item are in the stored text of § 1.2', () => {
  for (const r of [FED, TX]) assert.deepEqual(checkRecord(r, ROOT).problems, [], r.id);
  assert.match(sgip, /non-refundable fee of \$300 for a pre-application report/);
  assert.match(sgip, /within 20 Business Days of receipt of the completed request form/);
  for (const i of FED.fields.items.value) assert.ok(sgip.includes(i.n), i.n);
  assert.equal(FED.fields.items.value.length, 13);
  assert.equal(FED.fields.supply.value.length, 8);
});

test('report explained: the page gives the fee, the deadline, the items, and cites the provision', () => {
  assert.match(html, /costs \$300, non-refundable, and the utility has 20 business days from the completed request form and the fee to return it\./);
  assert.match(html, /<a href="https:\/\/www\.ferc\.gov\/[^"]+">SGIP § 1\.2\.2<\/a>, pro forma SGIP as updated through August 27, 2018/);
  assert.match(html, /Non-binding; it confers no rights/);
  assert.equal((html.match(/data-item=/g) ?? []).length, 13);
});

test('what the fee buys: each item against the screens it informs, and the rest named as model-only', () => {
  const rows = whatTheFeeBuys(FED.fields.items.value);
  assert.deepEqual(rows.find((r) => r.n === '1.2.3.8').settles, ['2.2.1.2', '2.4.4.1']);
  assert.deepEqual(rows.find((r) => r.n === '1.2.3.11').settles, []);
  assert.match(html, /data-item="1\.2\.3\.8"><th scope="row">§ 1\.2\.3\.8 Line section peak load and minimum load[^<]*<\/th><td>§ 2\.2\.1\.2, § 2\.4\.4\.1<\/td>/);
  assert.match(html, /No item settles § 2\.2\.1\.4, § 2\.2\.1\.5, § 2\.2\.1\.9, § 2\.2\.1\.10: those need the utility&#39;s circuit model\./);
  assert.deepEqual(MODEL_ONLY, ['2.2.1.4', '2.2.1.5', '2.2.1.9', '2.2.1.10']);
  assert.match(html, /our reading of § 1\.2\.3 beside § 2\.2\.1, not the rule&#39;s words/);
});

test('no such report: Texas says so and names the path its rule provides', () => {
  assert.match(html, /data-preapp-none="TX"><strong>TX:<\/strong> No pre-application report\. The rule provides a pre-interconnection study/);
  assert.match(html, /16 TAC § 25\.211\(g\)\(1\)<\/a>/);
});
