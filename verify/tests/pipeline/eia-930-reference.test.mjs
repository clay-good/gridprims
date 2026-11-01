// The shipped EIA-930 shards against five region-hours read apart from our
// JavaScript (add-hourly-carbon 1.1): EIA's workbook through openpyxl and its
// separate six-month BALANCE file through Python's csv module
// (verify/tools/eia-930-samples.py). Megawatt-hours match exactly; CO2 and
// intensity match to float32's seven significant digits.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { readShard } from '../../../core/lib/shard.mjs';

const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eia-930-samples.json'), 'utf8'));
const cur = join(ROOT, 'data/eia-930/current.json');
const version = existsSync(cur) && JSON.parse(readFileSync(cur, 'utf8')).version;
// Float32 keeps seven significant digits: CO2 within 1e-6 of its size, intensity within 1e-7 lb/kWh.
const TOLERANCE = { intensity_generated: 1e-7, intensity_consumed: 1e-7 };
const within = (k, got, want) => Math.abs(got - want) <= (k === 'co2_generated' ? Math.abs(want) * 1e-6 : TOLERANCE[k] ?? 0);

test('five region-hours equal EIA\'s published values, and its two products agree on them', { skip: !version && 'eia-930 is not built' }, () => {
  assert.equal(ref.samples.length, 5);
  for (const s of ref.samples) {
    const hour = Date.parse(`${s.hourStart}Z`) / 3_600_000;
    const shard = readShard(readFileSync(join(ROOT, 'data/eia-930', version, 'hourly', `${s.ba}-${s.hourStart.slice(0, 4)}.bin`)));
    const got = shard.rows().find((r) => r.hour === hour);
    assert.ok(got, `${s.ba} ${s.hourStart} is in its shard`);
    for (const [k, want] of Object.entries(s.workbook).filter(([k]) => k !== 'co2_consumed')) {
      assert.ok(within(k, got[k], want), `${s.ba} ${s.hourStart} ${k}: ${got[k]} against EIA's ${want}`);
    }
    for (const [k, want] of Object.entries(s.sixMonthCsv)) assert.equal(got[k], want, `${s.ba} ${s.hourStart} ${k} against the six-month file`);
  }
});

test('a full year for five regions: every 2024 hourly intensity matches EIA\'s within 0.01 lb/MWh on average', { skip: !version && 'eia-930 is not built' }, () => {
  for (const s of ref.samples) {
    const shard = readShard(readFileSync(join(ROOT, 'data/eia-930', version, 'hourly', `${s.ba}-2024.bin`)));
    const v = shard.column('intensity_consumed').filter((x) => x !== null);
    const sum = v.reduce((a, b) => a + b * 1000, 0);
    assert.equal(v.length, s.year2024.hours, `${s.ba}: ${v.length} hours with intensity against EIA's ${s.year2024.hours}`);
    assert.ok(Math.abs(sum - s.year2024.sumLbPerMwh) <= 0.01 * v.length, `${s.ba}: sum ${sum} against ${s.year2024.sumLbPerMwh}`);
  }
});
