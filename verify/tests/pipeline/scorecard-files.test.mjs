// The scorecard is reproducible by anyone (add-tariff-conformance-suite 3.5): every URDB bill it publishes
// equals, to the cent, an independent recomputation from the raw URDB file by a Python program that shares no
// code with ours; the rerun covers exactly the published rate list, from the snapshot whose checksum the
// scorecard states; and the method, versions, checksums, rate list, and results are published as files.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { METHOD, loadScorecard, rateList, ratesCsv, resultsCsv, scorecardJson } from '../../../pipeline/lib/scorecard-files.mjs';
import { LIMITS } from '../../../site/entities/ground-truth.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const sc = loadScorecard(ROOT);
const rerun = JSON.parse(readFileSync(join(ROOT, 'verify/reference/scorecard/urdb-rerun.json'), 'utf8'));

test('independent rerun: every published URDB bill equals the Python recomputation to the cent', () => {
  let n = 0;
  for (const e of sc.card.entries) {
    const r = rerun.bills.find((b) => b.label === e.urdb.label && b.month === e.month);
    assert.ok(r, `${e.urdb.label} is not in the rerun: run verify/tools/scorecard-rates.mjs and scorecard-rerun.py again`);
    for (const l of e.levels) {
      n++;
      assert.equal(Math.round(l.database * 100), Math.round(r.levels.find((x) => x.kwh === l.kwh).bill * 100), `${e.utility} ${e.schedule} at ${l.kwh} kWh`);
    }
  }
  assert.equal(n, sc.card.counts.figures.figures);
  // The rate URDB gives to seven decimals is priced at seven: SLEMCO Rate 01 at 3,000 kWh is $219.53, not $219.52.
  assert.equal(sc.card.entries.find((e) => e.utility === 'SLEMCO' && e.schedule === 'Schedule 01').levels.find((l) => l.kwh === 3000).database, 219.53);
});

test('the rerun read the same snapshot the scorecard names, and covers exactly its rate list', () => {
  assert.equal(rerun.source.sha256, sc.versions.urdb.snapshot.sha256);
  assert.equal(createHash('sha256').update(readFileSync(join(ROOT, 'data/urdb', sc.versions.urdb.version, 'rates.csv.gz'))).digest('hex'), rerun.source.sha256);
  assert.deepEqual(rerun.bills.map((b) => [b.label, b.month, b.levels.map((l) => l.kwh)]), rateList(sc.card).map((r) => [r.label, r.month, r.kwh]));
});

test('the method, every input\'s version and checksum, the rate list, and the results are published', () => {
  const j = scorecardJson(sc, LIMITS);
  assert.deepEqual(j.method, METHOD);
  assert.match(j.versions.urdb.snapshot.sha256, /^[0-9a-f]{64}$/);
  assert.match(j.versions.vectors.sha256, /^[0-9a-f]{64}$/);
  assert.ok(j.versions.groundTruth.every((g) => /^[0-9a-f]{64}$/.test(g.sha256)) && j.versions.groundTruth.length >= 2);
  assert.equal(j.rates.length, sc.card.entries.length);
  assert.equal(resultsCsv(sc.card).trim().split('\n').length - 1, sc.card.counts.figures.figures);
  assert.equal(ratesCsv(sc.card).trim().split('\n').length - 1, sc.card.entries.length + sc.card.untestable.length);
});
