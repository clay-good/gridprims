// State and eGRID subregion pages (public grid data task 4.1, the parts that
// do not wait on EIA-930; task 2.2's thin-record scenario).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { utilityPages } from '../../../site/entities/utilities.mjs';
import { STATE_NAMES, queueType, regionPages } from '../../../site/entities/regions.mjs';
import { statePage, subregionPage } from '../../../site/templates/region.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';

const i18n = createI18n(strings, 'en-US');
const utilities = utilityPages(join(ROOT, 'data'));
const regions = regionPages(join(ROOT, 'data'), utilities.utilities);
const state = (code) => regions.states.find((s) => s.code === code);
const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('one page per state and DC, and per eGRID subregion', () => {
  assert.deepEqual(regions.states.map((s) => s.code).sort(), Object.keys(STATE_NAMES).sort());
  assert.equal(regions.states.length, 51);
  assert.equal(regions.subregions.length, 27);
});

test('a state page shows the customer shares of investor-owned, cooperative, and public utilities, with the EIA-861 year', () => {
  const tx = state('TX');
  const html = text(statePage({ state: tx, sources: regions.sources, i18n }));
  assert.match(html, /Who serves its customers, 2025/);
  for (const g of ['Investor owned', 'Cooperative', 'Public \\(municipal, state, federal, and districts\\)']) assert.match(html, new RegExp(`${g} [\\d,]+ \\d+\\.\\d%`));
  const sum = Object.values(tx.shares).reduce((a, b) => a + b, 0);
  assert.equal(sum, tx.customers);
  assert.match(html, /Electric Reliability|ERCO/);
});

test('a utility too thin for its own page is listed on its state page with what it reported, unlinked', () => {
  const thin = utilities.utilities.find((u) => !u.page && u.states.length > 1 && u.totalSales > 0);
  const sales = readdirSync(join(ROOT, 'data/eia-861/2026-10/sales')).flatMap((f) => readShard(readFileSync(join(ROOT, 'data/eia-861/2026-10/sales', f))).rows());
  let listed = 0;
  for (const st of thin.states) {
    const inState = sales.filter((r) => r.utility_id === thin.id && r.state === st).reduce((n, r) => n + (r.tot_sales ?? 0), 0);
    if (!inState) continue;
    const html = String(statePage({ state: state(st), sources: regions.sources, i18n }));
    const row = html.split('<tr>').find((r) => r.includes(`<th scope="row">${thin.name.replace(/&/g, '&amp;')}</th>`));
    assert.ok(row, `${thin.name} is listed in ${st}`);
    assert.match(row, new RegExp(`>${Math.round(inState).toLocaleString('en-US')}<`), `${st} shows that state's sales, not the national total`);
    assert.doesNotMatch(row, /href=/);
    listed++;
  }
  assert.ok(listed > 1, 'a multi-state utility is listed in each state with its own figures');
});

test('the state queue summary is active capacity from Queued Up, credited, as of the end of 2025', () => {
  const dir = join(ROOT, 'data/lbnl-queued-up/2026-10/requests');
  const tx = readShard(readFileSync(join(dir, 'TX.bin'))).rows().filter((r) => r.q_status === 'active');
  const solar = tx.filter((r) => queueType(r.type_clean) === 'solar').reduce((n, r) => n + (r.mw_1 ?? 0), 0);
  assert.equal(state('TX').queue.solar.mw, solar);
  const html = text(statePage({ state: state('TX'), sources: regions.sources, i18n }));
  assert.match(html, /Interconnection queue, as of the end of 2025/);
  assert.match(html, /Credit: Lawrence Berkeley National Laboratory and GridTracker\./);
  assert.deepEqual(['Solar', 'Solar+Battery', 'Battery', 'Offshore Wind', 'Gas', 'Nuclear', null].map(queueType), ['solar', 'hybrid', 'storage', 'wind', 'gas', 'other', 'other']);
});

test('a subregion\'s emission rates come with the guidance sentence and the eGRID edition', () => {
  const erct = regions.subregions.find((s) => s.subregion === 'ERCT');
  const html = text(subregionPage({ subregion: erct, sources: regions.sources, i18n }));
  assert.match(html, /Total output carbon dioxide rate 734 lb\/MWh/);
  assert.match(html, /Non-baseload carbon dioxide rate 1,243 lb\/MWh/);
  assert.match(html, /Use the total output rate \(eGRID2023 \(revision 2\)\) for location-based Scope 2 reporting\./);
  assert.match(html, /Use the non-baseload rate \(eGRID2023 \(revision 2\)\) to estimate emissions avoided by saving or making power\./);
  assert.ok(erct.plants > 500);
});

test('a state\'s prices are the same state averages checked against EIA\'s Table 2.10', () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eia-electric-power-annual-2025.json'), 'utf8')).values.averagePriceCentsPerKwhByState.values;
  for (const s of regions.states) assert.ok(Math.abs(Math.round(s.prices.res * 100) / 100 - ref[s.code].residential) <= 0.01, s.code);
  assert.ok(readdirSync(join(ROOT, 'data')).includes('lbnl-queued-up'));
});
