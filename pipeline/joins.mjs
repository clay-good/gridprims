// Cross-source joins (add-public-grid-data task 1.4; design: "join on EIA ids
// where present, report unmatched rows, never guess a match"). Each join is
// data: two served tables and their keys, each key an id or a name. A name
// key may only narrow an id key (a county name within a state); no join
// matches by name alone. `node pipeline/joins.mjs` writes the report of what
// matched and what did not to data/joins/report.json.
//   node pipeline/joins.mjs [--data data] [--check]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readShard } from '../core/lib/shard.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/** County names as EIA and the Census Bureau write them, reduced to compare: no accents, case, punctuation, or "County". */
export function countyKey(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\b(county|parish|borough|census area|city and borough|municipality|municipio|planning region)\b/g, '').replace(/[^a-z]/g, '');
}

/**
 * County-equivalents EIA-861 still names by their former areas, and the 2020
 * areas each became (U.S. Census Bureau, "Substantial Changes to
 * Counties and County Equivalent Entities", 2000 to present:
 * https://www.census.gov/programs-surveys/geography/technical-documentation/county-changes.html).
 */
export const COUNTY_SUCCESSORS = {
  'AK|skagwayhoonahangoon': ['02105', '02230'], // split 2007 into Hoonah-Angoon and Skagway
  'AK|wrangellpetersburg': ['02195', '02275'], // split 2008 into Petersburg and Wrangell
  'AK|princeofwalesketchikan': ['02130', '02198'], // split 2008 into Ketchikan Gateway and Prince of Wales-Hyder
  'AK|valdezcordova': ['02063', '02066'], // split 2019 into Chugach and Copper River
  'VA|bedfordcity': ['51019'], // merged into Bedford County in 2013
};

/** @typedef {{dataset: string, table: string, keys: string[], name?: string, where?: (r: any) => boolean, key?: (r: any) => string[]}} Side */
/** @type {Array<{id: string, title: string, kinds: Array<'id' | 'name'>, left: Side, right: Side}>} */
export const JOINS = [
  { id: 'plants-eia860-eia923', title: 'EIA-860 plants with EIA-923 generation', kinds: ['id'],
    left: { dataset: 'eia-860', table: 'plants', keys: ['plant_id'], name: 'plant_name' },
    right: { dataset: 'eia-923', table: 'generation', keys: ['plant_id'], name: 'plant_name', where: (r) => r.plant_id !== 99999 } },
  { id: 'plants-eia860-egrid', title: 'EIA-860 plants with eGRID plant emissions', kinds: ['id'],
    left: { dataset: 'eia-860', table: 'plants', keys: ['plant_id'], name: 'plant_name' },
    right: { dataset: 'egrid', table: 'plants', keys: ['plant_id'], name: 'plant_name' } },
  { id: 'generators-eia860-eia860m', title: 'EIA-860 operable generators with their EIA-860M status', kinds: ['id', 'id'],
    left: { dataset: 'eia-860', table: 'generators', keys: ['plant_id', 'generator_id'], name: 'plant_name', where: (r) => r.category === 'operable' },
    right: { dataset: 'eia-860m', table: 'generators', keys: ['plant_id', 'generator_id'], name: 'plant_name' } },
  { id: 'utilities-eia861-eia860', title: 'EIA-861 utilities with the plants they operate in EIA-860', kinds: ['id'],
    left: { dataset: 'eia-861', table: 'sales', keys: ['utility_id'], name: 'utility_name', where: (r) => r.utility_id !== 88888 },
    right: { dataset: 'eia-860', table: 'plants', keys: ['utility_id'], name: 'utility_name' } },
  { id: 'utilities-eia861-ferc714', title: 'EIA-861 utilities with a 2025 FERC Form 714 peak (PUDL crosswalk)', kinds: ['id'],
    left: { dataset: 'eia-861', table: 'sales', keys: ['utility_id'], name: 'utility_name', where: (r) => r.utility_id !== 88888 },
    right: { dataset: 'pudl-ferc714', table: 'annual_peaks', keys: ['utility_id_eia'], name: 'respondent_name', where: (r) => r.year === 2025 && r.utility_id_eia !== null } },
  { id: 'rates-urdb-eia861', title: 'URDB rates with their EIA-861 utility', kinds: ['id'],
    left: { dataset: 'urdb', table: 'rates', keys: ['utility_id'], name: 'utility_name' },
    right: { dataset: 'eia-861', table: 'sales', keys: ['utility_id'], name: 'utility_name' } },
  { id: 'zips-egrid-census', title: 'EPA Power Profiler ZIPs with Census ZCTAs', kinds: ['id'],
    left: { dataset: 'egrid', table: 'zip_subregions', keys: ['zip'] },
    right: { dataset: 'census-zcta-county', table: 'zcta_counties', keys: ['zcta'] } },
  { id: 'counties-eia861-census', title: 'EIA-861 service territory counties with Census county FIPS codes', kinds: ['id', 'name'],
    left: { dataset: 'eia-861', table: 'service_territory', keys: ['state', 'county'], name: 'utility_name',
      key: (r) => { const k = `${r.state}|${countyKey(r.county)}`; return COUNTY_SUCCESSORS[k] ? COUNTY_SUCCESSORS[k].map((f) => `fips:${f}`) : [k]; } },
    right: { dataset: 'census-zcta-county', table: 'zcta_counties', keys: ['state', 'county_name'],
      key: (r) => [`${r.state}|${countyKey(r.county_name)}`, `fips:${r.county_fips}`] } },
];

