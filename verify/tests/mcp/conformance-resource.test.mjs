// The bill test vector suite through the agent server (add-tariff-conformance-suite 4.2): reading
// gridprims://conformance runs the latest release on this machine and returns, for every vector, exactly the
// structured result the release gate and the website compute, each with the bill tools' validation level,
// which matches the limits resource.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../../../mcp/protocol.mjs';
import { runVector } from '../../../core/lib/run-vector.mjs';
import { committedVectors } from '../../../pipeline/lib/vector-releases.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const read = async (server, id, uri) => JSON.parse((await server.handle({ jsonrpc: '2.0', id, method: 'resources/read', params: { uri } })).result.contents[0].text);

async function connected() {
  const server = createServer();
  await server.handle({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '0' } } });
  await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' });
  return server;
}

test('the resource is listed, and reading it runs every vector with results identical to the gate\'s', async () => {
  const server = await connected();
  const list = await server.handle({ jsonrpc: '2.0', id: 1, method: 'resources/list', params: {} });
  assert.ok(list.result.resources.some((r) => r.uri === 'gridprims://conformance'));
  const run = await read(server, 2, 'gridprims://conformance');
  const vectors = committedVectors(ROOT);
  const expected = [...vectors].sort((a, b) => a.id.localeCompare(b.id)).map(runVector);
  const got = [...run.results].sort((a, b) => a.id.localeCompare(b.id)).map(({ validation, ...r }) => r);
  assert.deepEqual(got, expected);
  assert.deepEqual(run.summary, { vectors: vectors.length, pass: vectors.length, fail: 0, skipped: 0 });
  assert.equal(run.license, 'CC BY 4.0');
});

test('every bill result carries the validation level, the same one the limits resource gives', async () => {
  const server = await connected();
  const run = await read(server, 3, 'gridprims://conformance');
  const limits = await read(server, 4, 'gridprims://limits');
  for (const r of run.results) {
    assert.ok(r.validation.length >= 1, r.id);
    for (const v of r.validation) {
      const row = limits.tools.find((t) => t.id === v.tool);
      assert.deepEqual([v.level, v.name], [row.validationLevel, row.validationName], `${r.id} ${v.tool}`);
    }
  }
  assert.deepEqual(run.standing, limits.conformance);
});
