// Every entity and the lookup through gridprims_query_data (public grid data
// task 7.0): 100 sampled answers, each checked against the page the site
// builds for the same entity from the same shards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from '../../../mcp/protocol.mjs';
import { ROOT, modern } from './mcp-helpers.mjs';
import { plantPages } from '../../../site/entities/plants.mjs';
import { utilityPages } from '../../../site/entities/utilities.mjs';
import { regionPages } from '../../../site/entities/regions.mjs';
import { plantPage } from '../../../site/templates/plant.mjs';
import { utilityPage } from '../../../site/templates/utility.mjs';
import { statePage, subregionPage } from '../../../site/templates/region.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';

const i18n = createI18n(strings, 'en-US');
const dir = join(ROOT, 'data');
const plants = plantPages(dir);
const utilities = utilityPages(dir);
const regions = regionPages(dir, utilities.utilities);
const server = createServer();
const ask = async (entity, id) => (await server.handle(modern(1, 'tools/call', { name: 'gridprims_query_data', arguments: { entity, id: String(id) } }))).result;
const every = (list, n) => Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]);
const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const whole = (x) => Math.round(x).toLocaleString('en-US');
const mw = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 1 });

test('100 sampled entity answers match their pages', async () => {
  let checked = 0;
  for (const p of every(plants.plants, 40)) {
    const r = await ask('plant', p.id);
    assert.equal(r.isError, false, `plant ${p.id}`);
    const e = r.structuredContent.entity;
    const page = text(plantPage({ plant: p, sources: plants.sources, i18n }));
    assert.ok(page.includes(e.name) && page.includes(`${mw(e.nameplateMw)} MW`), `plant ${p.id} name and capacity`);
    if (e.netMwh !== null) assert.ok(page.includes(`${whole(e.netMwh)} MWh`), `plant ${p.id} net generation`);
    if (e.capacityFactor?.value != null) assert.ok(page.includes(`${(e.capacityFactor.value * 100).toFixed(1)}%`), `plant ${p.id} capacity factor`);
    assert.equal(r.structuredContent.url, `https://gridprims.com/plants/${p.id}/`);
    checked++;
  }
  for (const u of every(utilities.utilities.filter((x) => x.page), 30)) {
    const e = (await ask('utility', u.id)).structuredContent.entity;
    const page = text(utilityPage({ utility: u, sources: utilities.sources, i18n }));
    assert.ok(page.includes(`Customers in 2025 ${whole(e.customers)}`) && page.includes(`${whole(e.totalSales)} MWh`), `utility ${u.id}`);
    checked++;
  }
  for (const s of every(regions.states, 10)) {
    const e = (await ask('state', s.code)).structuredContent.entity;
    const page = text(statePage({ state: s, sources: regions.sources, i18n }));
    for (const v of Object.values(e.shares)) assert.ok(page.includes(whole(v)), `state ${s.code} share ${v}`);
    checked++;
  }
  for (const s of every(regions.subregions, 10)) {
    const e = (await ask('subregion', s.subregion)).structuredContent.entity;
    const page = text(subregionPage({ subregion: s, sources: regions.sources, i18n }));
    if (e.co2_rate_lb_mwh !== null) assert.ok(page.includes(`${whole(e.co2_rate_lb_mwh)} lb/MWh`), `subregion ${s.subregion}`);
    checked++;
  }
  // The lookup page runs the same core function on the device; its stored cases come from the publishers' files.
  const cases = JSON.parse(readFileSync(join(ROOT, 'verify/reference/lookup-cases.json'), 'utf8')).cases;
  for (const c of every(cases, 10)) {
    const e = (await ask('zip', c.zip)).structuredContent.entity;
    assert.deepEqual([...e.utilities, ...e.marketers].map((u) => u.id).sort((a, b) => a - b), c.utilities, `zip ${c.zip}`);
    assert.deepEqual([...e.subregions].sort(), c.subregions, `zip ${c.zip}`);
    checked++;
  }
  assert.equal(checked, 100);
});

test('entity answers name their sources and fail with a fix', async () => {
  const r = await ask('plant', 3470);
  assert.ok(r.structuredContent.sources.some((s) => s.id === 'eia-860' && s.version === '2026-10'));
  const none = await ask('utility', 'nope');
  assert.equal(none.isError, true);
  assert.match(none.content[0].text, /No utility page for id "nope"/);
  const noId = (await server.handle(modern(1, 'tools/call', { name: 'gridprims_query_data', arguments: { entity: 'plant' } }))).result;
  assert.match(noId.content[0].text, /With entity, give an id/);
  const neither = (await server.handle(modern(1, 'tools/call', { name: 'gridprims_query_data', arguments: {} }))).result;
  assert.match(neither.content[0].text, /Give a dataset id/);
});
