// Ratepayer tools through the MCP server (add-ratepayer-tools 2.1): the
// worked examples give the website's numbers, and no tool can submit,
// email, or post anything on anyone's behalf.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../../../mcp/protocol.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import REQUESTS from '../../../mcp/eval/requests.mjs';
import { modern } from './mcp-helpers.mjs';

const ratepayer = TOOLS.filter((t) => t.manifest.id.startsWith('ratepayer.'));

test('every ratepayer worked example and eval request gives the website\'s numbers through the server', async () => {
  assert.ok(ratepayer.length > 0);
  const s = createServer();
  let id = 0;
  for (const { manifest, impl } of ratepayer) {
    for (const ex of manifest.examples) {
      const r = await s.handle(modern(++id, 'tools/call', { name: 'gridprims_run', arguments: { tool: manifest.id, inputs: ex.inputs } }));
      assert.equal(r.result.isError, false, `${manifest.id} ${ex.id}`);
      assert.deepEqual(r.result.structuredContent, runTool(manifest, impl, ex.inputs), `${manifest.id} ${ex.id}`);
    }
  }
  for (const q of REQUESTS.filter((x) => x.family === 'ratepayer')) {
    const r = await s.handle(modern(++id, 'tools/call', { name: q.tool, arguments: q.arguments }));
    const out = r.result.structuredContent;
    for (const [path, want] of Object.entries(q.expect)) assert.equal(path.split('.').reduce((o, k) => o?.[k], out), want, `${q.id} ${path}`);
  }
});

test('no MCP tool can submit: every tool is read-only and closed-world, and none offers to send', async () => {
  const { result } = await createServer().handle(modern(1, 'tools/list'));
  for (const t of result.tools) {
    assert.deepEqual(t.annotations, { readOnlyHint: true, idempotentHint: true, openWorldHint: false, destructiveHint: false }, t.name);
    assert.doesNotMatch(t.name, /submit|send|email|post|file_comment/i, t.name);
    for (const k of Object.keys(t.inputSchema.properties ?? {})) assert.doesNotMatch(k, /^(to|email|recipient|docket|regulator|endpoint|webhook)$/i, `${t.name}.${k}`);
  }
});

test('a prepared report is a link for the person to open; the server sends nothing', async () => {
  const real = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error('no network'); };
  try {
    const r = await createServer().handle(modern(1, 'tools/call', { name: 'gridprims_prepare_report', arguments: { tool: 'ratepayer.revenue-requirement.explain', message: 'The ROE example looks off.' } }));
    assert.equal(r.result.isError, false);
    assert.match(r.result.content[0].text, /Nothing has been sent/);
    assert.match(r.result.structuredContent.link, /^https:\/\/gridprims\.com\/report\/#/);
  } finally { globalThis.fetch = real; }
  assert.equal(calls, 0);
});
