// The model-free half of the agent evaluation (MCP task 5.2): every expected
// tool exists, its arguments validate against the tool's schema, and replaying
// the call reproduces the recorded key values. This part gates releases; a
// model run is advisory and recorded in mcp/eval/model-runs.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import requests, { FAMILIES } from '../../../mcp/eval/requests.mjs';
import { TOOL_SURFACE } from '../../../mcp/surface.mjs';
import { checkArguments, createServer } from '../../../mcp/protocol.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { DIR } from '../../fixtures/intake/make.mjs';
import { ROOT, modern } from './mcp-helpers.mjs';

const get = (o, path) => path.split('.').reduce((x, k) => x?.[k], o);
const LINES = join(ROOT, 'verify/fixtures/lines');
const withFixtures = (args) => JSON.parse(JSON.stringify(args).replace(/\{fixture:([^}]+)\}/g, (_, f) => join(realpathSync(DIR), f)).replace(/\{lines:([^}]+)\}/g, (_, f) => join(realpathSync(LINES), f)));

test('every tool family that exists has at least one request', () => {
  const families = new Set(requests.map((r) => r.family));
  for (const f of FAMILIES) assert.ok(families.has(f), `no request for the ${f} family`);
  for (const { manifest } of TOOLS) assert.ok(requests.some((r) => r.arguments.tool === manifest.id), `no request runs ${manifest.id}`);
});

for (const r of requests) {
  test(`eval ${r.id}: the tool exists, its arguments validate, and replay gives the recorded values`, async () => {
    const tool = TOOL_SURFACE.find((t) => t.name === r.tool);
    assert.ok(tool, `${r.tool} is not a tool`);
    const args = withFixtures(r.arguments);
    assert.equal(checkArguments(tool.inputSchema, args), null);
    const res = await createServer({ allowDirs: [realpathSync(DIR), realpathSync(LINES)] }).handle(modern(1, 'tools/call', { name: r.tool, arguments: args }));
    assert.equal(res.result.isError, false, res.result.content[0].text);
    for (const [path, want] of Object.entries(r.expect)) assert.deepEqual(get(res.result.structuredContent, path), want, path);
  });
}

test('the model-run record is well formed (empty means none has been run, which never blocks a release)', () => {
  const { runs } = JSON.parse(readFileSync(join(ROOT, 'mcp/eval/model-runs.json'), 'utf8'));
  for (const run of runs) for (const k of ['agent', 'date', 'passed', 'total']) assert.ok(k in run, k);
});
