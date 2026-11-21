// Our on-device degree days against the publisher's own monthly series (add-weather-normalization 1.3): base-65
// heating and cooling degree days summed from the daily means our models use, for five first-order stations in
// five states and 24 months, agree with NOAA's Global Summary of the Month (published in Celsius degree days to
// 0.1, so within 0.18 °F degree days) in every month both have. NOAA's divisional series is not the target: it
// is derived from adjusted temperatures by a statistical algorithm and weighted by population (its divisional
// readme), and docs/derivations/weather-normalization.md records how far apart the two are.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readShard } from '../../../core/lib/shard.mjs';
import { degreeDays } from '../../../core/lib/weather-model.mjs';
import { monthlyDegreeDays, readClimdiv, withinDivisionMargin } from '../../../pipeline/lib/division-degree-days.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const GSOM = JSON.parse(readFileSync(join(ROOT, 'verify/reference/weather/gsom-5-stations.json'), 'utf8'));
const STATE = { USW00003017: 'CO', USW00023174: 'CA', USW00012839: 'FL', USW00013874: 'GA', USW00013960: 'TX' };
const version = JSON.parse(readFileSync(join(ROOT, 'data/ghcn-daily/current.json'), 'utf8')).version;
const shard = (st) => readShard(readFileSync(join(ROOT, 'data/ghcn-daily', version, 'daily', `${st}.bin`))).rows();

test('base 65 °F: a day of 80 and 56 °F is 3 cooling and 0 heating degree days', () => {
  assert.deepEqual(degreeDays(80, 56, 65), { hdd: 0, cdd: 3 });
});

test('five stations, five states, 24 months: every month both publish agrees within GSOM\'s rounding', () => {
  assert.deepEqual(Object.keys(GSOM.stations).sort(), Object.keys(STATE).sort());
  for (const [station, st] of Object.entries(STATE)) {
    const ours = monthlyDegreeDays(shard(st), station);
    let compared = 0;
    for (const [ym, g] of Object.entries(GSOM.stations[station].months)) {
      const o = ours.get(ym);
      if (!o || g.htdd === '' || g.cldd === '') continue;
      compared++;
      assert.ok(Math.abs(o.hdd - Number(g.htdd) * 1.8) <= 0.18 + 1e-9, `${station} ${ym} heating: ours ${o.hdd.toFixed(2)}, NOAA ${(Number(g.htdd) * 1.8).toFixed(2)}`);
      assert.ok(Math.abs(o.cdd - Number(g.cldd) * 1.8) <= 0.18 + 1e-9, `${station} ${ym} cooling: ours ${o.cdd.toFixed(2)}, NOAA ${(Number(g.cldd) * 1.8).toFixed(2)}`);
    }
    assert.ok(compared >= 23, `${station}: only ${compared} months compared`);
  }
});

test('a month missing a day is not counted, so a partial month never stands in for a whole one', () => {
  const rows = shard('CO').filter((r) => r.station === 'USW00003017');
  const full = monthlyDegreeDays(rows, 'USW00003017');
  const jan = Date.UTC(2025, 0, 15) / 86_400_000;
  const holed = monthlyDegreeDays(rows.filter((r) => r.day !== jan), 'USW00003017');
  assert.ok(full.has('2025-01') && !holed.has('2025-01'));
});

test('the division margin and NOAA\'s file layout are read as its readme gives them', () => {
  assert.equal(withinDivisionMargin(105, 100), true);
  assert.equal(withinDivisionMargin(206, 196), true);
  assert.equal(withinDivisionMargin(215, 200), false);
  const m = readClimdiv('0502252025  1457.  977.   930. -9999. -9999. -9999. -9999. -9999. -9999. -9999. -9999. -9999.\n', ['0502']);
  assert.deepEqual([...m], [['0502|2025-01', 1457], ['0502|2025-02', 977], ['0502|2025-03', 930]]);
});
