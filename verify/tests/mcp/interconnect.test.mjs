// The interconnection tools through the MCP server (add-interconnection-screens
// task 6.1): every worked example gives the website's structured result, and no
// input, worked or swept, ever turns a screen that needs the utility's data or
// circuit model into a pass or a fail.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../../../mcp/protocol.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { modern } from './mcp-helpers.mjs';

const INTERCONNECT = TOOLS.filter(({ manifest }) => manifest.id.startsWith('interconnect.'));
const call = (id, tool, inputs) => modern(id, 'tools/call', { name: 'gridprims_run', arguments: { tool, inputs } });

/** SGIP § 2.2.1 screens only the utility can settle: its system, its fault study, its stability limits, its design. */
const UTILITY_ONLY = ['2.2.1.1', '2.2.1.2', '2.2.1.3', '2.2.1.4', '2.2.1.5', '2.2.1.9', '2.2.1.10'];

/** Each screen's line of the shown work, by section. */
const screenLines = (result) => new Map(result.work.steps.filter((s) => /^§ 2\.2\.1\.\d+,/.test(s)).map((s) => [/^§ (2\.2\.1\.\d+),/.exec(s)[1], s]));

test('every interconnection worked example gives the website\'s structured result through the server', async () => {
  const server = createServer();
  let id = 0;
  let n = 0;
  for (const { manifest, impl } of INTERCONNECT) {
    for (const ex of manifest.examples) {
      const r = await server.handle(call(++id, manifest.id, ex.inputs));
      assert.equal(r.result.isError, false, `${manifest.id} ${ex.id}`);
      assert.deepEqual(r.result.structuredContent, runTool(manifest, impl, ex.inputs), `${manifest.id} ${ex.id}`);
      n++;
    }
  }
  assert.ok(INTERCONNECT.length >= 4 && n >= 14, `${INTERCONNECT.length} tools, ${n} examples`);
});

test('no input turns a utility-only screen into a pass or a fail, on the server or the website', async () => {
  const { manifest, impl } = INTERCONNECT.find((t) => t.manifest.id === 'interconnect.fast-track.screens');
  const server = createServer();
  const opt = (name) => manifest.inputs.find((i) => i.name === name).options.map((o) => o.value);
  let id = 0;
  let swept = 0;
  for (const lineConfig of opt('lineConfig')) {
    for (const connection of opt('connection')) {
      for (const [sharedKw, imbalanceKva, transformerKva] of [[0, 0, 0], [15, 15, 100], [25, 30, 100], [20, 20, 100], [100000, 100000, 1]]) {
        const inputs = { lineConfig, connection, sharedKw, imbalanceKva, transformerKva };
        const r = await server.handle(call(++id, manifest.id, inputs));
        const result = r.result.structuredContent;
        assert.deepEqual(result, runTool(manifest, impl, inputs));
        const lines = screenLines(result);
        assert.equal(lines.size, 10, 'all ten screens, every time');
        for (const s of UTILITY_ONLY) assert.match(lines.get(s), /\)\. Open\.( |$)/, `§ ${s} with ${JSON.stringify(inputs)}`);
        // Only the three screens you and your installer can answer are ever counted met or not met;
        // the rest of the ten are open, or do not apply to this service.
        const notApplicable = [...lines.values()].filter((l) => /Not on a shared secondary\.|Not a 240 V center-tap service/.test(l)).length;
        assert.equal(result.outputs.open.value + result.outputs.met.value + result.outputs.notMet.value + notApplicable, 10);
        assert.ok(result.outputs.met.value + result.outputs.notMet.value <= 3);
        assert.ok(result.outputs.open.value >= UTILITY_ONLY.length);
        // And the summary never claims a likelihood, nor that the utility's screens were passed.
        assert.doesNotMatch(result.sentence, /\b(likely|probabl|should pass|will pass|approved)\b/i);
        swept++;
      }
    }
  }
  assert.equal(swept, 3 * 4 * 5);
});
