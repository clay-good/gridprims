// The siting read-out's join (siting/where-and-how-long): shares against the
// right denominator, the county queue with its guards, and the refusals.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COHORT_MIN, countyQueue, federalProcess, negativeTypes, sitingReadout, sizeAgainstUtility } from '../../../core/lib/siting.mjs';

const austin = { id: 1015, name: 'Austin Energy', year: 2025, salesMwh: 14572787, resKwh: 10019, peak: null, baPeak: { mw: 83679, year: 2025, code: 'ERCO', name: 'ERCOT' } };
const filer = { id: 99, name: 'Files Its Own', year: 2025, salesMwh: 10000000, resKwh: 10000, peak: { mw: 5000, year: 2025 }, baPeak: { mw: 83679, year: 2025, code: 'ERCO', name: 'ERCOT' } };

test('a size is measured against the utility\'s own peak when it files one', () => {
  const r = sizeAgainstUtility({ mw: 300 }, filer);
  assert.equal(r.peakBasis, 'utility');
  assert.equal(r.peakOwner, 'Files Its Own');
  assert.ok(Math.abs(r.peakShare - 6) < 1e-9, `${r.peakShare}% of a 5,000 MW peak`);
});

test('without a Form 714 peak the balancing authority is the denominator, and says so', () => {
  const r = sizeAgainstUtility({ mw: 300 }, austin);
  assert.equal(r.peakBasis, 'balancing-authority');
  assert.equal(r.peakOwner, 'ERCOT');
  assert.ok(Math.abs(r.peakShare - (300 / 83679) * 100) < 1e-9);
  // The share must never be presented as the utility's own.
  assert.notEqual(r.peakOwner, 'Austin Energy');
});

test('the sales comparison carries its load factor, its year, and a homes equivalent', () => {
  const r = sizeAgainstUtility({ mw: 300, loadFactor: 90 }, austin);
  assert.equal(r.energyMwh, 300 * 0.9 * 8760);
  assert.equal(r.salesYear, 2025);
  assert.ok(Math.abs(r.salesShare - (r.energyMwh / austin.salesMwh) * 100) < 1e-9);
  assert.ok(Math.abs(r.homes - (r.energyMwh * 1000) / austin.resKwh) < 1e-6);
});

test('a utility with no peak anywhere still gets the sales comparison', () => {
  const r = sizeAgainstUtility({ mw: 50 }, { ...austin, peak: null, baPeak: null });
  assert.equal(r.peakBasis, 'none');
  assert.equal(r.peakShare, null);
  assert.ok(r.salesShare > 0);
});

const stateFile = {
  state: 'TX', through: '2025-12-31', asOf: '2026-05-07', release: '2026-10',
  summary: { activeMw: 9, activeCount: 9, byType: {}, medianYears: 3, withdrawn: { share: 0.7, n: 900 } },
  counties: [
    { fips: '48453', county: 'Travis', summary: { activeMw: 631.89, activeCount: 8, byType: { storage: { mw: 610.19, count: 6 }, solar: { mw: -53.3, count: 1 } }, medianYears: 2.2, negative: { count: 1, mw: -53.3 }, withdrawn: null } },
    { fips: '48201', county: 'Harris', summary: { activeMw: 100, activeCount: 4, byType: {}, medianYears: 1.5, withdrawn: { share: 0.5, n: 40 } } },
  ],
};

test('a county below the cohort minimum reports no withdrawal share and offers the state\'s', () => {
  const q = countyQueue(stateFile, '48453');
  assert.equal(q.county, 'Travis');
  assert.equal(q.withdrawnShare, null);
  assert.equal(q.withdrawnBasis, 'state');
  assert.equal(q.stateWithdrawnShare, 0.7);
  assert.equal(q.stateWithdrawnCohort, 900);
  assert.ok(stateFile.counties[0].summary.activeCount < COHORT_MIN);
});

test('a county with a cohort reports its own share, labelled as the county\'s', () => {
  const q = countyQueue(stateFile, '48201');
  assert.equal(q.withdrawnBasis, 'county');
  assert.equal(q.withdrawnShare, 0.5);
  assert.equal(q.withdrawnCohort, 40);
});

test('every queue figure carries the period it describes, never a forecast', () => {
  const q = countyQueue(stateFile, '48453');
  assert.equal(q.through, '2025-12-31');
  assert.equal(q.asOf, '2026-05-07');
  assert.equal(q.medianYears, 2.2);
});

test('a county the file does not list is reported as not found, not as zero', () => {
  const q = countyQueue(stateFile, '48999');
  assert.equal(q.found, false);
  assert.equal(q.activeMw, null);
});

test('a negative published capacity is surfaced with its count, not corrected', () => {
  assert.deepEqual(negativeTypes(stateFile.counties[0].summary.byType), ['solar']);
  assert.deepEqual(negativeTypes({ storage: { mw: 5, count: 1 } }), []);
  const q = countyQueue(stateFile, '48453');
  // The county total is the publisher's own, negative row included.
  assert.equal(q.activeMw, 631.89);
  assert.deepEqual(q.negative, { count: 1, mw: -53.3 });
  assert.equal(countyQueue(stateFile, '48201').negative, null);
});

test('the federal small generator process applies to generation, never to load', () => {
  assert.deepEqual(federalProcess({ mw: 300, direction: 'load' }), { applies: false, reason: 'load' });
  // We do not know where a site sits relative to the substation, so the router is
  // asked with an unknown mainline and returns the ceiling that holds at any location.
  const small = federalProcess({ mw: 1.5, direction: 'generation' });
  assert.equal(small.applies, true);
  assert.equal(small.process, 'fast-track');
  const over = federalProcess({ mw: 3, direction: 'generation' });
  assert.equal(over.process, 'study');
  assert.equal(over.ceilingKw, 2000);
  assert.equal(over.mainlineWouldHelp, true);
  // Above the 20 MW the small generator procedures cover, it says so rather than guessing.
  assert.equal(federalProcess({ mw: 300, direction: 'generation' }).process, 'large');
});

test('the whole read-out joins a place, a size, and the county queue, biggest seller first', () => {
  const byId = new Map([[1015, austin], [99, { ...filer, salesMwh: 500 }]]);
  const place = { state: 'TX', county: { fips: '48453', name: 'Travis' }, utilities: [{ id: 99 }, { id: 1015 }], bas: ['ERCO'], subregions: ['ERCT'] };
  const r = sitingReadout({ mw: 300, direction: 'load' }, place, byId, stateFile);
  assert.deepEqual(r.utilities.map((u) => u.name), ['Austin Energy', 'Files Its Own']);
  assert.equal(r.queue.county, 'Travis');
  assert.deepEqual(r.negativeTypes, ['solar']);
  assert.equal(r.process.applies, false);
  assert.deepEqual(r.bas, ['ERCO']);
});

test('a place outside any state queue file still returns its utilities', () => {
  const byId = new Map([[1015, austin]]);
  const place = { state: 'XX', county: null, utilities: [{ id: 1015 }], bas: [], subregions: [] };
  const r = sitingReadout({ mw: 10, direction: 'generation' }, place, byId, null);
  assert.equal(r.queue, null);
  assert.equal(r.utilities.length, 1);
});
