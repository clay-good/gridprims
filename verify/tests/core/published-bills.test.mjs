// The bill check reproduces published residential bills (add-household-bill-check 2.4): five commission bills
// from Louisiana's November 2026 comparison, each at a level the commission publishes, run through the
// household.bill-totals.check tool itself with the tariff as the JSON a person would enter, match to the cent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { fromUrpx } from '../../../core/lib/urpx.mjs';
import { PUBLISHED_EXAMPLES } from '../../fixtures/bill/published-examples.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const tool = getTool('household.bill-totals.check');
const vector = (id) => JSON.parse(readFileSync(join(ROOT, 'data/curated/conformance/vectors', `${id}.json`), 'utf8'));

test('five published bills, five schedules, at the commission\'s own levels', () => {
  const vs = PUBLISHED_EXAMPLES.map(vector);
  assert.equal(new Set(vs.map((v) => `${v.provenance.utility}|${v.provenance.schedule}`)).size, 5);
  for (const v of vs) {
    assert.equal(v.provenance.kind, 'commission-publication');
    assert.ok(v.provenance.page && v.provenance.url && v.provenance.document, v.id);
    assert.ok([250, 500, 750, 1000, 1250, 1500, 1750, 2000, 3000, 4000, 5000].includes(v.load.periods[0].kwh), 'a level the commission publishes');
    assert.equal(v.expected.rounding, undefined, 'the printed lines add up to the printed total');
  }
});

for (const id of PUBLISHED_EXAMPLES) {
  test(`${id}: the bill check gives the commission's bill to the cent`, () => {
    const v = vector(id);
    const { tariff } = fromUrpx(v.tariff.document);
    const p = v.load.periods[0];
    const r = runTool(tool.manifest, tool.impl, { periods: `${p.start} to ${p.end}, ${p.kwh} kWh`, tariff: JSON.stringify(tariff), prorate: 'yes' });
    assert.equal(r.status, 'ok', JSON.stringify(r.errors ?? r));
    assert.equal(r.outputs.total.display, v.expected.total.amount.toFixed(2), `${v.provenance.publisher}, ${v.provenance.document}, page ${v.provenance.page}: ${v.provenance.utility} ${v.provenance.schedule} at ${v.provenance.consumptionLevel}`);
  });
}
