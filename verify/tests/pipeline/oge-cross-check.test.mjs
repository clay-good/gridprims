// The hourly carbon cross-checks against Singularity's Open Grid Emissions
// (add-hourly-carbon 3.1; CC BY 4.0, verify/reference/oge/): a flat 1 MW load
// over 2024 priced on our EIA-930 intensities and on OGE's consumption-based
// rates, region by region, and the typical July day's hour-of-day medians for
// three regions over 2022 to 2024 (OGE's 2025 early release has no hourly
// carbon accounting). A gap over 10% fails unless
// docs/derivations/hourly-carbon-crosscheck.md documents it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { REGION_ZONES, quantile } from '../../../core/lib/hourly-carbon.mjs';
import { utcToLocal } from '../../../parsers/time.mjs';
import { tableRows } from '../../lib/walk.mjs';

const H = 3_600_000;
const cur = join(ROOT, 'data/eia-930/current.json');
const version = existsSync(cur) && JSON.parse(readFileSync(cur, 'utf8')).version;
const doc = readFileSync(join(ROOT, 'docs/derivations/hourly-carbon-crosscheck.md'), 'utf8');
/** Documented gaps: region-year (or region-July) keys from the doc's first table column. */
const documented = new Set(tableRows(doc).keys());

/** OGE's hourly consumed CO2 rate (lb/MWh) by UTC hour start. */
function oge(ba, year) {
  const text = gunzipSync(readFileSync(join(ROOT, 'verify/reference/oge', `${ba}-${year}.csv.gz`))).toString('utf8');
  const out = new Map();
  for (const line of text.trim().split('\n').slice(1)) {
    const [hour, rate] = line.split(',');
    if (rate !== '') out.set(Date.parse(`${hour}:00:00Z`) / H, Number(rate));
  }
  return out;
}
/** Our consumption-based intensity (lb/MWh) by UTC hour start. */
function ours(ba, year) {
  const sh = readShard(readFileSync(join(ROOT, 'data/eia-930', version, 'hourly', `${ba}-${year}.bin`)));
  const hour = sh.column('hour');
  const v = sh.column('intensity_consumed');
  return new Map(hour.map((h, i) => [h, v[i] === null ? null : v[i] * 1000]).filter(([, x]) => x !== null));
}

const EMISSIONS_REGIONS = ['CISO', 'ERCO', 'PJM', 'MISO', 'ISNE', 'NYIS', 'BPAT', 'SOCO'];

test('a flat 1 MW load over 2024: annual CO2 within 10% of the same load on OGE, or the gap documented', { skip: !version && 'eia-930 is not built' }, () => {
  const report = [];
  const undocumented = [];
  for (const ba of EMISSIONS_REGIONS) {
    const a = ours(ba, 2024);
    const b = oge(ba, 2024);
    // The same hours on both sides: 1 MWh in each hour both publish.
    let lbOurs = 0;
    let lbOge = 0;
    let hours = 0;
    for (const [h, x] of a) if (b.has(h)) { lbOurs += x; lbOge += b.get(h); hours++; }
    const pct = ((lbOurs - lbOge) / lbOge) * 100;
    report.push(`${ba}: ${pct.toFixed(1)}% over ${hours} hours`);
    assert.ok(hours > 8000, `${ba}: only ${hours} common hours`);
    if (Math.abs(pct) > 10 && !documented.has(`${ba}-2024`)) undocumented.push(`${ba} 2024 differs from OGE by ${pct.toFixed(1)}%`);
  }
  console.log(report.join('\n'));
  assert.deepEqual(undocumented, [], 'gaps over 10% must be documented in docs/derivations/hourly-carbon-crosscheck.md');
});

const TYPICAL_REGIONS = ['CISO', 'ERCO', 'PJM'];

test('typical July hour-of-day medians over 2022 to 2024, against OGE for the same regions and years', { skip: !version && 'eia-930 is not built' }, () => {
  const undocumented = [];
  for (const ba of TYPICAL_REGIONS) {
    const zone = REGION_ZONES[ba];
    const cells = (src) => {
      const c = Array.from({ length: 24 }, () => []);
      for (const y of [2022, 2023, 2024]) for (const [h, x] of src(ba, y)) { const l = utcToLocal(zone, h * H); if (l.month === 7 && l.year === y) c[l.hour].push(x); }
      return c.map((v) => quantile(v.sort((p, q) => p - q), 0.5));
    };
    const a = cells(ours);
    const b = cells(oge);
    const worst = Math.max(...a.map((x, i) => Math.abs((x - b[i]) / b[i]) * 100));
    console.log(`${ba} July: largest hour-of-day median gap ${worst.toFixed(1)}%`);
    if (worst > 10 && !documented.has(`${ba}-July`)) undocumented.push(`${ba} July medians differ from OGE by up to ${worst.toFixed(1)}%`);
  }
  assert.deepEqual(undocumented, [], 'gaps over 10% must be documented in docs/derivations/hourly-carbon-crosscheck.md');
});
