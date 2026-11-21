// The CEII screen on the interconnection screens' outputs (add-interconnection-screens 6.2): the release-time
// screen runs on every column the dataset publishes and finds no infrastructure data, its record ships in
// screens.json with the rule and the date and no signature, and the deploy gate reads the interconnect folder.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sharedSite } from '../../lib/shared-site.mjs';
import { checkCeii } from '../../gates/ceii.mjs';
import { ceiiScreen } from '../../../pipeline/lib/ceii.mjs';
import { CSV_COLUMNS } from '../../../core/lib/screen-compare.mjs';
import OURS from '../../../data/curated/our-datasets.mjs';

const out = await sharedSite();
const entry = OURS.find((d) => d.id === 'gridprims-interconnect-screens');

test('the documented screen record ships with the dataset: rule, date, every column checked, passed, no signature', () => {
  const json = JSON.parse(readFileSync(join(out, 'interconnect/screens.json'), 'utf8'));
  const r = json.ceiiScreen;
  assert.equal(r.rule, '18 CFR 388.113');
  assert.equal(r.screened, json.asOf);
  assert.equal(r.infrastructure, false);
  assert.equal(r.columnsChecked, CSV_COLUMNS.length);
  assert.deepEqual([r.flagged, r.unconfirmed, r.passed], [[], [], true]);
  assert.match(r.note, /no facility, feeder, substation, line, or location/);
  assert.doesNotMatch(JSON.stringify(r), /sign|approv|reviewer/i, 'the screen waits on no one');
  assert.equal(entry.ceii.infrastructure, false);
});

test('the deploy gate reads the interconnect folder and finds nothing that locates a connection', () => {
  assert.deepEqual(checkCeii(out).filter((e) => e.startsWith('interconnect/')), []);
});

test('a column that would locate a connection fails the screen by name', () => {
  const r = ceiiScreen(entry, [{ name: 'screens', columns: [...CSV_COLUMNS, 'substation_name'].map((name) => ({ name })) }], '2026-11-21');
  assert.equal(r.passed, false);
  assert.deepEqual(r.flagged, ['screens.substation_name']);
});
