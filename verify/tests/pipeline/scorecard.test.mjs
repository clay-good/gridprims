// The accuracy scorecard (add-tariff-conformance-suite 3.1 to 3.4 and 3.6): a disagreement shows both bills,
// the difference in dollars and percent, the arithmetic, and both sources; an untestable schedule is counted
// and kept out of every figure; counts and distributions, never a composite or a ranking; neutral wording
// until a maintainer's finding, which then names the reader, the date, and any upstream report; and our own
// engine in the same table with the same breakdowns.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../../core/lib/shard.mjs';
import { runVector } from '../../../core/lib/run-vector.mjs';
import { agrees, counts, engineRow, scorecard, wording } from '../../../pipeline/lib/scorecard.mjs';
import { CHARGE_TYPES } from '../../../pipeline/lib/bill-vectors.mjs';
import { committedVectors } from '../../../pipeline/lib/vector-releases.mjs';
import { loadGroundTruth } from '../../../site/entities/ground-truth.mjs';
import { scorecardPage } from '../../../site/templates/scorecard.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import CROSSWALK, { URDB_VERSION } from '../../../data/curated/conformance/urdb-crosswalk.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const i18n = createI18n(strings, 'en-US');
const docs = loadGroundTruth(ROOT);
const records = new Map(['LA'].flatMap((st) => readShard(readFileSync(join(ROOT, 'data/urdb', URDB_VERSION, 'rates', `${st}.bin`))).rows()).map((r) => [r.label, r]));
const card = scorecard(docs, CROSSWALK, records);
const release = JSON.parse(readFileSync(join(ROOT, 'data/curated/conformance/release.json'), 'utf8'));
const engine = engineRow(committedVectors(ROOT), runVector, release.untestable);
const page = () => String(scorecardPage({ card, engine, versions: { urdb: URDB_VERSION, vectors: '2026.11.0' }, i18n }));

test('the margin is 0.5% of the published bill or $1.00, whichever is larger', () => {
  assert.equal(agrees(100, 101), true);
  assert.equal(agrees(100, 101.01), false);
  assert.equal(agrees(400, 402), true);
  assert.equal(agrees(400, 402.01), false);
});

test('every Louisiana schedule is in the crosswalk, matched to a record in the snapshot or untestable with why', () => {
  const la = docs.find((d) => d.state === 'LA');
  for (const r of la.rows) assert.ok(CROSSWALK.some((c) => c.state === 'LA' && c.utility === r.utility && c.schedule === r.schedule), `${r.utility} ${r.schedule}`);
  for (const c of CROSSWALK) assert.ok(c.untestable ? c.untestable.length > 20 : records.has(c.urdb) && c.why, `${c.utility} ${c.schedule}`);
});

test('disagreement reported: Cleco at 1,000 kWh shows both bills, the difference, the arithmetic, and both sources', () => {
  const e = card.entries.find((x) => x.utility === 'CLECO');
  const l = e.levels.find((x) => x.kwh === 1000);
  assert.deepEqual([l.commission, l.database, l.difference, l.percent, l.agree], [145.71, 151.74, 6.03, 4.1, false]);
  // The record's own arithmetic: the $16 fixed charge and 1,000 kWh at its November-to-April rate.
  assert.deepEqual(l.arithmetic, [{ label: 'fixed', amount: 16 }, { label: 'November to April tier 1', kwh: 1000, rate: 0.13574, amount: 135.74 }]);
  assert.ok(l.commissionLines.some((x) => x.label === 'Fuel Adjustment Clause' && x.amount === 31.72), 'the commission\'s lines are beside it');
  assert.match(e.urdb.url, /^https:\/\/apps\.openei\.org\/USURDB\/rate\/view\/68a0e45a5d08cbe7b70ed13a$/);
  const html = page();
  const section = new RegExp('data-scorecard-entry="LA\\|CLECO\\|Schedule RS"(.*?)</section>', 's').exec(html)[1];
  assert.match(section, /\$145\.71<\/td><td class="num mono">\$151\.74<\/td><td class="num mono">\+\$6\.03<\/td><td class="num mono">\+4\.1%/);
  assert.ok(section.includes(e.documentUrl) && section.includes(e.urdb.url));
});

