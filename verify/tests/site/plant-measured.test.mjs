// The plant page's measured section (add-measured-plant-emissions 2.1 to 2.3):
// measured figures beside the estimated ones with both years named, the
// coverage share on every measured figure, the shared-stack flag, and a plant
// with no monitored unit saying so.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { plantPages } from '../../../site/entities/plants.mjs';
import { plantPage } from '../../../site/templates/plant.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { measuredRateLbMwh } from '../../../core/lib/measured-emissions.mjs';

const i18n = createI18n(strings, 'en-US');
const all = plantPages(join(ROOT, 'data'));
const byId = new Map(all.plants.map((p) => [p.id, p]));
const page = (id) => String(plantPage({ plant: byId.get(id), sources: all.sources, i18n }));
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const whole = (x) => Math.round(x).toLocaleString('en-US');

test('the measured dataset reaches the plant pages that carry monitors', () => {
  const monitored = all.plants.filter((p) => p.measured);
  assert.ok(monitored.length > 500, `${monitored.length} plants with measured emissions`);
  assert.ok(all.sources.camd, 'the CAMPD manifest travels with the pages');
});

test('measured beside estimated: both appear, with both sources and both years', () => {
  const p = byId.get(3); // Barry, Alabama: nine monitored units
  const html = text(page(3));
  const y = p.measured.latest;
  assert.match(html, new RegExp(`Carbon dioxide measured in ${y.year} ${whole(y.co2_tonnes)} metric tons`));
  assert.match(html, new RegExp(`${whole(measuredRateLbMwh(y.co2_tonnes, y.gross_load_mwh))} lb/MWh`));
  // The estimate is still there, and the page says which is which.
  assert.match(html, /Carbon dioxide in 2023/);
  assert.match(html, new RegExp(`The measured figures are from EPA's monitors for ${y.year}\\. The emissions above are eGRID2023[^.]*estimates for 2023\\. One is a measurement, the other an estimate`));
  // Both publishers are stamped on the page.
  assert.match(html, /Clean Air Markets Program Data/);
  assert.match(html, /Emissions & Generation Resource Integrated Database/);
});

test('coverage travels with the figures: the monitored share of the plant, and of its generation', () => {
  const p = byId.get(3);
  const c = p.measured.coverage;
  const html = text(page(3));
  assert.ok(c.monitoredMw > 0 && c.generationShare > 0);
  assert.match(html, /The monitored units are [\d,.]+ MW of this plant's [\d,.]+ MW of operating capacity, or \d+%\./);
  assert.match(html, /Their measured gross load in \d{4} was \d+% of the net generation the plant reported for \d{4}\./);
  // A plant the monitors cover only partly says so with its own share.
  const partial = all.plants.find((x) => x.measured?.coverage.capacityShare && x.measured.coverage.capacityShare < 0.75 && x.measured.coverage.generationShare);
  assert.ok(partial, 'some plant is only partly monitored');
  const share = Math.round(partial.measured.coverage.capacityShare * 100);
  assert.match(text(page(partial.id)), new RegExp(`of operating capacity, or ${share}%`));
});

test('units that share a stack are flagged, with what the flag means', () => {
  const p = byId.get(3);
  assert.ok(p.measured.units.some((u) => u.apportioned));
  const html = text(page(3));
  assert.match(html, /Shares a stack/);
  assert.match(html, /EPA divides one measured total between them, so their unit figures are a share of a measurement/);
  // A plant with no shared stack carries no flag.
  const alone = all.plants.find((x) => x.measured && !x.measured.apportioned);
  assert.doesNotMatch(text(page(alone.id)), /EPA divides one measured total/);
});

test('a plant with no monitored unit says so, and keeps its estimated figures', () => {
  const p = all.plants.find((x) => !x.measured && x.emissions && x.emissions.co2MetricTons !== null);
  const html = text(page(p.id));
  assert.match(html, /Measured at the stack Continuous monitors cover large fossil units in EPA's trading programs/);
  assert.match(html, /No unit at this plant is among them/);
  assert.match(html, new RegExp(`Carbon dioxide in ${p.emissions.year}`));
  assert.doesNotMatch(html, /By monitored unit/);
});

test('every month and unit row of the latest year is on the page', () => {
  const p = byId.get(3);
  const html = text(page(3));
  for (const row of p.measured.monthly) assert.match(html, new RegExp(`${whole(row.co2_tonnes)}`), `month ${row.month}`);
  for (const u of p.measured.units) assert.match(html, new RegExp(`${u.unit_id}`), `unit ${u.unit_id}`);
  assert.equal(p.measured.monthly.length, 12);
});
