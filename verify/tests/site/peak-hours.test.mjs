// What ran in a region's highest-demand hours (add-measured-plant-emissions
// 2.4): the hours EIA's demand picks, the units EPA's monitors recorded in
// them, their generation, their measured carbon dioxide, and the rate that
// implies, with the hour on the region's own clock.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { loadPeakHours, peakHoursFor } from '../../../site/entities/peak-hours.mjs';
import { balancingPage } from '../../../site/templates/balancing.mjs';
import { balancingPages } from '../../../site/entities/balancing.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { PEAK_HOURS } from '../../../pipeline/normalize/camd-peak-hours.mjs';

const i18n = createI18n(strings, 'en-US');
const peak = loadPeakHours(join(ROOT, 'data'));
const skip = !peak && 'the epa-camd peak-hour table is not built';
const text = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('each region\'s busiest hours are at most ten a year, ranked, each with its demand', { skip }, () => {
  assert.ok(peak.byRegion.size > 20, `${peak.byRegion.size} regions`);
  for (const region of peak.byRegion.keys()) {
    for (const year of peakHoursFor(peak, region)) {
      assert.ok(year.hours.length <= PEAK_HOURS, `${region} ${year.year}: ${year.hours.length} hours`);
      assert.deepEqual(year.hours.map((h) => h.rank), year.hours.map((h, i) => h.rank).sort((a, b) => a - b));
      for (const h of year.hours) {
        assert.ok(h.demandMwh > 0, `${region} ${year.year} rank ${h.rank} has the region's demand`);
        assert.ok(h.units.length > 0, 'only hours with monitored units are kept');
        // Every unit that ran, with its own measured figures and the rate they imply.
        for (const u of h.units) {
          assert.ok(u.operating_hours > 0);
          assert.ok(['col', 'ng', 'oil', 'oth'].includes(u.fuel));
          // The shipped rate against the shipped tonnes and megawatt-hours, each rounded to six decimals:
          // a very small hour of load leaves a wide relative gap, so the bound is relative.
          if (u.gross_load_mwh > 0) {
            const want = (u.co2_tonnes * 2204.62262185) / u.gross_load_mwh;
            assert.ok(Math.abs(u.rate_lb_mwh - want) <= Math.max(0.01, Math.abs(want) * 1e-3), `${u.plant_id} ${u.unit_id}: ${u.rate_lb_mwh} against ${want}`);
          }
        }
        assert.ok(Math.abs(h.grossLoadMwh - h.units.reduce((n, u) => n + u.gross_load_mwh, 0)) < 1e-6);
      }
    }
  }
});

test('a region page lists the hours, the demand, and the units that were running', { skip }, () => {
  const balancing = balancingPages(join(ROOT, 'data'));
  const region = balancing.regions.find((r) => peakHoursFor(peak, r.ba).length);
  const mine = peakHoursFor(peak, region.ba);
  const page = text(balancingPage({ region, manifest: balancing.manifest, utilities: [], plants: [], i18n, peak: mine, comparisonSource: peak.manifest }));
  const latest = mine[0];
  assert.match(page, /What ran in the busiest hours/);
  assert.match(page, new RegExp(`The ${latest.hours.length} hours of ${latest.year} with the most demand`));
  // The hour on the region's own clock, and the demand for it.
  assert.match(page, new RegExp(latest.hours[0].localStart.replace(/[-: ]/g, '[-: ]')));
  assert.match(page, new RegExp(Math.round(latest.hours[0].demandMwh).toLocaleString('en-US').replace(/,/g, ',')));
  // The busiest hour's units, with their fuels and measured figures.
  const unit = latest.hours[0].units[0];
  assert.match(page, new RegExp(`${unit.plant_id} ${unit.unit_id.replace(/[*]/g, '\\\\*')}`));
  assert.match(page, /Gross load is before the plant's own use/);
});

test('a region with no monitored unit carries no peak-hour section', { skip }, () => {
  const balancing = balancingPages(join(ROOT, 'data'));
  const region = balancing.regions.find((r) => !peakHoursFor(peak, r.ba).length);
  if (!region) return;
  const page = text(balancingPage({ region, manifest: balancing.manifest, utilities: [], plants: [], i18n, peak: [] }));
  assert.doesNotMatch(page, /What ran in the busiest hours/);
});
