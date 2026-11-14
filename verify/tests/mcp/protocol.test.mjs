import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, SUPPORTED } from '../../../mcp/protocol.mjs';
import { TOOL_SURFACE } from '../../../mcp/surface.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { checkDef } from '../../lib/json-schema.mjs';
import { ROOT, modern, startServer } from './mcp-helpers.mjs';

const schema = (v) => JSON.parse(readFileSync(join(ROOT, `verify/reference/mcp/schema-${v}.json`), 'utf8'));
const S = Object.fromEntries(SUPPORTED.map((v) => [v, schema(v)]));

/** The definition a response must match, per version and method. */
function responseDef(version, method, msg) {
  if (msg.error) return msg.error.code === -32022 ? 'UnsupportedProtocolVersionError' : version === '2025-06-18' ? 'JSONRPCError' : 'JSONRPCErrorResponse';
  const names = { 'server/discover': 'DiscoverResult', 'tools/list': 'ListToolsResult', 'tools/call': 'CallToolResult', 'resources/list': 'ListResourcesResult', 'resources/read': 'ReadResourceResult', initialize: 'InitializeResult' };
  return version === '2026-07-28' ? `${names[method]}Response` : names[method];
}
const requestDef = { 'server/discover': 'DiscoverRequest', 'tools/list': 'ListToolsRequest', 'tools/call': 'CallToolRequest', 'resources/list': 'ListResourcesRequest', 'resources/read': 'ReadResourceRequest', initialize: 'InitializeRequest' };

const legacy = (id, method, params = {}) => ({ jsonrpc: '2.0', id, method, params });
const run = (id, req) => modern(id, 'tools/call', { name: 'gridprims_run', arguments: req });

/** The conversation recorded for each version. */
const SCRIPTS = {
  '2026-07-28': [
    modern(1, 'server/discover'),
    modern(2, 'tools/list'),
    modern(3, 'resources/list'),
    modern(4, 'resources/read', { uri: 'gridprims://limits' }),
    run(5, { tool: 'calc.energy-units.convert', inputs: { value: 12, from: 'MWh', to: 'MMBtu' } }),
    run(6, { tool: 'calc.energy-units.convert', inputs: { value: '12' } }),
    modern(7, 'tools/call', { name: 'gridprims_search', arguments: { query: '12 MWh to MMBtu' } }),
    modern(8, 'tools/call', { name: 'gridprims_describe', arguments: { tool: 'calc.energy-units.convert' } }),
    modern(9, 'tools/call', { name: 'gridprims_prepare_report', arguments: { tool: 'calc.energy-units.convert', message: 'The coal figure looks low.' } }),
    modern(10, 'tools/list', {}, '2024-01-01'),
    modern(11, 'tools/call', { name: 'gridprims_nope', arguments: {} }),
    modern(12, 'resources/read', { uri: 'gridprims://nope' }),
  ],
  '2025-11-25': [
    legacy(1, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } }),
    legacy(2, 'tools/list'),
    legacy(3, 'tools/call', { name: 'gridprims_run', arguments: { tool: 'calc.energy-units.convert', inputs: { value: 1000, from: 'ft3-natural-gas', to: 'Btu' } } }),
    legacy(4, 'resources/read', { uri: 'gridprims://datasets' }),
  ],
  '2025-06-18': [
    legacy(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } }),
    legacy(2, 'tools/list'),
    legacy(3, 'tools/call', { name: 'gridprims_run', arguments: { tool: 'calc.energy-units.convert', inputs: { value: 1, from: 'therm', to: 'kWh' } } }),
    legacy(4, 'resources/list'),
  ],
};

/**
 * Resources whose body is live data: the limits record carries the build's own
 * date, what is late today, and which cited link died this week, so pinning its
 * text would make this fixture fail on every data refresh rather than on a
 * protocol change. The envelope stays pinned; the body is checked where it is
 * built (verify/tests/site/limits.test.mjs).
 */
const LIVE = new Set(['gridprims://limits', 'gridprims://ledger']);
const pinnable = (pairs) => pairs.map(({ request, response }) => (
  LIVE.has(request.params?.uri) && response.result?.contents
    ? { request, response: { ...response, result: { ...response.result, contents: response.result.contents.map((c) => ({ ...c, text: `<live ${request.params.uri}>` })) } } }
    : { request, response }
));

for (const [version, script] of Object.entries(SCRIPTS)) {
  test(`${version}: recorded pairs replay identically and every message matches the official schema`, async () => {
    const server = createServer();
    const pairs = [];
    for (const request of script) pairs.push({ request, response: await server.handle(request) });
    const file = join(ROOT, `verify/fixtures/mcp/conformance-${version}.json`);
    if (process.env.GRIDPRIMS_RECORD) writeFileSync(file, JSON.stringify(pinnable(pairs), null, 2) + '\n');
    assert.deepEqual(pinnable(pairs), JSON.parse(readFileSync(file, 'utf8')), 'replay differs from the recorded pairs');
    for (const { request, response } of pairs) {
      assert.deepEqual(checkDef(S[version], requestDef[request.method], request), [], `request ${request.method}`);
      const def = responseDef(version, request.method, response);
      const value = version === '2026-07-28' || response.error ? response : response.result;
      assert.deepEqual(checkDef(S[version], def, value), [], `${request.method} → ${def}`);
    }
  });
}