test('untestable rate counted: kept out of every figure, with why', () => {
  const demco = card.untestable.find((u) => u.utility === 'DEMCO');
  assert.match(demco.why, /none of them Schedule R/);
  assert.ok(!card.entries.some((e) => e.utility === 'DEMCO'));
  assert.equal(card.counts.schedules.untestable, card.untestable.length);
  assert.equal(card.counts.figures.figures, card.entries.reduce((n, e) => n + e.levels.length, 0));
  assert.ok(card.untestable.filter((u) => u.state === 'FL').every((u) => u.why === 'not yet matched to a URDB record'));
});

test('no composite: counts and distributions only, entries in alphabetical order, and the page says why', () => {
  const keys = JSON.stringify(Object.keys(card.counts));
  assert.doesNotMatch(keys, /score|index|grade|rank|average|mean/i);
  assert.deepEqual(Object.keys(card.counts.byChargeType), CHARGE_TYPES);
  const order = card.entries.map((e) => `${e.state}|${e.utility}|${e.schedule}`);
  assert.deepEqual(order, [...order].sort((a, b) => a.localeCompare(b)), 'never ordered by the size of the difference');
  const html = page();
  assert.match(html, /data-no-composite>There is no single accuracy number here, and no ranking\./);
  assert.doesNotMatch(html.slice(html.indexOf('<main')).replace(/data-no-composite>[^<]*/, ''), /\b(score|grade|ranked|ranking)\b/i);
});

test('unresolved: neither source checked against the filed tariff, so the entry says we have not determined which is right', () => {
  const e = card.entries.find((x) => x.utility === 'CLECO');
  assert.equal(e.wording.kind, 'unresolved');
  assert.match(e.wording.text, /disagree\. Neither has been checked against the filed tariff sheet, so we have not determined which is right\./);
  assert.doesNotMatch(e.wording.text, /wrong|error/);
});

test('confirmed, then reported later: the finding names the reader and date, and the report adds its date without moving a figure', () => {
  const finding = { state: 'LA', utility: 'CLECO', schedule: 'Schedule RS', verdict: 'database-wrong', reader: 'A maintainer', date: '2026-11-21', finding: 'the record has no fuel adjustment clause' };
  const before = scorecard(docs, CROSSWALK, records, [finding]).entries.find((x) => x.utility === 'CLECO');
  assert.equal(before.wording.kind, 'found-database-wrong');
  assert.match(before.wording.text, /A maintainer read the filed tariff sheet on 2026-11-21 and found URDB's record wrong: the record has no fuel adjustment clause\. Not yet reported to URDB\./);
  const after = scorecard(docs, CROSSWALK, records, [{ ...finding, reported: { date: '2026-11-25', reference: 'OpenEI issue 123' } }]).entries.find((x) => x.utility === 'CLECO');
  assert.match(after.wording.text, /Reported to URDB on 2026-11-25 \(OpenEI issue 123\)\./);
  assert.deepEqual(after.levels, before.levels, 'the published figures do not move');
  assert.equal(wording({ ...before, levels: before.levels.map((l) => ({ ...l, agree: true })) }).kind, 'agree');
});

test('our result shown: our engine\'s counts sit beside URDB\'s, with the same breakdowns', () => {
  assert.deepEqual(Object.keys(engine), Object.keys(card.counts));
  assert.deepEqual(Object.keys(engine.byChargeType), Object.keys(card.counts.byChargeType));
  assert.equal(engine.figures.figures, committedVectors(ROOT).length);
  assert.equal(engine.figures.disagree, 0);
  const html = page();
  assert.match(html, /<th scope="col" class="num">URDB records<\/th><th scope="col" class="num">Our engine<\/th>/);
  assert.match(html, new RegExp(`Bills compared</th><td class="num mono">${card.counts.figures.figures}</td><td class="num mono">${engine.figures.figures}</td>`));
  assert.deepEqual(counts([], 0).figures, { figures: 0, agree: 0, disagree: 0 });
});
