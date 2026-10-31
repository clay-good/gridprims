// The entity page sweep without a browser (public grid data task 7.2): every
// sampled page states its facts in its HTML with no JavaScript, and every
// entity page stays inside the HTML budget.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { build, ENTITY_FAMILIES } from '../../../site/build.mjs';
import { entitySample, ENTITY_SWEEP } from '../../browser/pages.mjs';
import { walk } from '../../lib/walk.mjs';
import { BUDGETS } from '../../lib/reference-profile.mjs';
import { tempDir } from '../../lib/temp.mjs';

const out = tempDir('gridprims-sweep-');
await build({ outDir: out });
const sample = entitySample(out);

test('the sweep visits 200 entity pages across every family', () => {
  assert.equal(sample.length, 200);
  assert.equal(new Set(sample).size, 200);
  for (const [family, n] of Object.entries(ENTITY_SWEEP)) assert.equal(sample.filter((p) => p.startsWith(`/${family}/`)).length, n, family);
});

test('without JavaScript, each sampled page has its heading, at least four facts, and a source stamp', () => {
  for (const p of sample) {
    const html = readFileSync(join(out, p, 'index.html'), 'utf8');
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    assert.match(main, /<h1>[^<]+<\/h1>/, `${p} heading`);
    const facts = [...main.matchAll(/<dd[^>]*>([\s\S]*?)<\/dd>|<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => (m[1] ?? m[2]).replace(/<[^>]+>/g, '').trim()).filter(Boolean);
    assert.ok(facts.length >= 4, `${p} has ${facts.length} facts in its HTML`);
    assert.match(main, /class="source-stamp mono"/, `${p} source stamp`);
    assert.doesNotMatch(main, /<noscript|data-requires-js/, `${p} needs no script for its facts`);
  }
});

test(`every entity page's HTML is at most ${BUDGETS.entityPageHtmlGzipBytes / 1024} KB compressed`, () => {
  const pages = walk(out).filter((f) => ENTITY_FAMILIES.some((d) => f.startsWith(d)) && f.endsWith('index.html'));
  assert.ok(pages.length > 17000);
  const over = pages.map((f) => [f, gzipSync(readFileSync(join(out, f))).length]).filter(([, n]) => n > BUDGETS.entityPageHtmlGzipBytes);
  assert.deepEqual(over, []);
});
