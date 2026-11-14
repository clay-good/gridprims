// The facts each utility page shows (add-public-grid-data: utility pages),
// from the served snapshots, joined on the EIA utility id only: EIA-861 for
// sales, revenue, customers, territory, and reliability; EIA-860 and EIA-923
// for the plants it operates; Form 714 through PUDL for its peak; and URDB for
// its published rates.

import { compare, figures } from '../../core/lib/reliability-peers.mjs';
import { served } from './plants.mjs';

export const SECTORS = ['res', 'com', 'ind', 'trn'];

/**
 * Average revenue per kWh in cents: thousand dollars over MWh.
 * $50,000,000 over 400,000 MWh is 12.50 cents.
 * @returns {number | null}
 */
export const centsPerKwh = (revenueThousand, mwh) => (revenueThousand === null || !(mwh > 0) ? null : (revenueThousand * 1000 * 100) / (mwh * 1000));

/**
 * State averages per sector the way EIA computes them (its Table 2.10): revenue
 * from every part over sales from parts A, B, and D, because part C's delivery
 * sales are the same energy part B already counts.
 */
export function stateAverages(sales) {
  const by = new Map();
  for (const r of sales) {
    const s = by.get(r.state) ?? by.set(r.state, Object.fromEntries(SECTORS.map((k) => [k, { revenue: 0, sales: 0 }]))).get(r.state);
    for (const k of SECTORS) {
      s[k].revenue += r[`${k}_revenue`] ?? 0;
      if (r.part !== 'C') s[k].sales += r[`${k}_sales`] ?? 0;
    }
  }
  return new Map([...by].map(([st, s]) => [st, Object.fromEntries(SECTORS.map((k) => [k, centsPerKwh(s[k].revenue, s[k].sales)]))]));
}

/** "Bundled" covers EIA's Part A and the full-service Part D (Texas retail providers, for one); "Delivery" is Part C; "Energy" is Part B. */
const KIND = { Bundled: 'bundled', Delivery: 'delivery', Energy: 'energy' };

