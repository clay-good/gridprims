// The state threshold comparison (add-interconnection-screens 3.6): the same screen family side by side with
// each threshold cited; a state that measures something else is a different test, not a different number; and
// where hosting capacity is the screen, the comparison says so.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import RECORDS from '../../../data/curated/interconnect/_index.mjs';
import { compareScreens } from '../../../core/lib/screen-compare.mjs';
import { calculatorPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { getTool } from '../../../core/tools/index.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const families = compareScreens(RECORDS);
const row = (family, id) => families.find((f) => f.family === family).rows.find((r) => r.id === id);

test('the index lists every record file', () => {
  const dir = join(ROOT, 'data/curated/interconnect');
  const files = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap((d) => readdirSync(join(dir, d.name)).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')));
  assert.equal(RECORDS.length, files.length);
});

test('different load-ratio test: a state measuring something other than peak load is a different test, shown with both citations', () => {
  const fed = row('aggregate-generation', 'federal-fast-track-2.2.1.2');
  assert.equal(fed.versusFederal, 'federal');
  assert.ok(fed.cites.length === 2 && fed.cites.every((c) => c.locator && c.vintage && c.url));
  const ica = row('aggregate-generation', 'ca-rule-21-m-ica');
  assert.equal(ica.versusFederal, 'different-test');
  assert.equal(row('aggregate-generation', 'tx-25.211-g-1').versusFederal, 'different-test');
  // Same measure, but "less than 15%" where the federal rule says "at most 15%".
  assert.equal(row('aggregate-generation', 'ca-rule-21-m-peak').versusFederal, 'different-threshold');
  assert.equal(row('interrupting-capability', 'ca-rule-21-g').versusFederal, 'same');
  // The federal row leads each family.
  for (const f of families) assert.equal(f.rows[0].jurisdiction, 'federal');
});

test('hosting capacity is the screen: the California row names the published profiles and cites both tariffs', () => {
  const ica = row('aggregate-generation', 'ca-rule-21-m-ica');
  assert.equal(ica.measure, 'hosting-capacity');
  assert.match(ica.threshold, /ICA-SG 576 profile/);
  assert.deepEqual(ica.cites.map((c) => c.publisher), ['Pacific Gas and Electric Company', 'Southern California Edison Company']);
});

test('the fast-track page carries the comparison, a single-source row says so, and every threshold is cited', () => {
  const { manifest, impl } = getTool('interconnect.fast-track.screens');
  const example = manifest.examples[0];
  const page = String(calculatorPage({ manifest, example, result: runTool(manifest, impl, example.inputs), i18n: createI18n(strings, 'en-US') }));
  assert.match(page, /<h2 id="compare-title">The same screen in each jurisdiction we hold<\/h2>/);
  assert.match(page, /data-row="ca-rule-21-m-ica"[\s\S]*?A different test, not a different number for the same test/);
  assert.match(page, /data-row="tx-25\.211-g-1"[\s\S]*?Second source, Texas Secretary of State, could not be read on Nov 16, 2026: one source only\./);
  assert.match(page, /data-misquotes/);
});
