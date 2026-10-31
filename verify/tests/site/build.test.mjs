import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { escapeHtml } from '../../../site/lib/html.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { toolPath } from '../../../site/ui/tool-page.mjs';
import { decodeState, encodeState, isExampleState } from '../../../site/ui/share-state.mjs';
import { checkFileCount } from '../../gates/file-count.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
const result = build({ outDir: out });
const page = (p) => readFileSync(join(out, p.endsWith('/') ? `${p}index.html` : p), 'utf8');

test('builds every calculator page, the limits page, home, and 404', () => {
  for (const p of ['/', '/limits/', '/404.html', '/tools/calc/energy-units/convert/']) assert.ok(result.pages.includes(p), p);
  assert.deepEqual(checkFileCount(out), []);
});

test('page and manifest agree: every label, unit, and citation appears exactly as the manifest states', () => {
  for (const { manifest } of TOOLS) {
    const html = page(toolPath(manifest.id));
    for (const inp of manifest.inputs) assert.ok(html.includes(`>${escapeHtml(inp.label)}`), `input label ${inp.label}`);
    for (const o of manifest.inputs.flatMap((i) => i.options ?? [])) assert.ok(html.includes(`>${escapeHtml(o.label)}</option>`), `option ${o.label}`);
    for (const c of manifest.citations) {
      assert.ok(html.includes(escapeHtml(c.source)), `citation ${c.source}`);
      assert.ok(html.includes(escapeHtml(c.locator)), `locator ${c.locator}`);
    }
    for (const l of manifest.limitations) assert.ok(html.includes(escapeHtml(l)), `limitation ${l}`);
    assert.ok(html.includes(`<title>${escapeHtml(manifest.title)}`));
  }
});

test('first paint shows the worked example answer, labeled Example values, with the level beside it', () => {
  const html = page('/tools/calc/energy-units/convert/');
  assert.match(html, /data-output="value">40\.95<span class="unit">MMBtu<\/span>/);
  assert.match(html, /<p class="sentence">12 MWh is 40\.95 MMBtu\.<\/p>/);
  assert.match(html, /data-strip>[\s\S]*Self-checked only[\s\S]*Example values/);
  assert.match(html, /Self-checked · Five worked examples/);
  assert.match(html, /href="\/limits\/#calc\.energy-units\.convert"/);
  assert.match(html, /<noscript>/);
});

test('the limits page lists every tool with its level, and no tool claims field-verified', () => {
  const html = page('/limits/');
  for (const { manifest } of TOOLS) {
    assert.ok(html.includes(`id="${manifest.id}"`));
    assert.ok(html.includes(`${manifest.validation.level} · `));
  }
  assert.doesNotMatch(html.replace(/<dl>[\s\S]*<\/dl>/, ''), /<td>3 · Field-verified/);
  for (const { manifest } of TOOLS) if (manifest.stability !== 'stable') assert.match(html, /<td>Preview<\/td>/);
});

test('handoffs carry no inputs', () => {
  const html = page('/tools/calc/energy-units/convert/');
  for (const [, href] of html.matchAll(/class="handoff" href="([^"]+)"/g)) assert.doesNotMatch(href, /[?#]/);
});

test('the deploy manifest lists every file with its checksum, and a rebuild reproduces it', () => {
  const m = JSON.parse(page('/_manifest.json'));
  for (const { path, sha256 } of m) assert.equal(createHash('sha256').update(readFileSync(join(out, path))).digest('hex'), sha256, path);
  const again = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
  build({ outDir: again });
  assert.equal(readFileSync(join(again, '_manifest.json'), 'utf8'), page('/_manifest.json'));
});

test('the inline theme script hash is recorded for the CSP', () => {
  const hashes = JSON.parse(page('/_csp-hashes.json'))['script-src'];
  const inline = /<script>([^<]+)<\/script>/.exec(page('/'))[1];
  assert.deepEqual(hashes, [`sha256-${createHash('sha256').update(inline).digest('base64')}`]);
});

test('no README or test file ships', () => {
  assert.ok(!existsSync(join(out, 'core/README.md')));
  assert.ok(!existsSync(join(out, 'verify')));
});

test('share state round-trips declared inputs only, never files', () => {
  const { manifest } = TOOLS[0];
  const hash = encodeState(manifest, { value: 7, from: 'therm', to: 'kWh', secret: 'x' });
  assert.equal(hash, '#value=7&from=therm&to=kWh');
  assert.deepEqual(decodeState(manifest, `${hash}&evil=1`), { value: '7', from: 'therm', to: 'kWh' });
  assert.ok(isExampleState(manifest, { value: '12', from: 'MWh', to: 'MMBtu' }));
  assert.ok(!isExampleState(manifest, { value: '13', from: 'MWh', to: 'MMBtu' }));
});
