// Thresholds people misquote (add-interconnection-screens 1.4, scenario "Misremembered state threshold"):
// every entry gives the rule's actual value and cites the rule text and the vintage read; the federal entry is
// checked against our stored capture of the procedures; and the fast-track tool's page carries the list.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import MISQUOTES from '../../../data/curated/screen-misquotes.mjs';
import { calculatorPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

test('every entry says what is misquoted, what the rule contains, and cites the rule and the vintage read', () => {
  assert.ok(MISQUOTES.length >= 5);
  assert.equal(new Set(MISQUOTES.map((m) => m.id)).size, MISQUOTES.length);
  for (const m of MISQUOTES) {
    assert.ok(m.said.trim() && m.actual.trim(), m.id);
    assert.ok(m.cites.length, `${m.id}: cites a rule`);
    for (const c of m.cites) {
      assert.ok(c.rule.trim(), `${m.id}: names the rule`);
      assert.match(c.vintage, /\b(19|20)\d\d\b/, `${m.id}: the vintage read carries its date`);
      assert.match(c.url, /^https:\/\//, `${m.id}: links the rule`);
    }
  }
});

test('the federal entry holds against our capture: no voltage drop or penetration screen among the ten', () => {
  const ferc = readFileSync(`${ROOT}/data/curated/captures/interconnect/ferc-sgip-2.2.1.txt`, 'utf8').split('\n----\n')[1];
  assert.match(ferc, /2\.2\.1\.10/);
  assert.doesNotMatch(ferc, /voltage drop|penetration/i);
});

test('a misremembered state threshold: the tool page gives the rule\'s value with its citation', () => {
  const { manifest, impl } = getTool('interconnect.fast-track.screens');
  const example = manifest.examples[0];
  const page = String(calculatorPage({ manifest, example, result: runTool(manifest, impl, example.inputs), i18n: createI18n(strings, 'en-US') }));
  assert.match(page, /<h2 id="misquotes-title">Thresholds people misquote<\/h2>/);
  for (const m of MISQUOTES) assert.ok(page.includes(`data-misquote="${m.id}"`), m.id);
  assert.match(page, /Massachusetts screens projects at 67% of minimum load\.[\s\S]*uses 100% of minimum load[\s\S]*M\.D\.P\.U\. No\. 1632[\s\S]*effective May 1, 2026/);
  // The panel needs no script of its own.
  assert.doesNotMatch(page, /src="null"/);
});
