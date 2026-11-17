// The state threshold comparison (add-interconnection-screens 3.6): the same screen family side by side with
// each threshold cited; a state that measures something else is a different test, not a different number; and
// where hosting capacity is the screen, the comparison says so.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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
  // Ohio's Level 2 screen tests 100% of minimum load where the federal one tests 15% of peak: a different test.
  const oh = row('aggregate-generation', 'oh-4901-1-22-07-b-1-d');
  assert.equal(oh.versusFederal, 'different-test');
  assert.match(oh.threshold, /100% of the line section's relevant minimum load/);
  assert.deepEqual(oh.cites.map((c) => c.locator), ['4901:1-22-07(B)(1)(d)']);
  assert.equal(row('interrupting-capability', 'oh-4901-1-22-07-b-1-f').versusFederal, 'different-threshold');
  // The federal row leads each family that has one; a state screen with no federal kind says so.
  for (const f of families.filter((x) => x.rows.some((r) => r.jurisdiction === 'federal'))) assert.equal(f.rows[0].jurisdiction, 'federal');
  assert.equal(row('transformer-rating', 'ca-rule-21-d').versusFederal, 'no-federal');
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

test('stale jurisdiction: a record last checked 13 months ago shows the review chip and its last-checked date', async () => {
  const { reviewDue } = await import('../../../core/lib/screen-compare.mjs');
  const { comparePanel } = await import('../../../site/ui/screen-compare.mjs');
  assert.equal(reviewDue('2025-10-16'), '2026-10-16');
  const html = String(comparePanel(createI18n(strings, 'en-US')));
  // The chip is revealed on the device once today reaches its date (site/pages/shell.js), so the page needs no clock.
  const tx = /data-row="tx-25\.211-g-1"[\s\S]*?<\/tr>/.exec(html)[0];
  assert.match(tx, /Last checked Nov 16, 2026/);
  assert.match(tx, /<span class="warning-chip" data-late-from="2027-11-16" hidden>Needs review: not checked in 12 months<\/span>/);
  // A record checked 13 months before today is past its date, so the shell shows its chip.
  const today = '2026-11-16';
  assert.ok(!(today < reviewDue('2025-10-16')), 'shown');
  assert.ok(today < reviewDue('2026-11-16'), 'hidden while fresh');
});

test('comparison downloadable: every row with its citations and last-checked date, under CC BY 4.0', async () => {
  const { screenRows, screensCsv } = await import('../../../core/lib/screen-compare.mjs');
  const csv = screensCsv(RECORDS);
  const lines = csv.trim().split('\n');
  assert.equal(lines[0], 'id,jurisdiction,family,process,screen,threshold,test_basis,who_answers,measure,comparison,last_checked,review_due,sources,unreachable_sources');
  assert.equal(lines.length, RECORDS.length + 1);
  const ca = lines.find((l) => l.startsWith('ca-rule-21-m-ica,'));
  assert.match(ca, /Pacific Gas and Electric Company, Rule 21 § G, Screen M with ICA values, Sheet 153, Electric Rule No\. 21, Advice Letter 7692-E, sheets effective August 29, 2025, https:\/\/www\.pge\.com\//);
  assert.match(ca, /,2026-11-16,2027-11-16,/);
  assert.match(lines.find((l) => l.startsWith('tx-25.211-g-1,')), /Texas Secretary of State, unreachable on 2026-11-16/);
  for (const r of screenRows(RECORDS)) assert.ok(r.sources.length && r.sources.every((s) => s.url && s.locator && s.document), r.id);
  // The build writes both files, and the JSON says the license and how to credit.
  const out = process.env.GRIDPRIMS_DIST;
  if (out) {
    const json = JSON.parse(readFileSync(join(out, 'interconnect/screens.json'), 'utf8'));
    assert.equal(json.license, 'CC BY 4.0');
    assert.match(json.credit, /cites the tariffs and rules/);
    assert.equal(readFileSync(join(out, 'interconnect/screens.csv'), 'utf8'), csv);
  }
});
