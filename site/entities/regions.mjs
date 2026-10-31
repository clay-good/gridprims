// The facts state and eGRID subregion pages show (add-public-grid-data:
// region pages), from the served snapshots: EIA-861 for utilities, customers,
// and prices; EIA-860 and EIA-923 for capacity and generation by fuel; LBNL
// Queued Up for the queue; and eGRID for subregion emission rates.

import { served } from './plants.mjs';
import { SECTORS, stateAverages } from './utilities.mjs';

export const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida',
  GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/** EIA-861 ownership types in the three groups the page compares, and the rest. */
export const OWNERSHIP_GROUP = {
  'Investor Owned': 'investor', Cooperative: 'cooperative',
  Municipal: 'public', 'Political Subdivision': 'public', State: 'public', Federal: 'public', 'Municipal Mktg Authority': 'public',
  'Retail Power Marketer': 'marketer',
};

/** Queued Up's project types in the queue snapshot spec's six groups. */
export function queueType(t) {
  if (!t) return 'other';
  if (t.includes('+')) return 'hybrid';
  if (t === 'Solar') return 'solar';
  if (t === 'Wind' || t === 'Offshore Wind') return 'wind';
  if (t === 'Battery' || t === 'Other Storage') return 'storage';
  if (t === 'Gas') return 'gas';
  return 'other';
}

/** @param {string} dataDir @param {{utilities: any[]}} utilities from utilityPages */
export function regionPages(dataDir, utilities) {
  const sales = served(dataDir, 'eia-861', 'sales');
  if (!sales) return null;
  const gens = served(dataDir, 'eia-860', 'generators');
  const gen923 = served(dataDir, 'eia-923', 'generation');
  const queue = served(dataDir, 'lbnl-queued-up', 'requests');
  const egrid = served(dataDir, 'egrid', 'subregions');
  const egridPlants = served(dataDir, 'egrid', 'plants');
  const averages = stateAverages(sales.rows);
  const byState = (rows, key = 'state') => {
    const m = new Map();
    for (const r of rows ?? []) (m.get(r[key]) ?? m.set(r[key], []).get(r[key])).push(r);
    return m;
  };
  const salesBy = byState(sales.rows);
  const delivery = served(dataDir, 'eia-861', 'delivery');
  const deliveryBy = byState(delivery?.rows);
  const gensBy = byState(gens?.rows.filter((g) => g.category === 'operable'));
  const genBy = byState(gen923?.rows);
  const queueBy = byState(queue?.rows.filter((q) => q.q_status === 'active'));

  const states = Object.entries(STATE_NAMES).map(([st, name]) => {
    const rows = salesBy.get(st) ?? [];
    // Customer shares by ownership: retail customers only (parts A, B, and D), as EIA counts them.
    const shares = {};
    let customers = 0;
    for (const r of rows.filter((x) => x.part !== 'C')) {
      const g = OWNERSHIP_GROUP[r.ownership] ?? 'other';
      shares[g] = (shares[g] ?? 0) + (r.tot_customers ?? 0);
      customers += r.tot_customers ?? 0;
    }
    const capacity = {};
    for (const g of gensBy.get(st) ?? []) capacity[g.energy_source_1] = (capacity[g.energy_source_1] ?? 0) + (g.nameplate_mw ?? 0);
    const generation = {};
    for (const r of genBy.get(st) ?? []) generation[r.fuel_type] = (generation[r.fuel_type] ?? 0) + (r.net_generation_mwh ?? 0);
    const q = {};
    for (const r of queueBy.get(st) ?? []) {
      const k = queueType(r.type_clean);
      const e = q[k] ?? (q[k] = { mw: 0, count: 0 });
      e.mw += r.mw_1 ?? 0;
      e.count += 1;
    }
    // Each utility's own figures in this state, from its sales (and delivery) rows here.
    const pages = new Map(utilities.map((u) => [u.id, u.page]));
    const here = new Map();
    for (const r of [...rows, ...(deliveryBy.get(st) ?? [])]) {
      if (r.utility_id === 88888) continue;
      const e = here.get(r.utility_id) ?? here.set(r.utility_id, { id: r.utility_id, name: r.utility_name, ownership: r.ownership, page: pages.get(r.utility_id) ?? false, customers: 0, sales: 0 }).get(r.utility_id);
      e.customers += r.tot_customers ?? 0;
      e.sales += r.tot_sales ?? 0;
    }
    return {
      code: st, name, year: Number(sales.table.dataPeriod), customers, shares,
      prices: averages.get(st) ?? Object.fromEntries(SECTORS.map((s) => [s, null])),
      baCodes: [...new Set(rows.map((r) => r.ba_code).filter(Boolean))].sort(),
      capacity, generation, queue: q,
      utilities: [...here.values()].sort((a, b) => b.customers - a.customers || a.name.localeCompare(b.name)),
    };
  });

  const plantsBySub = byState(egridPlants?.rows, 'subregion');
  const subregions = (egrid?.rows ?? []).map((s) => ({ ...s, plants: (plantsBySub.get(s.subregion) ?? []).length })).sort((a, b) => a.subregion.localeCompare(b.subregion));
  return { states, subregions, sources: { eia861: sales.manifest, eia860: gens?.manifest ?? null, eia923: gen923?.manifest ?? null, queue: queue?.manifest ?? null, egrid: egrid?.manifest ?? null } };
}
