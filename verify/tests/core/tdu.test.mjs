// Texas TDU delivery charges (add-household-bill-check 1.3): two effective dates for each TDU, each read from
// its tariff book with the components summing to the totals; the version in force on a period's last day is
// the one used, and a change inside the period is named; the current versions agree with the TDU charges the
// stored EFLs print; and no Lubbock charge is given after the version we could not read took effect.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import VERSIONS from '../../../data/curated/tdu-rates.mjs';
import { TDUS, chargesFor, versionOn } from '../../../core/lib/tdu.mjs';
import { priceTotals } from '../../../core/lib/bill-totals.mjs';
import { EFLS } from '../../fixtures/bill/efls.mjs';

const sum = (xs, k) => Math.round(xs.reduce((t, x) => t + x[k], 0) * 1e6) / 1e6;

test('each version cites its tariff book, and its components sum to its totals', () => {
  for (const v of VERSIONS) {
    assert.ok(TDUS.includes(v.tdu), v.tdu);
    assert.match(v.url, /^https:\/\//);
    assert.match(v.sha256, /^[0-9a-f]{64}$/);
    assert.ok(v.page, `${v.tdu} ${v.effective}: the page`);
    assert.equal(sum(v.monthly, 'dollars'), v.total.dollarsPerMonth, `${v.tdu} ${v.effective} monthly`);
    assert.ok(Math.abs(sum(v.perKwh, 'cents') - v.total.centsPerKwh) < 0.00005 + 1e-9, `${v.tdu} ${v.effective} per kWh: the total is the components, rounded to four places at most`);
  }
});

test('two effective dates for every TDU but Lubbock, whose current sheet could not be read', () => {
  for (const t of TDUS.filter((x) => x !== 'lubbock')) assert.ok(VERSIONS.filter((v) => v.tdu === t).length >= 2, t);
});

test('the version in force: Oncor before and after 2026-10-04, and TNMP\'s December version only from December 1', () => {
  assert.equal(versionOn(VERSIONS, 'oncor', '2026-10-03').total.centsPerKwh, 6.0295);
  assert.equal(versionOn(VERSIONS, 'oncor', '2026-10-04').total.centsPerKwh, 6.8673);
  assert.equal(versionOn(VERSIONS, 'tnmp', '2026-11-30').total.centsPerKwh, 7.771);
  assert.equal(versionOn(VERSIONS, 'tnmp', '2026-12-01').total.centsPerKwh, 9.34);
  assert.equal(versionOn(VERSIONS, 'oncor', '2026-07-31'), null, 'nothing before the first version on file');
  assert.equal(versionOn(VERSIONS, 'lubbock', '2026-10-31').total.centsPerKwh, 6.312);
  assert.equal(versionOn(VERSIONS, 'lubbock', '2026-11-01'), null, 'Lubbock\'s 2026-11-01 sheet is not on file');
});

test('a billing period takes the version in force on its last day, and names a change inside it', () => {
  const r = chargesFor(VERSIONS, 'oncor', { start: '2026-09-20', end: '2026-10-19' });
  assert.equal(r.version.effective, '2026-10-04');
  assert.equal(r.changedMidPeriod, '2026-10-04');
  assert.deepEqual(r.charges, [{ label: 'Oncor Electric Delivery Company LLC delivery, per month', monthly: 4.06 }, { label: 'Oncor Electric Delivery Company LLC delivery, per kWh', perKwh: 0.068673 }].map((c, i) => ({ ...c, label: r.charges[i].label })));
  assert.equal(chargesFor(VERSIONS, 'oncor', { start: '2026-10-05', end: '2026-11-03' }).changedMidPeriod, null);
});

test('the current versions carry the TDU charges the stored EFLs print, and price their bills the same', () => {
  const area = { Oncor: 'oncor', CenterPoint: 'centerpoint', 'AEP Texas Central': 'aep-texas-central' };
  for (const e of EFLS) {
    const v = versionOn(VERSIONS, area[e.tduArea], e.date);
    assert.equal(v.total.dollarsPerMonth, e.tdu.monthly, `${e.id} monthly`);
    assert.equal(v.total.centsPerKwh / 100, e.tdu.perKwh, `${e.id} per kWh`);
    const period = { start: '2026-12-01', end: '2026-12-31' };
    const fromData = chargesFor(VERSIONS, area[e.tduArea], { start: e.date, end: e.date }).charges;
    const plan = (charges) => ({ seasons: [{ name: 'energy', from: '01-01', tiers: [{ rate: e.energyPerKwh }] }], charges });
    const typed = [{ label: 'a', monthly: e.tdu.monthly }, { label: 'b', perKwh: e.tdu.perKwh }];
    assert.equal(priceTotals({ ...period, kwh: 1000 }, plan(fromData)).totalCents, priceTotals({ ...period, kwh: 1000 }, plan(typed)).totalCents, e.id);
  }
});