test('the tool list is the same six tools, in the same order, with long public caching', async () => {
  const server = createServer();
  const a = await server.handle(modern(1, 'tools/list'));
  const b = await server.handle(modern(2, 'tools/list'));
  assert.deepEqual(a.result.tools.map((t) => t.name), ['gridprims_search', 'gridprims_describe', 'gridprims_run', 'gridprims_analyze_file', 'gridprims_query_data', 'gridprims_prepare_report']);
  assert.deepEqual(a.result, b.result);
  assert.equal(a.result.ttlMs, 86_400_000);
  assert.equal(a.result.cacheScope, 'public');
  for (const t of a.result.tools) {
    assert.ok(t.inputSchema && t.outputSchema, t.name);
    assert.deepEqual(t.annotations, { readOnlyHint: true, idempotentHint: true, openWorldHint: false, destructiveHint: false });
  }
});

test('golden surface: names, schemas, and descriptions change only with the golden file', () => {
  const file = join(ROOT, 'mcp/golden-surface.json');
  if (process.env.GRIDPRIMS_RECORD) writeFileSync(file, JSON.stringify(TOOL_SURFACE, null, 2) + '\n');
  assert.deepEqual(TOOL_SURFACE, JSON.parse(readFileSync(file, 'utf8')), 'the MCP tool surface changed; update mcp/golden-surface.json in the same change');
});

test('an unknown version gets -32022 listing all three supported versions', async () => {
  const r = await createServer().handle(modern(1, 'tools/list', {}, '2024-01-01'));
  assert.equal(r.error.code, -32022);
  assert.deepEqual(r.error.data, { requested: '2024-01-01', supported: ['2026-07-28', '2025-11-25', '2025-06-18'] });
});

test('a legacy 2025-06-18 client completes the handshake and is served tools', async () => {
  const s = createServer();
  const init = await s.handle(legacy(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'x', version: '1' } }));
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.equal((await s.handle(legacy(2, 'tools/list'))).result.tools.length, 6);
});

test('same answer as the website: every worked example through the server equals the shared core', async () => {
  const s = createServer();
  let id = 0;
  for (const { manifest, impl } of TOOLS) {
    for (const ex of manifest.examples) {
      const r = await s.handle(run(++id, { tool: manifest.id, inputs: ex.inputs }));
      assert.equal(r.result.isError, false);
      const web = runTool(manifest, impl, ex.inputs);
      if (manifest.id.startsWith('lines.')) {
        // Lines tools list file text in source_text, and their shown work cites rows instead of sources and owners.
        const { source_text: sourceText, ...got } = r.result.structuredContent;
        assert.ok(Array.isArray(sourceText), `${manifest.id} ${ex.id}`);
        const noSteps = (x) => ({ ...x, work: { ...x.work, steps: x.work.steps.length } });
        assert.deepEqual(noSteps(got), noSteps(web), `${manifest.id} ${ex.id}`);
      } else assert.deepEqual(r.result.structuredContent, web, `${manifest.id} ${ex.id}`);
      assert.deepEqual(JSON.parse(r.result.content[0].text), r.result.structuredContent);
      assert.equal(r.result.structuredContent.validationLevel, manifest.validation.level);
    }
  }
});

test('a missing unit is an isError result that lists the accepted units', async () => {
  const r = await createServer().handle(run(1, { tool: 'calc.energy-units.convert', inputs: { value: '12' } }));
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /from: Choose from: one of Wh, kWh, MWh/);
});

test('bad arguments name the field; unknown tools and methods are JSON-RPC errors', async () => {
  const s = createServer();
  const bad = await s.handle(modern(1, 'tools/call', { name: 'gridprims_search', arguments: { query: 5, extra: 1 } }));
  assert.equal(bad.result.isError, true);
  assert.match(bad.result.content[0].text, /"query" must be a string|Unknown argument "extra"/);
  assert.equal((await s.handle(modern(2, 'tools/call', { name: 'nope', arguments: {} }))).error.code, -32602);
  assert.equal((await s.handle(modern(3, 'tools/nope'))).error.code, -32601);
  assert.equal((await s.handle({ id: 4 })).error.code, -32600);
});

test('a report is prepared, never sent, and carries inputs only when asked', async () => {
  const s = createServer();
  const plain = (await s.handle(modern(1, 'tools/call', { name: 'gridprims_prepare_report', arguments: { tool: 'calc.energy-units.convert', message: 'x', inputs: { value: 9 } } }))).result.structuredContent;
  assert.equal(plain.payload.attachment, undefined);
  assert.match(plain.link, /^https:\/\/gridprims\.com\/report\/#/);
  const decoded = JSON.parse(Buffer.from(plain.link.split('#')[1], 'base64url').toString());
  assert.deepEqual(decoded, plain.payload);
  const withInputs = (await s.handle(modern(2, 'tools/call', { name: 'gridprims_prepare_report', arguments: { message: 'x', inputs: { value: 9 }, includeInputs: true } }))).result.structuredContent;
  assert.deepEqual(withInputs.payload.attachment, { inputs: { value: 9 } });
});

test('the real process: malformed lines get a parse error and it keeps running; logs hold no values; it exits when stdin closes', async () => {
  const p = startServer();
  p.raw('{not json');
  const r = await p.request(run(7, { tool: 'calc.energy-units.convert', inputs: { value: 12345, from: 'MWh', to: 'MMBtu' } }));
  assert.equal(r.result.structuredContent.outputs.value.display, '42,120');
  assert.equal(await p.close(), 0);
  assert.match(p.stderr, /^gridprims: gridprims_run \d+ ms\n$/);
  assert.doesNotMatch(p.stderr, /12345|MWh/);
});
