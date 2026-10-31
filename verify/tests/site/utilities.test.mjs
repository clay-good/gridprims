// Utility pages (public grid data tasks 2.1 and 2.2): average price only for
// full service, delivery-only revenue labeled as such, peak, reliability,
// operated generation, rates, and the content minimum; state prices checked
// against EIA's own Table 2.10.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { SECTORS, centsPerKwh, utilityPages } from '../../../site/entities/utilities.mjs';
import { comparison, utilityPage } from '../../../site/templates/utility.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';

const i18n = createI18n(strings, 'en-US');
const all = utilityPages(join(ROOT, 'data'));
const byId = new Map(all.utilities.map((u) => [u.id, u]));
const page = (u) => String(utilityPage({ utility: typeof u === 'number' ? byId.get(u) : u, sources: all.sources, i18n, plantHasPage: () => true }));
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const empty = () => Object.fromEntries(SECTORS.map((s) => [s, { revenue: 0, sales: 0, customers: 0 }]));

test('average price is computed, and "How we got this" shows the division', () => {
  assert.equal(centsPerKwh(50_000, 400_000), 12.5);
  const kinds = { bundled: { ...empty(), res: { revenue: 50_000, sales: 400_000, customers: 30_000 } } };
  const u = { ...byId.get(195), kinds, prices: { bundled: { res: 12.5, com: null, ind: null, trn: null } }, stateAverage: { res: 12.5 } };
  const html = text(page(u));
  assert.match(html, /Residential 30,000 400,000 \$50,000,000 12\.50/);
  assert.match(html, /\$50,000,000 residential revenue ÷ 400,000,000 kWh residential sales = 12\.50 cents per kWh/);
});

test('Oncor, a Texas wires utility: no average price, delivery revenue labeled delivery only', () => {
  const html = text(page(44372));
  assert.match(html, /Delivery only, not your full price/);
  assert.match(html, /Delivery revenue per kWh \(cents\)/);
  assert.doesNotMatch(html, /Average price \(cents per kWh\)|state average/);
  assert.match(html, /It delivers power that retail providers sell, and it operates no power plants listed in EIA-860\./);
});

test('a price 20% above the state average says so', () => {
  assert.equal(comparison(14.4, 12.0, i18n, 'res', 'GA'), 'Its average price is 20% above the state average for residential customers (12.00 cents per kWh in GA).');
  assert.equal(comparison(9.6, 12.0, i18n, 'res', 'GA'), 'Its average price is 20% below the state average for residential customers (12.00 cents per kWh in GA).');
  assert.match(text(page(195)), /Its average price is \d+% (above|below) the state average for residential customers \(16\.09 cents per kWh in AL\)/);
});

test('no Form 714: not reported to FERC, with the balancing authority\'s peak labeled as such', () => {
  const html = text(page(44372));
  assert.match(html, /Not reported to FERC\./);
  assert.match(html, /Its balancing authority, ERCOT, peaked at 83,679 MW in 2025\. That is the balancing authority's peak, not this utility's\./);
  assert.match(text(page(195)), /14,872 MW in 2025, as reported to FERC on Form 714\./);
});

test('a co-op with no plants buys all of its power; one without reliability says not reported', () => {
  assert.match(text(page(108)), /It operates no power plants listed in EIA-860, so it buys all of its power\./);
  assert.match(text(page(55)), /Not reported to EIA for 2025\. Small utilities are often exempt from reporting reliability\./);
  const al = text(page(195));
  assert.match(al, /This is generation the utility operates, not the full mix of power it buys\./);
  assert.match(al, /Plants it operates/);
});

test('rates: the count and newest update from the OpenEI database', () => {
  assert.match(text(page(195)), /38 rates in the OpenEI database, newest updated Apr 14, 2026\./);
  assert.match(text(page(55)), /rates? in the OpenEI database|No rates for this utility/);
});

test('content minimum: a record with fewer than four reported figures gets no page', () => {
  const thin = all.utilities.filter((u) => !u.page);
  assert.ok(thin.length > 0);
  for (const u of thin) {
    const figures = Object.values(u.kinds).reduce((n, k) => n + SECTORS.reduce((m, s) => m + ['revenue', 'sales', 'customers'].filter((x) => k[s][x] > 0).length, 0), 0);
    assert.ok(figures + [u.reliability.length, u.plants.length, u.peak, u.rates].filter(Boolean).length < 4, `${u.id} ${u.name}`);
  }
});

test('state average prices match EIA\'s Table 2.10 within 0.01 cents in every state and sector', () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eia-electric-power-annual-2025.json'), 'utf8')).values.averagePriceCentsPerKwhByState.values;
  assert.equal(Object.keys(ref).length, 51);
  for (const [st, want] of Object.entries(ref)) {
    const ours = all.averages.get(st);
    for (const [s, name] of [['res', 'residential'], ['com', 'commercial'], ['ind', 'industrial']]) {
      assert.ok(Math.abs(Math.round(ours[s] * 100) / 100 - want[name]) <= 0.01, `${st} ${name}: ours ${ours[s].toFixed(2)}, EIA's ${want[name]}`);
    }
  }
});