/** @param {string} dataDir */
export function utilityPages(dataDir) {
  const sales = served(dataDir, 'eia-861', 'sales');
  if (!sales) return null;
  // Texas wires utilities report delivery-only service in their own table; EIA says never to add it to retail totals.
  const delivery = served(dataDir, 'eia-861', 'delivery');
  const territory = served(dataDir, 'eia-861', 'service_territory');
  const reliability = served(dataDir, 'eia-861', 'reliability');
  const plants = served(dataDir, 'eia-860', 'plants');
  const gens = served(dataDir, 'eia-860', 'generators');
  const gen923 = served(dataDir, 'eia-923', 'generation');
  const peaks = served(dataDir, 'pudl-ferc714', 'annual_peaks');
  const urdb = served(dataDir, 'urdb', 'rates');
  const year = Number(sales.table.dataPeriod);
  const averages = stateAverages(sales.rows);
  // Five years of the same sheets, for trends.
  const history = served(dataDir, 'eia-861-history', 'sales');
  const historyDelivery = served(dataDir, 'eia-861-history', 'delivery');
  const trendRows = new Map();
  for (const r of [...(history?.rows ?? []), ...(historyDelivery?.rows ?? [])]) {
    if (r.utility_id === 88888) continue;
    const t = trendRows.get(r.utility_id) ?? trendRows.set(r.utility_id, new Map()).get(r.utility_id);
    const y = t.get(r.data_year) ?? t.set(r.data_year, { customers: 0, bundled: { revenue: 0, sales: 0 }, delivery: { revenue: 0, sales: 0 } }).get(r.data_year);
    y.customers += r.tot_customers ?? 0;
    const kind = KIND[r.service_type];
    if (kind === 'bundled' || kind === 'delivery') { y[kind].revenue += r.res_revenue ?? 0; y[kind].sales += r.res_sales ?? 0; }
  }

  const group = (rows, key) => {
    const m = new Map();
    for (const r of rows ?? []) (m.get(r[key]) ?? m.set(r[key], []).get(r[key])).push(r);
    return m;
  };
  const salesBy = group([...sales.rows, ...(delivery?.rows ?? [])].filter((r) => r.utility_id !== 88888), 'utility_id');
  const territoryBy = group(territory?.rows, 'utility_id');
  const reliabilityBy = group(reliability?.rows, 'utility_id');
  // Every published reliability figure, for placing each utility among its peers (add-reliability-tools 4.4).
  const peerFigures = reliability ? figures(reliability.rows, sales.rows) : [];
  const peerOf = (id, state, ieee) => {
    const f = peerFigures.find((x) => x.utilityId === id && x.state === state && x.method === (ieee ? 'ieee' : 'other') && x.basis === 'with-med');
    return f ? compare(f, peerFigures) : null;
  };
  const plantsBy = group(plants?.rows, 'utility_id');
  const operable = group(gens?.rows.filter((g) => g.category === 'operable'), 'plant_id');
  const netBy = group(gen923?.rows.filter((r) => r.plant_id !== 99999), 'plant_id');
  const latestPeakYear = Math.max(...(peaks?.rows ?? []).map((r) => r.year));
  const peaksNow = (peaks?.rows ?? []).filter((r) => r.year === latestPeakYear);
  const ratesBy = new Map();
  for (const r of urdb?.rows ?? []) {
    const e = ratesBy.get(r.utility_id) ?? ratesBy.set(r.utility_id, { labels: new Set(), newest: null }).get(r.utility_id);
    e.labels.add(r.label);
    if (r.last_revised && (!e.newest || r.last_revised > e.newest)) e.newest = r.last_revised;
  }

  const utilities = [];
  for (const [id, rows] of salesBy) {
    // Sales, revenue, and customers by service kind and sector, summed over the utility's states.
    const kinds = {};
    for (const r of rows) {
      const kind = KIND[r.service_type] ?? 'other';
      const k = kinds[kind] ?? (kinds[kind] = Object.fromEntries(SECTORS.map((s) => [s, { revenue: 0, sales: 0, customers: 0 }])));
      for (const s of SECTORS) { k[s].revenue += r[`${s}_revenue`] ?? 0; k[s].sales += r[`${s}_sales`] ?? 0; k[s].customers += r[`${s}_customers`] ?? 0; }
    }
    const states = [...new Set([...rows.map((r) => r.state), ...(territoryBy.get(id) ?? []).map((r) => r.state)])].sort();
    const baCodes = [...new Set(rows.map((r) => r.ba_code).filter(Boolean))].sort();
    const homeState = rows.reduce((best, r) => ((r.tot_sales ?? 0) > (best?.tot_sales ?? -1) ? r : best), null).state;
    const prices = Object.fromEntries(Object.entries(kinds).map(([kind, k]) => [kind, Object.fromEntries(SECTORS.map((s) => [s, centsPerKwh(k[s].revenue, k[s].sales)]))]));
    const own = (plantsBy.get(id) ?? []).map((p) => {
      const g = operable.get(p.plant_id) ?? [];
      const n = netBy.get(p.plant_id) ?? [];
      return { id: p.plant_id, name: p.plant_name, state: p.state, nameplateMw: g.reduce((x, y) => x + (y.nameplate_mw ?? 0), 0), fuels: g.map((y) => y.energy_source_1), byFuel: n };
    });
    const fuelCapacity = {};
    const fuelNet = {};
    for (const p of own) {
      for (const g of operable.get(p.id) ?? []) fuelCapacity[g.energy_source_1] = (fuelCapacity[g.energy_source_1] ?? 0) + (g.nameplate_mw ?? 0);
      for (const r of p.byFuel) fuelNet[r.fuel_type] = (fuelNet[r.fuel_type] ?? 0) + (r.net_generation_mwh ?? 0);
    }
    const peak = peaksNow.find((r) => r.utility_id_eia === id) ?? null;
    const baPeak = peak ? null : peaksNow.find((r) => baCodes.includes(r.balancing_authority_code_eia) && r.respondent_type === 'balancing_authority') ?? null;
    const rel = (reliabilityBy.get(id) ?? []).map((r) => ({ state: r.state, ieee: r.ieee_with_med_saidi !== null, withMed: { saidi: r.ieee_with_med_saidi ?? r.other_with_med_saidi, saifi: r.ieee_with_med_saifi ?? r.other_with_med_saifi }, withoutMed: { saidi: r.ieee_without_med_saidi ?? r.other_without_med_saidi, saifi: r.ieee_without_med_saifi ?? r.other_without_med_saifi }, peers: peerOf(id, r.state, r.ieee_with_med_saidi !== null) }));
    const rates = ratesBy.get(id);
    const customers = Object.values(kinds).reduce((n, k) => n + SECTORS.reduce((m, s) => m + k[s].customers, 0), 0);
    const totalSales = Object.values(kinds).reduce((n, k) => n + SECTORS.reduce((m, s) => m + k[s].sales, 0), 0);
    const totalRevenue = Object.values(kinds).reduce((n, k) => n + SECTORS.reduce((m, s) => m + k[s].revenue, 0), 0);
    // Content minimum: four sourced facts for the latest year. A fact is a reported figure (each nonzero
    // customers, sales, or revenue value by sector and kind of service), a reliability report, an operated
    // plant list, a Form 714 peak, or published rates. Ownership and states describe; they do not count.
    const figures = Object.values(kinds).reduce((n, kd) => n + SECTORS.reduce((m, s) => m + ['revenue', 'sales', 'customers'].filter((x) => kd[s][x] > 0).length, 0), 0);
    const facts = figures + [rel.length, own.length, peak, rates].filter(Boolean).length;
    utilities.push({
      id, name: rows[0].utility_name, ownership: rows[0].ownership, states, homeState, baCodes, year, kinds, prices,
      stateAverage: averages.get(homeState), customers, totalSales, totalRevenue, page: facts >= 4,
      reliability: rel, plants: own.map(({ byFuel, ...p }) => p), fuelCapacity, fuelNet,
      peak: peak && { mw: peak.peak_mw, year: peak.year, hourUtc: peak.peak_hour_utc, timezone: peak.timezone },
      baPeak: baPeak && { mw: baPeak.peak_mw, year: baPeak.year, name: baPeak.respondent_name, code: baPeak.balancing_authority_code_eia },
      rates: rates ? { count: rates.labels.size, newest: rates.newest } : null,
      // Residential price (full service, or delivery revenue per kWh for a wires utility) and customers, by year.
      trend: [...(trendRows.get(id) ?? new Map())].sort((a, b) => a[0] - b[0]).map(([y, v]) => ({
        year: y, customers: v.customers, bundled: centsPerKwh(v.bundled.revenue, v.bundled.sales), delivery: centsPerKwh(v.delivery.revenue, v.delivery.sales),
      })),
    });
  }
  utilities.sort((a, b) => a.id - b.id);
  return { utilities, year, averages, peerFigures, sources: { eia861: sales.manifest, history: history?.manifest ?? null, eia860: plants?.manifest ?? null, eia923: gen923?.manifest ?? null, ferc714: peaks?.manifest ?? null, urdb: urdb?.manifest ?? null } };
}
