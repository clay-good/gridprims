// Changes to published curated figures (add-trust-and-continuity task 2.3):
// a corrected figure publishes on the build that carries it, the log records
// both values and the sources, the old value stays visible, comments stay open
// 30 days, and a removal is logged the same day. A value that moves without a
// log entry fails the build.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { recordCurated, LOG, SNAPSHOT } from '../../../pipeline/record-curated.mjs';
import records from '../../../data/curated/large-load-tariffs/_index.mjs';
import { attachPrevious, correctionEntries, diffPublished, publishedValues } from '../../../core/lib/curated-changes.mjs';
import { checkCuratedChanges } from '../../gates/curated-changes.mjs';
import { termsData } from '../../../site/entities/large-load-terms.mjs';
import { largeLoadTermsPage } from '../../../site/templates/large-load-terms.mjs';
import { correctionsPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { tempDir } from '../../lib/temp.mjs';

const i18n = createI18n(strings, 'en-US');
const base = records.find((r) => r.id === 'dominion-gs5');
// Texas §25.194: each field rests on two archived captures of the commission's order and rule.
const texas = records.find((r) => r.id === 'texas-25-194');
const withThreshold = (value) => ({ ...texas, fields: { ...texas.fields, threshold: { ...texas.fields.threshold, value } } });

test('the committed snapshot matches what the terms page publishes today', async () => {
  assert.deepEqual(await checkCuratedChanges(ROOT), []);
});

test('correcting upward: a corrected threshold publishes on that build, logs both values and the sources, keeps the old visible, and opens comments for 30 days', () => {
  const out = tempDir('gridprims-curated-');
  assert.deepEqual(recordCurated({ root: ROOT, out, records: [withThreshold('70 MW or more at one site')], today: '2026-11-01' }), [], 'the first snapshot is not a change');
  // Before it is logged, the change is visible to the gate's diff.
  const before = JSON.parse(readFileSync(join(out, SNAPSHOT), 'utf8'));
  const now = publishedValues(termsData(ROOT, Date.parse('2026-11-14'), [withThreshold('75 MW or more at one site')]).entries);
  assert.deepEqual(diffPublished(before, now), [{ key: 'texas-25-194.threshold', kind: 'correction', old: '70 MW or more at one site', new: '75 MW or more at one site' }]);

  const [entry] = recordCurated({ root: ROOT, out, records: [withThreshold('75 MW or more at one site')], today: '2026-11-14' });
  assert.equal(entry.kind, 'correction');
  assert.deepEqual([entry.date, entry.old, entry.new], ['2026-11-14', '70 MW or more at one site', '75 MW or more at one site']);
  assert.equal(entry.sources.length, 2, 'both archived primary sources the new value rests on');
  assert.ok(entry.sources.every((s) => s.url && s.archive));
  // The snapshot moved, so the next build sees no unlogged change.
  assert.equal(JSON.parse(readFileSync(join(out, SNAPSHOT), 'utf8'))['texas-25-194.threshold'], '75 MW or more at one site');

  const log = JSON.parse(readFileSync(join(out, LOG), 'utf8'));
  const [c] = correctionEntries(log);
  assert.equal(c.comments, '2026-12-14');
  assert.equal(c.sources.length, 2);
  const page = String(correctionsPage({ entries: [c], i18n })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(page, /Correction · .*threshold: changed on 2 archived primary sources from Public Utility Commission of Texas\. For threshold: 70 MW or more at one site before, 75 MW or more at one site after\. Comments open until Dec 14, 2026\./);
  const data = termsData(ROOT, Date.parse('2026-11-14'), [withThreshold('75 MW or more at one site')]);
  attachPrevious(data.entries, log);
  assert.match(String(largeLoadTermsPage({ data, i18n })), /75 MW or more at one site[\s\S]*?<span class="unit-hint" data-was>Changed Nov 14, 2026; was: 70 MW or more at one site<\/span>/);
});

test('urgent removal: a figure pulled for citing the wrong utility is withdrawn and logged the same day, with the cause', () => {
  const out = tempDir('gridprims-curated-');
  recordCurated({ root: ROOT, out, records: [base], today: '2026-11-01' });
  const pulled = { ...base, fields: { ...base.fields, exitFee: { ...base.fields.exitFee, sources: [] } } };
  const [entry] = recordCurated({ root: ROOT, out, records: [pulled], today: '2026-11-14', causes: { 'dominion-gs5.exitFee': 'it cited another utility\'s tariff' } });
  assert.deepEqual([entry.kind, entry.date, entry.new, entry.cause], ['withdrawal', '2026-11-14', null, 'it cited another utility\'s tariff']);
  const [c] = correctionEntries([entry]);
  assert.equal(c.tier, 'withdrawal');
  assert.match(c.cause, /cited another utility/);
  // The page shows "Not public" for it at once: nothing waits on a person.
  const data = termsData(ROOT, Date.parse('2026-11-14'), [pulled]);
  assert.equal(data.entries[0].fields.exitFee.value, null);
});

test('the gate names a value that moved without a log entry', async () => {
  const errors = diffPublished({ 'dominion-gs5.term': '12 years' }, { 'dominion-gs5.term': '14 years' });
  assert.deepEqual(errors, [{ key: 'dominion-gs5.term', kind: 'correction', old: '12 years', new: '14 years' }]);
});
