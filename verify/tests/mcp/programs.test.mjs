// Program figures through the MCP server (add-program-fact-pages 5.1): the
// net metering rows gridprims_query_data serves sum to the figure the state
// page shows.

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
