// One source for every surface (platform/tool-contract): every label, unit,
// and citation reads the same on the page, in the command index, through the
// MCP server, and in the generated reference doc.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { DOC_PATH, toolsReference } from '../../../site/docs.mjs';
import { escapeHtml } from '../../../site/lib/html.mjs';
import { toolPath } from '../../../site/ui/tool-page.mjs';
import { createServer } from '../../../mcp/protocol.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
build({ outDir: out });
const index = JSON.parse(readFileSync(join(out, 'command-index.json'), 'utf8'));
const doc = readFileSync(DOC_PATH, 'utf8');

test('the committed tools reference matches the manifests', () => {
  assert.equal(doc, toolsReference(), 'run node site/docs.mjs');
});

test('labels, units, and citations are identical on every surface', async () => {
  const mcp = createServer();
  for (const { manifest: m } of TOOLS) {
    const page = readFileSync(join(out, toolPath(m.id), 'index.html'), 'utf8');
    const described = (await mcp.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'gridprims_describe', arguments: { tool: m.id } } })).result.structuredContent;
    const entry = index.find((e) => e.id === m.id);
    assert.equal(entry.title, m.title);
    assert.equal(described.title, m.title);
    assert.ok(doc.includes(`## ${m.title} (\`${m.id}\`)`));
    for (const inp of m.inputs) {
      const d = described.inputs.find((x) => x.name === inp.name);
      assert.equal(d.label, inp.label);
      assert.equal(d.unit, inp.unit);
      assert.ok(page.includes(`>${escapeHtml(inp.label)}`));
      assert.ok(doc.includes(`| ${inp.label} | \`${inp.name}\``));
      for (const o of inp.options ?? []) {
        assert.ok(page.includes(`>${escapeHtml(o.label)}</option>`));
        assert.deepEqual(d.options.find((x) => x.value === o.value)?.label, o.label);
        assert.deepEqual(entry.inputs.find((x) => x.name === inp.name).options.find((x) => x.value === o.value).unit, o.unit);
      }
    }
    for (const out of m.outputs) assert.equal(described.outputs.find((x) => x.name === out.name).label, out.label);
    for (const c of m.citations) {
      assert.ok(page.includes(escapeHtml(c.locator)));
      assert.ok(doc.includes(`${c.source}, ${c.edition}, ${c.locator}`));
      assert.ok(described.citations.some((x) => x.source === c.source && x.locator === c.locator));
    }
  }
});

test('a manifest input unit change reaches every surface in the same build', async () => {
  const { manifest } = TOOLS[0];
  const before = manifest.inputs[0].label;
  manifest.inputs[0].label = 'Amount (changed)';
  try {
    const out2 = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
    build({ outDir: out2 });
    assert.ok(readFileSync(join(out2, toolPath(manifest.id), 'index.html'), 'utf8').includes('>Amount (changed)'));
    assert.ok(toolsReference().includes('| Amount (changed) |'));
    const d = (await createServer().handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'gridprims_describe', arguments: { tool: manifest.id } } })).result.structuredContent;
    assert.equal(d.inputs[0].label, 'Amount (changed)');
  } finally {
    manifest.inputs[0].label = before;
  }
});
