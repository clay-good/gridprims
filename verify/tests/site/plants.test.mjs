// Plant pages (public grid data tasks 3.1 and 3.2): one per plant with an
// operating or planned generator, its generation, prorated capacity factor,
// and emissions; county-level location only; 20 sampled plants checked
// against pyarrow's reading of PUDL's copy of EIA's tables.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { build } from '../../../site/build.mjs';
import { plantPages, served } from '../../../site/entities/plants.mjs';
import { plantPage } from '../../../site/templates/plant.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { capacityFactor, hoursInService } from '../../../core/lib/plant-math.mjs';
import { tempDir } from '../../lib/temp.mjs';

const i18n = createI18n(strings, 'en-US');
const all = plantPages(join(ROOT, 'data'));
const byId = new Map(all.plants.map((p) => [p.id, p]));
const page = (id) => String(plantPage({ plant: byId.get(id), sources: all.sources, i18n }));
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('pumped storage with negative net generation is a net consumer, with no capacity factor', () => {
  const bath = byId.get(6167);
  assert.ok(bath.netMwh < 0);
  assert.match(text(page(6167)), /Capacity factor Net consumer of energy/);
  assert.doesNotMatch(page(6167), /data-cf>[\d.]+%/);
});

test('a planned retirement shows in the generator row and counts under planned changes', () => {
  const html = text(page(6304));
  assert.match(html, /Planned retirement: 2026 \(reported to EIA\)/);
  assert.match(html, /Planned changes reported to EIA: \d+ planned retirements?/);
});

test('a generator that started this year is prorated by month, as the page shows', () => {
  const p = byId.get(6283);
  // Generators in service in 2025: operable at year end, and retired during the year.
  const g860 = served(join(ROOT, 'data'), 'eia-860', 'generators').rows.filter((g) => g.plant_id === 6283 && (g.category === 'operable' || (g.status === 'RE' && g.retirement_year === 2025)));
  const gens = g860.map((g) => ({ nameplateMw: g.nameplate_mw, hours: hoursInService(2025, { operatingYear: g.operating_year, operatingMonth: g.operating_month, retirementYear: g.retirement_year, retirementMonth: g.retirement_month }) }));
  assert.ok(gens.some((g) => g.hours < 8760), 'one generator was in service part of the year');
  const want = capacityFactor(p.netMwh, gens).value;
  assert.equal(p.capacityFactor.value, want);
  assert.match(page(6283), new RegExp(`data-cf>${(want * 100).toFixed(1)}%<`));
});

test('emissions are in metric tons with the factor shown; a late eGRID names both years; a plant eGRID lacks says so', () => {
  const parish = text(page(3470));
  assert.match(parish, /Carbon dioxide in 2023 9,903,390 metric tons/);
  assert.match(parish, /eGRID reports 10,916,619 short tons\. One short ton is 0\.90718474 metric tons\./);
  assert.match(parish, /Emissions are for 2023, the newest eGRID year\. Generation is for 2025, the newest EIA-923 year\./);
  assert.match(text(page(67957)), /This plant is not in eGRID2023 \(revision 2\)\./);
  assert.match(text(page(65028)), /Above 100%/);
});

test('content minimum: a plant whose every generator is canceled or retired gets no page', () => {
  const gens = served(join(ROOT, 'data'), 'eia-860', 'generators').rows;
  const monthly = new Set(served(join(ROOT, 'data'), 'eia-860m', 'generators').rows.filter((g) => g.category === 'operating' || g.category === 'planned').map((g) => g.plant_id));
  const byPlant = new Map();
  for (const g of gens) (byPlant.get(g.plant_id) ?? byPlant.set(g.plant_id, []).get(g.plant_id)).push(g);
  const dead = [...byPlant].filter(([id, list]) => list.every((g) => g.category === 'retired_or_canceled') && !monthly.has(id)).map(([id]) => id);
  assert.ok(dead.length > 100, `${dead.length} plants with only retired or canceled generators`);
  for (const id of dead) assert.equal(byId.has(id), false, `plant ${id} has a page`);
});

test('20 sampled plants match pyarrow\'s reading of EIA\'s tables within 0.1%', () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/pudl-v2026.10.0-plant-sample.json'), 'utf8'));
  assert.equal(ref.plants.length, 20);
  const version = all.sources.eia923.version;
  const off = (ours, theirs) => (theirs === 0 ? Math.abs(ours) : Math.abs(ours - theirs) / Math.abs(theirs));
  for (const want of ref.plants) {
    const p = byId.get(want.plant_id);
    // A sampled plant with no operating capacity and no generation is below the content minimum: no page.
    if (want.nameplate_mw === 0 && want.net_generation_mwh === null) { assert.equal(p, undefined, `plant ${want.plant_id} has no page`); continue; }
    assert.ok(p, `plant ${want.plant_id} has a page`);
    if (want.net_generation_mwh !== null) assert.ok(off(p.netMwh, want.net_generation_mwh) <= 0.001, `plant ${want.plant_id}: our ${p.netMwh} MWh, EIA's ${want.net_generation_mwh} MWh (snapshot ${version})`);
    assert.ok(off(p.nameplateMw, want.nameplate_mw) <= 0.001, `plant ${want.plant_id}: our ${p.nameplateMw} MW, EIA's ${want.nameplate_mw} MW (snapshot ${version})`);
  }
});

test('no plant page carries a coordinate, and every page counted in the build exists', async () => {
  const out = tempDir('gridprims-plants-');
  await build({ outDir: out });
  assert.match(readFileSync(join(out, 'plants/3/index.html'), 'utf8'), /<dd><a href="\/utilities\/195\/">Alabama Power Co<\/a><\/dd>/, 'the operator links to its utility page');
  const ids = readdirSync(join(out, 'plants'));
  assert.equal(ids.length, all.plants.length);
  for (const id of ids) {
    const html = readFileSync(join(out, 'plants', id, 'index.html'), 'utf8');
    // Plant names hold the words ("Latitude Solar Center", "Lon Wright"), so look for a coordinate label with a value.
    assert.doesNotMatch(html, /\b(lat|lon|latitude|longitude)\b\s*[:=]\s*-?\d/i, `plant ${id}`);
    // A decimal degree has four or more decimals; the only such number on a page is the ton factor.
    assert.deepEqual([...html.matchAll(/-?\d{1,3}\.\d{4,}/g)].map((m) => m[0]).filter((x) => x !== '0.90718474'), [], `plant ${id}`);
  }
});

test('content minimum: a plant with only proposed generators gets no page until one operates', () => {
  const gens = served(join(ROOT, 'data'), 'eia-860', 'generators').rows;
  const operating = new Set([...gens.filter((g) => g.category === 'operable'), ...served(join(ROOT, 'data'), 'eia-860m', 'generators').rows.filter((g) => g.category === 'operating')].map((g) => g.plant_id));
  const proposedOnly = [...new Set(gens.filter((g) => g.category === 'proposed').map((g) => g.plant_id))].filter((id) => !operating.has(id));
  assert.ok(proposedOnly.length > 100, `${proposedOnly.length} proposed-only plants`);
  for (const id of proposedOnly) assert.equal(byId.has(id), false, `plant ${id} has a page`);
});
