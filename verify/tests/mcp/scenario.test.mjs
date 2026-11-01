// The scenario model through gridprims_query_data (add-grid-scenario-model
// 5.1): an agent always receives the backtest, its definitions, the label,
// and the omissions; a change comes back only beside the model's own error,
// with each fuel's change read against that fuel's bias; the numbers are the
// ones the site's page computes; and unknown units or regions are refused.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from '../../../mcp/protocol.mjs';
import { ROOT, modern } from './mcp-helpers.mjs';
import { scenarioInputs, scenarioRegion } from '../../../site/entities/scenario.mjs';
import { scenarioRun } from '../../../core/lib/backtest.mjs';
import { expandUnit } from '../../../core/lib/fleet.mjs';

const built = existsSync(join(ROOT, 'data/eia-923/current.json')) && existsSync(join(ROOT, 'data/eia-930/current.json'));
const server = createServer();
const ask = async (args) => (await server.handle(modern(1, 'tools/call', { name: 'gridprims_query_data', arguments: { entity: 'scenario', ...args } }))).result;

test('an unmodified lookup carries the backtest, its definitions, the label, the omissions, and the shares', { skip: !built && 'not built', timeout: 120_000 }, async () => {
  const r = await ask({ id: 'pace' });
  assert.equal(r.isError, false, r.content?.[0]?.text);
  const e = r.structuredContent.entity;
  assert.equal(e.region, 'PACE');
  assert.ok(['coal', 'gas', 'oil'].every((c) => 'bias' in e.backtest.fuels[c] && 'mae' in e.backtest.fuels[c]));
  assert.match(e.backtest.definitions.bias, /modeled minus recorded/);
  assert.match(e.label, /screening model/);
  assert.equal(e.omissions.length, 8);
  assert.equal(e.shares.measuredHeatRate, 0);
  assert.equal(r.structuredContent.url, 'https://gridprims.com/scenario/pace/');
  assert.equal(e.scenario, undefined);
});

test('a retirement comes back only beside the model\'s error, with the same numbers the page computes', { skip: !built && 'not built', timeout: 120_000 }, async () => {
  const inp = scenarioInputs(join(ROOT, 'data'));
  const region = scenarioRegion(inp, 'PACE');
  const coal = [...region.fleet.units].filter((u) => u.class === 'coal').sort((a, b) => b.capacity_mw - a.capacity_mw)[0];
  const r = await ask({ id: 'PACE', scenario: { retire: [coal.id], solar: 2 } });
  assert.equal(r.isError, false, r.content?.[0]?.text);
  const { backtest, scenario: s } = r.structuredContent.entity;
  assert.ok(backtest && s, 'the error and the change arrive together');
  const want = scenarioRun({ units: region.fleet.units.map(expandUnit), rows: region.rows, base: region.run, bt: region.backtest, edits: [{ kind: 'retire', id: coal.id }], scale: { gen_sun: 2, gen_snb: 2, gen_wnd: 1, gen_wnb: 1 } });
  for (const c of ['coal', 'gas', 'oil']) {
    assert.equal(s.changes[c].change_mwh, want.changes[c].change_mwh, c);
    assert.equal(s.changes[c].bias, backtest.fuels[c].bias, `${c} is read against its own bias`);
  }
  assert.ok(s.changes.coal.change_mwh < 0, 'retiring coal lowers coal');
  assert.deepEqual(s.edits.map((x) => [x.kind, x.id]), [['retire', coal.id]]);
  assert.match(s.reading, /not whether the grid would have had enough capacity/);
});

test('an unknown unit or a region with nothing to dispatch is refused with where to look', { skip: !built && 'not built', timeout: 120_000 }, async () => {
  const unit = await ask({ id: 'PACE', scenario: { retire: ['0-NOPE'] } });
  assert.equal(unit.isError, true);
  assert.match(unit.content[0].text, /No placed unit "0-NOPE" in PACE.*fleet\.json/);
  const region = await ask({ id: 'NOPE' });
  assert.equal(region.isError, true);
  assert.match(region.content[0].text, /gridprims\.com\/scenario\//);
  const misuse = await server.handle(modern(1, 'tools/call', { name: 'gridprims_query_data', arguments: { entity: 'state', id: 'TX', scenario: { solar: 2 } } }));
  assert.equal(misuse.result.isError, true);
});
