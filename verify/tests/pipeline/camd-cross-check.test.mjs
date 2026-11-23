// The shipped CAMPD monthly unit totals against EPA's own published daily
// summaries (add-measured-plant-emissions 1.5): twelve monitored units across
// three states and two years, summed from EPA's daily bulk files by Python
// (verify/tools/camd-published-summaries.py). EPA's daily files aggregate the
// same hourly records our pipeline reads, so a month that matches checks our
// reading against EPA's own.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { readShard } from '../../../core/lib/shard.mjs';

const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/camd-published-summaries.json'), 'utf8'));
const cur = join(ROOT, 'data/epa-camd/current.json');
const version = existsSync(cur) && JSON.parse(readFileSync(cur, 'utf8')).version;
// Our sums add about 8,760 hourly values; EPA's add 365 daily ones it has already
// rounded, so the two land close rather than on the same bit. EPA's daily files
// carry sulfur dioxide and nitrogen oxides as short tons to three decimals, which
// is up to a pound of rounding a day, so a month of them is allowed 31 pounds. A
// month whose whole total is a few pounds is therefore not meaningfully checked
// here; the months that carry the emissions are.
const FLOOR = { so2_lbs: 31, nox_lbs: 31 };
const near = (field, got, want) => Math.abs(got - want) <= Math.max(Math.abs(want) * 2e-6, FLOOR[field] ?? 0.02);

test('ten or more units, three states, two years match EPA\'s published summaries', { skip: !version && 'epa-camd is not built' }, () => {
  assert.ok(ref.units.length >= 10, `${ref.units.length} units`);
  assert.equal(new Set(ref.units.map((u) => u.state)).size, 3);
  assert.equal(ref.years.length, 2);
  const rows = new Map();
  for (const state of new Set(ref.units.map((u) => u.state))) {
    for (const r of readShard(readFileSync(join(ROOT, 'data/epa-camd', version, 'units_monthly', `${state}.bin`))).rows()) {
      rows.set(`${r.plant_id}|${r.unit_id}|${r.year}|${r.month}`, r);
    }
  }
  let compared = 0;
  const off = [];
  for (const [key, want] of Object.entries(ref.months)) {
    const got = rows.get(key);
    if (!got) { off.push(`${key}: no monthly row`); continue; }
    for (const field of ['co2_tonnes', 'so2_lbs', 'nox_lbs', 'heat_input_mmbtu', 'gross_load_mwh', 'operating_hours']) {
      compared++;
      if (!near(field, got[field], want[field])) off.push(`${key} ${field}: ${got[field]} against EPA's ${want[field]}`);
    }
  }
  assert.deepEqual(off, []);
  assert.ok(compared >= 1000, `${compared} values compared`);
});
