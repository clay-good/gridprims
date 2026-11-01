// The continuity ledger page and JSON (add-data-continuity-ledger 1.5, 1.9,
// 1.10, 4.1, 4.2): the on-time count in the first sentence, every served
// dataset and our own in one table, the automation rows aged on the device,
// the JSON with the same rows and the thresholds, the MCP resource from the
// same record, and links from the data library and the limits page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sharedSite } from '../../lib/shared-site.mjs';
import { ledgerRecord } from '../../../mcp/data.mjs';

const out = await sharedSite();
const html = readFileSync(join(out, 'ledger/index.html'), 'utf8');
const json = JSON.parse(readFileSync(join(out, 'ledger/ledger.json'), 'utf8'));

test('the first sentence gives the on-time count, and every row is in the table', () => {
  const main = html.slice(html.indexOf('<main'));
  const first = main.slice(main.indexOf('data-ledger-counts')).replace(/<[^>]+>/g, '');
  assert.match(first, new RegExp(`Of the ${json.counts.tracked} datasets we track, ${json.counts.current} are current`));
  assert.ok(main.indexOf('data-ledger-counts') < main.indexOf('data-ledger>'), 'the counts come before the table');
  for (const r of json.rows) assert.ok(html.includes(`id="${r.id}"`), r.id);
  assert.ok(json.rows.some((r) => r.ours), 'our own datasets are in it');
  assert.match(html, /data-ledger-invite/);
});

test('the JSON carries the generated time, the license, and each workflow\'s threshold; the page ages it on the device', () => {
  assert.ok(Date.parse(json.generatedAt));
  assert.equal(json.license, 'CC BY 4.0');
  assert.ok(json.automation.length >= 3 && json.automation.every((w) => w.thresholdHours > 0));
  assert.match(html, /data-age-from="/);
  assert.match(html, /data-health-row data-last-success=/);
});

test('the MCP resource gives the same rows, and the library and limits pages link the ledger', () => {
  const r = ledgerRecord();
  assert.deepEqual(r.rows.map((x) => x.id).sort(), json.rows.map((x) => x.id).sort());
  assert.match(readFileSync(join(out, 'data/index.html'), 'utf8'), /href="\/ledger\/"/);
  assert.match(readFileSync(join(out, 'limits/index.html'), 'utf8'), /href="\/ledger\/"/);
});
