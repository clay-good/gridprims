// The data the on-device ZIP and county lookup reads (add-public-grid-data:
// utility lookup): a small table of three-digit ZIP prefixes and their
// states, and one shard per state holding its ZCTAs and their counties, its
// counties and the utilities EIA-861 lists for them, and EPA's ZIP-to-subregion
// rows. The browser fetches the prefix table and only the state shard (or
// shards) a ZIP needs; the ZIP itself is never sent.

import { served } from './plants.mjs';
import { COUNTY_SUCCESSORS, countyKey } from '../../pipeline/joins.mjs';

/** @param {string} dataDir */
export function lookupData(dataDir) {
  const zcta = served(dataDir, 'census-zcta-county', 'zcta_counties');
  const territory = served(dataDir, 'eia-861', 'service_territory');
  const sales = served(dataDir, 'eia-861', 'sales');
  const delivery = served(dataDir, 'eia-861', 'delivery');
  const zips = served(dataDir, 'egrid', 'zip_subregions');
  if (!zcta || !territory || !sales) return null;

  // County FIPS by state and EIA-861's county name, as the joins compare them.
  const fips = new Map();
  const names = new Map();
  for (const r of zcta.rows) {
    fips.set(`${r.state}|${countyKey(r.county_name)}`, r.county_fips);
    names.set(r.county_fips, r.county_name);
  }
  const countyFips = (st, county) => {
    const k = `${st}|${countyKey(county)}`;
    return COUNTY_SUCCESSORS[k] ?? (fips.has(k) ? [fips.get(k)] : []);
  };

  // Each utility's customers, kind, and balancing authority in each state.
  const inState = new Map();
  for (const r of [...sales.rows, ...(delivery?.rows ?? [])]) {
    if (r.utility_id === 88888) continue;
    const k = `${r.state}|${r.utility_id}`;
    const e = inState.get(k) ?? inState.set(k, { name: r.utility_name, ownership: r.ownership, customers: 0, kinds: new Set(), bas: new Set() }).get(k);
    e.customers += r.tot_customers ?? 0;
    e.kinds.add(r.service_type);
    if (r.ba_code) e.bas.add(r.ba_code);
  }

  const shards = new Map();
  const shard = (st) => shards.get(st) ?? shards.set(st, { state: st, zctas: {}, counties: {}, utilities: {}, subregions: {} }).get(st);
  for (const r of zcta.rows) (shard(r.state).zctas[r.zcta] ??= []).push([r.county_fips, r.share_of_zcta_land]);
  for (const r of territory.rows) {
    for (const f of countyFips(r.state, r.county)) {
      const s = shard(r.state);
      const c = (s.counties[f] ??= { name: names.get(f) ?? r.county, utilities: [] });
      if (!c.utilities.includes(r.utility_id)) c.utilities.push(r.utility_id);
      const u = inState.get(`${r.state}|${r.utility_id}`);
      s.utilities[r.utility_id] ??= { name: u?.name ?? r.utility_name, ownership: u?.ownership ?? null, customers: u?.customers ?? 0, kinds: [...(u?.kinds ?? [])].sort(), bas: [...(u?.bas ?? [])].sort() };
    }
  }

  // Three-digit prefixes and their states, from the ZCTAs (a prefix can span states).
  const zip3 = {};
  for (const r of zcta.rows) {
    const p = r.zcta.slice(0, 3);
    if (!(zip3[p] ??= []).includes(r.state)) zip3[p].push(r.state);
  }
  for (const p of Object.keys(zip3)) zip3[p].sort();
  // EPA's subregions go to every state shard the ZIP's prefix points at; ZIPs whose prefix has no ZCTA are left out.
  for (const r of zips?.rows ?? []) {
    for (const st of zip3[r.zip.slice(0, 3)] ?? []) shard(st).subregions[r.zip] = [r.subregion_1, r.subregion_2, r.subregion_3].filter(Boolean);
  }
  for (const s of shards.values()) for (const c of Object.values(s.counties)) c.utilities.sort((a, b) => a - b);
  return {
    zip3: Object.fromEntries(Object.entries(zip3).sort()),
    shards: new Map([...shards].sort()),
    versions: { zcta: zcta.manifest.version, eia861: sales.manifest.version, egrid: zips?.manifest.version ?? null },
    sources: { zcta: zcta.manifest, eia861: sales.manifest, egrid: zips?.manifest ?? null },
  };
}
