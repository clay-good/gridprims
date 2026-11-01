// The qualifying-facility checklist (add-program-fact-pages 4.1): every
// statement cited to a regulation section with the date checked, the 1 MW
// exemption stated plainly, no input or calculator anywhere in the page's
// content, and no sentence that says a facility qualifies.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sharedSite } from '../../lib/shared-site.mjs';
import checklist from '../../../data/curated/qf-checklist.mjs';

const out = await sharedSite();
const html = readFileSync(join(out, 'learn/qualifying-facility/index.html'), 'utf8');
const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));

test('every statement links its regulation section, and the page shows the date checked', () => {
  const items = checklist.groups.flatMap((g) => g.items);
  assert.ok(items.length >= 10);
  for (const x of items) {
    assert.match(x.cite.section, /^18 CFR \d+\.\d+/);
    assert.ok(main.includes(`href="${x.cite.url}"`), x.cite.section);
  }
  assert.match(main, /Every statement checked against the eCFR on Nov 1, 2026/);
});

test('the exemption for 1 MW or less is stated with its citation, and the regulator still decides', () => {
  assert.match(main, /data-qf-exemption="yes">A facility with a net power production capacity of 1 MW or less is exempt from the filing requirement/);
  assert.match(main, /18 CFR 292\.203\(d\)\(1\)/);
  assert.match(main, /The filer and the Federal Energy Regulatory Commission decide whether a facility qualifies, and this is not legal advice/);
});

test('no input, no calculator, and no determination', () => {
  assert.doesNotMatch(main, /<(input|select|textarea|form)\b/);
  assert.doesNotMatch(main, /\b(you|your (facility|project)) (qualif(y|ies)|is a qualifying facility)\b/i);
});