/** Every row of a served table. */
function rows(dataDir, dataset, table) {
  const { version } = JSON.parse(readFileSync(join(dataDir, dataset, 'current.json'), 'utf8'));
  const m = JSON.parse(readFileSync(join(dataDir, dataset, version, 'manifest.json'), 'utf8'));
  const t = m.tables.find((x) => x.name === table);
  return { version, rows: t.shards.flatMap((s) => readShard(readFileSync(join(dataDir, dataset, version, s.path))).rows()) };
}

const SAMPLE = 20;

/** One join's result: what matched, and the unmatched keys on each side with a name to read them by. */
export function runJoin(j, dataDir) {
  const side = (s) => {
    const { version, rows: all } = rows(dataDir, s.dataset, s.table);
    const keyOf = s.key ?? ((r) => [s.keys.map((k) => r[k]).join('|')]);
    const keys = new Map();
    for (const r of all.filter(s.where ?? (() => true))) {
      const shown = s.keys.map((k) => r[k]).join('|');
      if (!keys.has(shown)) keys.set(shown, { matchOn: keyOf(r), name: s.name ? r[s.name] : null });
    }
    return { version, keys };
  };
  const L = side(j.left);
  const R = side(j.right);
  const index = (keys) => new Set([...keys.values()].flatMap((v) => v.matchOn));
  const rIndex = index(R.keys);
  const lIndex = index(L.keys);
  const leftOnly = [...L.keys].filter(([, v]) => !v.matchOn.some((k) => rIndex.has(k))).map(([k, v]) => ({ key: k, name: v.name }));
  const rightOnly = [...R.keys].filter(([, v]) => !v.matchOn.some((k) => lIndex.has(k))).map(([k, v]) => ({ key: k, name: v.name }));
  const order = (a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  return {
    id: j.id, title: j.title, keys: j.left.keys.map((k, i) => ({ left: k, right: j.right.keys[i], kind: j.kinds[i] })),
    left: { dataset: j.left.dataset, table: j.left.table, version: L.version, keys: L.keys.size, unmatched: leftOnly.length, sample: leftOnly.sort(order).slice(0, SAMPLE) },
    right: { dataset: j.right.dataset, table: j.right.table, version: R.version, keys: R.keys.size, unmatched: rightOnly.length, sample: rightOnly.sort(order).slice(0, SAMPLE) },
    matched: L.keys.size - leftOnly.length,
  };
}

/** The rule the design sets: every join has an id key; a name key only narrows one. */
export function nameAlone(j) {
  return !j.kinds.includes('id') || j.kinds.length !== j.left.keys.length || j.kinds.length !== j.right.keys.length;
}

/** @param {string} dataDir */
export function joinReport(dataDir = join(ROOT, 'data')) {
  const ran = JOINS.filter((j) => [j.left, j.right].every((s) => existsSync(join(dataDir, s.dataset, 'current.json'))));
  return { joins: ran.map((j) => runJoin(j, dataDir)) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { values } = parseArgs({ options: { data: { type: 'string' }, check: { type: 'boolean' } } });
  const dataDir = values.data ?? join(ROOT, 'data');
  const bad = JOINS.filter(nameAlone).map((j) => j.id);
  if (bad.length) { console.error(`joins matched by name alone: ${bad.join(', ')}`); process.exit(2); }
  const report = JSON.stringify(joinReport(dataDir), null, 1) + '\n';
  const file = join(dataDir, 'joins/report.json');
  if (values.check) {
    const same = existsSync(file) && readFileSync(file, 'utf8') === report;
    console.log(same ? 'ok the join report is current' : 'FAIL the join report is stale; run node pipeline/joins.mjs');
    process.exitCode = same ? 0 : 2;
  } else {
    mkdirSync(join(dataDir, 'joins'), { recursive: true });
    writeFileSync(file, report);
    for (const r of JSON.parse(report).joins) console.log(`${r.id}: ${r.matched} of ${r.left.keys} matched; ${r.left.unmatched} only in ${r.left.dataset}, ${r.right.unmatched} only in ${r.right.dataset}`);
  }
}
