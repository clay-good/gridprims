// The reliability cohort table as a download (add-reliability-tools 4.1,
// "Cohort data downloadable"): the built site serves it as CSV and JSON with
// its source credit, data year, derivation date, and license, kept out of the
// offline shell, and registered in the ledger as one of our own datasets.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sharedSite } from '../../lib/shared-site.mjs';
import ours from '../../../data/curated/our-datasets.mjs';

const out = await sharedSite();

test('the cohort table downloads with its credit, data year, derivation date, and license', () => {
  const json = JSON.parse(readFileSync(join(out, 'reliability/cohorts.json'), 'utf8'));
  assert.equal(json.publisher, 'gridprims');
  assert.equal(json.license, 'CC BY 4.0');
  assert.match(json.source, /^U\.S\. Energy Information Administration, Form EIA-861, reliability schedule \(served version \d{4}-\d{2}\)$/);
  assert.equal(json.dataYear, 2025);
  assert.match(json.derived, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(json.cohorts.length > 50);
  const csv = readFileSync(join(out, 'reliability/cohorts.csv'), 'utf8').split('\n');
  assert.match(csv[0], /^# U\.S\. Energy Information Administration, Form EIA-861, .*; data year 2025; derived \d{4}-\d{2}-\d{2} by gridprims; CC BY 4\.0\./);
  assert.equal(csv[1], 'method,basis,ownership,size,division,name,saidi_n,saidi_q1,saidi_median,saidi_q3,saifi_n,saifi_q1,saifi_median,saifi_q3');
  assert.equal(csv.filter((l) => l && !l.startsWith('#')).length - 1, json.cohorts.length);
  // A download, not part of the offline shell.
  assert.doesNotMatch(readFileSync(join(out, 'sw.js'), 'utf8'), /reliability\/cohorts/);
  assert.ok(ours.some((d) => d.id === 'gridprims-reliability-cohorts' && d.from === 'eia-861'));
});
