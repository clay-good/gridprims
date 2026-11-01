// The hourly carbon files the site builds (add-hourly-carbon): every region's
// shards by year, and typical July medians and quartiles that match an
// independent Python computation over the same snapshot within 0.1 lb/MWh
// for three regions (verify/tools/eia-930-typical.py).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { carbonData } from '../../../site/entities/carbon.mjs';

const built = existsSync(join(ROOT, 'data/eia-930/current.json'));
const carbon = built ? carbonData(join(ROOT, 'data')) : null;

test('the region list names every region with its shards, zone, and typical years', { skip: !built && 'eia-930 is not built' }, () => {
  const { regions } = carbon.regions;
  // Every region with hourly rows; GRMA's workbook has none since July 2018.
  assert.ok(regions.length >= 67, `${regions.length} regions`);
  const pjm = regions.find((r) => r.ba === 'PJM');
  assert.equal(pjm.zone, 'America/New_York');
  assert.match(pjm.shards['2024'].path, /^\/data\/eia-930\/\d{4}-\d{2}\/hourly\/PJM-2024\.bin$/);
  assert.equal(pjm.typicalYears.length, 3);
  // A generation-only region has no consumption-based intensity of its own load, so no typical hours.
  assert.equal(regions.find((r) => r.ba === 'YAD').generationOnly, true);
});

test('typical July medians and quartiles match the independent computation within 0.1 lb/MWh', { skip: !built && 'eia-930 is not built' }, () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eia-930-typical-july.json'), 'utf8'));
  for (const [ba, hours] of Object.entries(ref.regions)) {
    const typ = carbon.typical.get(ba);
    assert.deepEqual(typ.years, ref.years, `${ba} typical years`);
    const july = typ.months[6].hours;
    for (const want of hours) {
      const got = july[want.hour];
      assert.equal(got.n, want.n, `${ba} ${want.hour}:00 count`);
      for (const k of ['q1', 'median', 'q3']) assert.ok(Math.abs(got[k] - want[k]) <= 0.1, `${ba} ${want.hour}:00 ${k}: ${got[k]} against ${want[k]}`);
    }
  }
});
