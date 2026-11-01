// Balancing authority rollups (add-public-grid-data 1.2, 4.1, 4.2): daily
// demand against EIA's own published daily values for five regions over
// September 2026 within 0.5%, the record peak with its period, and the grid
// pulse equal to the latest daily values.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { balancingPages } from '../../../site/entities/balancing.mjs';
import { dailyRollup } from '../../../core/lib/grid-rollups.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { REPORT_ZONES } from '../../../pipeline/registry/eia-930.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const built = existsSync(join(ROOT, 'data/eia-930/current.json'));
const pages = built ? balancingPages(join(ROOT, 'data')) : null;

test('daily demand matches EIA\'s published daily values within 0.5% for five regions over 30 days', { skip: !built && 'eia-930 is not built' }, () => {
  const { version } = JSON.parse(readFileSync(join(ROOT, 'data/eia-930/current.json'), 'utf8'));
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eia-930-daily-2026-09.json'), 'utf8'));
  const off = [];
  for (const [ba, days] of Object.entries(ref.regions)) {
    const rows = readShard(readFileSync(join(ROOT, 'data/eia-930', version, 'hourly', `${ba}-2026.bin`))).rows();
    const ours = new Map(dailyRollup(rows, REPORT_ZONES[ba]).map((d) => [d.date, d]));
    assert.equal(Object.keys(days).length, 30);
    for (const [date, want] of Object.entries(days)) {
      const got = ours.get(date)?.energyMwh;
      const pct = Math.abs(got - want.demand) / want.demand * 100;
      if (!(pct <= 0.5)) off.push(`${ba} ${date}: ${got} against EIA's ${want.demand} (${pct.toFixed(2)}%)`);
    }
  }
  assert.deepEqual(off, []);
});

test('a region page\'s record peak names its date and the period searched, and the pulse is its latest days', { skip: !built && 'eia-930 is not built' }, () => {
  const pjm = pages.regions.find((r) => r.ba === 'PJM');
  assert.ok(pjm.record.mw > 140_000 && pjm.record.mw < 170_000, `PJM record ${pjm.record.mw} MW, not one of EIA's spikes`);
  assert.equal(pjm.record.from, '2018-07-01');
  assert.equal(pjm.days.length >= 390, true);
  assert.deepEqual(pjm.pulse, pjm.days.slice(-14).map((d) => ({ date: d.date, mw: d.peakMw })));
  assert.equal(pages.pulse.values.length, 14);
  assert.ok(pages.pulse.values.every((v) => v.mw > 300_000), 'the lower 48 total peaks above 300 GW every day');
});

test('the built PJM page states its record peak and links the dataset and its cleanest hours; every page\'s rail carries the dated pulse', { skip: !built && 'eia-930 is not built' }, async () => {
  const out = await sharedSite();
  const html = readFileSync(join(out, 'balancing-authorities/pjm/index.html'), 'utf8');
  const pjm = pages.regions.find((r) => r.ba === 'PJM');
  assert.match(html, new RegExp(`The highest daily peak in our data is ${Math.round(pjm.record.mw).toLocaleString('en-US')} MW, on .+, searched from July 1, 2018 to`));
  assert.match(html, /href="\/data\/eia-930\/"/);
  assert.match(html, /href="\/tools\/carbon\/load-shift\/estimate\/\?region=PJM"/);
  // The latest day in the table is the latest value the pulse data carries.
  assert.ok(html.includes(`<td>${pjm.pulse.at(-1).date}</td>`) || html.includes(`>${pjm.pulse.at(-1).date}<`));
  assert.equal(pages.pulse.asOf, pages.pulse.values.at(-1).date);
  const home = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(home, /Lower 48 daily peak demand, latest [\d,]+ MW/);
});
