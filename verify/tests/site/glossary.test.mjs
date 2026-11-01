// The glossary (add-learn-and-data-guides 1.1 and 1.3): the demand charge
// entry shows its unit, example, tools, and citation; a term is marked only
// where a page first uses it; a too-complex definition fails naming the term
// and its grade; a manifest listing a term with no entry fails; and every
// launch term is present.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import glossary from '../../../data/curated/glossary.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { glossaryProblems, LAUNCH } from '../../../verify/gates/glossary.mjs';
import { markFirstUse } from '../../../site/lib/glossary-terms.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

test('the demand charge entry shows its unit, its example, the tools that use it, and its citation', () => {
  const page = decode(readFileSync(join(out, 'learn/glossary/index.html'), 'utf8'));
  const entry = /<section class="panel glossary-entry" id="demand-charge"[\s\S]*?<\/section>/.exec(page)[0];
  assert.match(entry, /\$\/kW/);
  assert.match(entry, /412 kW × \$18\.50\/kW = \$7,622/);
  assert.match(entry, /data-glossary-tools>.*Power factor correction|data-glossary-tools>.*minimum bill/s);
  assert.match(entry, /eia\.gov\/tools\/glossary/);
  assert.match(entry, /Adapted from the EIA glossary/);
  for (const id of LAUNCH) assert.match(page, new RegExp(`id="${id}" data-glossary-entry`), id);
});

test('only the first use of a term on a page becomes a glossary term', () => {
  const lf = glossary.find((g) => g.id === 'load-factor');
  const { markup, marked } = markFirstUse('<p>Your load factor is 50%.</p><p>A higher load factor costs less.</p><p>load factor again</p>', [lf]);
  assert.equal((markup.match(/class="glossary-term"/g) ?? []).length, 1);
  assert.deepEqual(marked, ['load-factor']);
  assert.match(markup, /^<p>Your <span class="glossary-term"><a href="\/learn\/glossary\/#load-factor"/);
  // Not inside a link, a label, or a heading.
  assert.equal(markFirstUse('<h2>Load factor</h2><a href="x">load factor</a><label>load factor</label>', [lf]).marked.length, 0);
});

test('a built tool page marks its listed terms once each', () => {
  const page = readFileSync(join(out, 'tools/household/bill-totals/check/index.html'), 'utf8');
  for (const id of ['kwh', 'fixed-charge']) assert.equal((page.match(new RegExp(`glossary/#${id}"`, 'g')) ?? []).length, 1, id);
});

test('a too-complex definition fails naming the term and its grade', () => {
  const bad = [{ ...glossary[0], id: 'billing-window', term: 'billing window', aliases: [], related: [], short: 'The maximum averaged real power demand registered during the billing determinant window' }];
  const errors = glossaryProblems(bad, []);
  assert.ok(errors.some((e) => /^glossary billing window: the one-line definition reads at grade \d+\.\d, above 8$/.test(e)), errors.join('\n'));
});

test('a manifest that lists a term with no entry fails the build, naming it', () => {
  const errors = glossaryProblems(glossary, [{ manifest: { id: 'x.y.z', glossary: ['flux-capacitor'] } }]);
  assert.deepEqual(errors, ['x.y.z: lists glossary term "flux-capacitor", which has no entry']);
  assert.deepEqual(glossaryProblems(glossary, TOOLS), []);
});
