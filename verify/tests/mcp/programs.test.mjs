// Program figures through the MCP server (add-program-fact-pages 5.1): the
// net metering and community solar rows gridprims_query_data serves sum to the
// figures the state pages show.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from '../../../mcp/protocol.mjs';
import { netMeteringData } from '../../../site/entities/net-metering.mjs';
import { ROOT, modern } from './mcp-helpers.mjs';

const built = existsSync(join(ROOT, 'data/eia-861-net-metering/current.json'));

test('California\'s 2025 net-metered photovoltaic capacity from the server equals the state page\'s', { skip: !built && 'not built' }, async () => {
  const s = createServer();
  const rows = [];
  let page;
  do {
    page = (await s.handle(modern(1, 'tools/call', { name: 'gridprims_query_data', arguments: { dataset: 'eia-861-net-metering', table: 'net_metering', filter: { state: 'CA', data_year: 2025, technology: 'Photovoltaic', measure: 'Capacity MW', sector: 'Total' }, limit: 500, offset: rows.length } }))).result;
    assert.equal(page.isError, false, page.content[0].text);
    rows.push(...page.structuredContent.rows);
  } while (page.structuredContent.truncated);
  const fromServer = rows.reduce((n, r) => n + r.value, 0);
  const fromPage = netMeteringData(join(ROOT, 'data')).state('CA').years.find((y) => y.year === 2025).pv;
  assert.ok(Math.abs(fromServer - fromPage) < 1e-6, `${fromServer} against ${fromPage}`);
});

const solar = existsSync(join(ROOT, 'data/nlr-sharing-the-sun/current.json'));

/** Every row of one table the server returns for a filter, following truncation. */
async function all(s, dataset, table, filter) {
  const rows = [];
  let page;
  do {
    page = (await s.handle(modern(1, 'tools/call', { name: 'gridprims_query_data', arguments: { dataset, table, filter, limit: 500, offset: rows.length } }))).result;
    assert.equal(page.isError, false, page.content[0].text);
    rows.push(...page.structuredContent.rows);
  } while (page.structuredContent.truncated);
  return rows;
}

test('community solar: each state\'s operating projects and capacity, and the queue kept apart, equal the state page\'s', { skip: !solar && 'not built' }, async () => {
  const { communitySolarData } = await import('../../../site/entities/community-solar.mjs');
  const cs = communitySolarData(join(ROOT, 'data'));
  const s = createServer();
  const states = [...new Set((await all(s, 'nlr-sharing-the-sun', 'state_projects', {})).map((r) => r.state))];
  assert.ok(states.length >= 20, `${states.length} states`);
  for (const st of states) {
    const page = cs.state(st);
    const rows = await all(s, 'nlr-sharing-the-sun', 'state_projects', { state: st });
    assert.equal(rows.reduce((n, r) => n + r.projects, 0), page.operating.projects, `${st} projects`);
    assert.ok(Math.abs(rows.reduce((n, r) => n + r.mw_ac, 0) - page.operating.mw) < 1e-6, `${st} MW`);
    const queue = await all(s, 'nlr-sharing-the-sun', 'state_queue', { state: st });
    assert.ok(Math.abs((queue[0]?.mw_ac ?? 0) - page.queueMw) < 1e-6, `${st} queue`);
  }
});
