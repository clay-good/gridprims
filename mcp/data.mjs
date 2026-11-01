// Public data for the MCP server, read from the clone's data/ folder in the
// same shard format the website uses (agent/mcp-server, design D4). Nothing
// is ever downloaded here.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readShard } from '../core/lib/shard.mjs';
import { cannotDo, claims } from '../core/contract/limits-inputs.mjs';
import { buildLedger } from '../core/lib/ledger.mjs';
import ourDatasets from '../data/curated/our-datasets.mjs';
import ledgerReplies from '../data/curated/ledger-replies.mjs';

// The registry's cadences, when this is a full clone; the MCP release archive carries no pipeline/, and then
// each manifest's own cadence stands.
const REGISTRY_DIR = fileURLToPath(new URL('../pipeline/registry', import.meta.url));
const REGISTRY_CADENCE = new Map(existsSync(REGISTRY_DIR) ? await Promise.all(readdirSync(REGISTRY_DIR).filter((f) => f.endsWith('.mjs')).map(async (f) => { const e = (await import(new URL(`../pipeline/registry/${f}`, import.meta.url).href)).default; return [e.id, e.cadence]; })) : []);

export const DATA_DIR = fileURLToPath(new URL('../data', import.meta.url));

/** Every dataset's served version, from data/<id>/current.json. */
export function catalog(dir = DATA_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'current.json')))
    .map((d) => {
      const { version } = JSON.parse(readFileSync(join(dir, d.name, 'current.json'), 'utf8'));
      const m = JSON.parse(readFileSync(join(dir, d.name, version, 'manifest.json'), 'utf8'));
      return {
        id: m.dataset, version: m.version, title: m.title, publisher: m.publisher, asOf: m.asOf, retrieved: m.retrieved,
        posture: m.posture, license: m.license, attribution: m.attribution, sourceUrl: m.sourceUrl,
        tables: m.tables.map((t) => ({ name: t.name, dataPeriod: t.dataPeriod, rows: t.rows, partition: t.partition, columns: t.columns.map(({ name, type, unit }) => ({ name, type, ...(unit ? { unit } : {}) })) })),
      };
    });
}

/**
 * Rows of a dataset table matching exact column values. A filter on the
 * partition column reads only that shard.
 * @param {{dataset: string, table?: string, filter?: Record<string, any>, limit?: number, offset?: number}} q
 */
export function query({ dataset, table, filter = {}, limit = 100, offset = 0 }, dir = DATA_DIR) {
  const cur = join(dir, dataset, 'current.json');
  if (!existsSync(cur)) return null;
  const { version } = JSON.parse(readFileSync(cur, 'utf8'));
  const m = JSON.parse(readFileSync(join(dir, dataset, version, 'manifest.json'), 'utf8'));
  const t = table ? m.tables.find((x) => x.name === table) : m.tables[0];
  if (!t) return { manifest: m, error: `No table ${table}. Tables: ${m.tables.map((x) => x.name).join(', ')}.` };
  const unknown = Object.keys(filter).filter((k) => !t.columns.some((c) => c.name === k));
  if (unknown.length) return { manifest: m, error: `No column ${unknown.join(', ')}. Columns: ${t.columns.map((c) => c.name).join(', ')}.` };
  // A shard is named by its partition values joined by "-" (EIA-930's "PJM-2024"); each one the filter names narrows the shards read.
  const keys = t.partition === null ? [] : [t.partition].flat();
  const shards = t.shards.filter((s) => { const parts = keys.length > 1 ? s.state.split('-') : [s.state]; return keys.every((k, i) => filter[k] === undefined || parts[i] === String(filter[k])); });
  const rows = [];
  let matched = 0;
  for (const s of shards) {
    for (const r of readShard(readFileSync(join(dir, dataset, version, s.path))).rows()) {
      if (Object.entries(filter).every(([k, v]) => r[k] === v)) {
        matched++;
        if (matched > offset && rows.length < limit) rows.push(r);
      }
    }
  }
  return { manifest: m, table: t, rows, matched };
}

/** The limits record's inputs as the MCP server sees them: curated lists, the health record, and dataset manifests. */
export function limitsInputs(dir = DATA_DIR) {
  const healthFile = join(dir, 'health/pipeline.json');
  const health = existsSync(healthFile) ? JSON.parse(readFileSync(healthFile, 'utf8')) : null;
  const datasets = catalog(dir).map((d) => JSON.parse(readFileSync(join(dir, d.id, d.version, 'manifest.json'), 'utf8')));
  // Lateness is judged on the registry's cadence, as on the website.
  for (const m of datasets) { const c = REGISTRY_CADENCE.get(m.dataset); if (c) m.cadence = c; }
  return { cannotDo, claims, health, datasets, generatedAt: health?.generatedAt ?? null, now: Date.parse(health?.generatedAt ?? '2026-10-31T00:00:00Z') };
}

/**
 * The continuity ledger from the same records the website's is built from: each served dataset, gridprims'
 * own, the health record when the clone has one, and the publishers' replies (add-data-continuity-ledger 1.9).
 */
export function ledgerRecord(dir = DATA_DIR) {
  const health = existsSync(join(dir, 'health/pipeline.json')) ? JSON.parse(readFileSync(join(dir, 'health/pipeline.json'), 'utf8')) : null;
  const manifests = catalog(dir).map((d) => JSON.parse(readFileSync(join(dir, d.id, d.version, 'manifest.json'), 'utf8')));
  const datasets = manifests.map((m) => ({ id: m.dataset, title: m.title, publisher: m.publisher, sourceUrl: m.sourceUrl, cadence: REGISTRY_CADENCE.get(m.dataset) ?? m.cadence, asOf: m.asOf, vintage: m.release ?? m.tables[0]?.dataPeriod ?? m.version, archive: m.raw?.find((r) => r.release)?.release ?? null }));
  for (const o of ourDatasets) {
    if (o.curated) { datasets.push({ ...o, publisher: 'gridprims', ours: true }); continue; }
    const src = manifests.find((m) => m.dataset === o.from);
    if (src) datasets.push({ ...o, publisher: 'gridprims', ours: true, asOf: src.retrieved, vintage: `from ${o.from} ${src.version}` });
  }
  return buildLedger({ datasets, health, replies: ledgerReplies, generatedAt: health?.generatedAt ?? new Date().toISOString(), contact: 'https://gridprims.com/report/' });
}

/**
 * The facts an entity page shows, computed by the same code the site builds pages with, from the
 * same shards (add-public-grid-data task 7.0). Assembled once per data folder.
 */
const entityCache = new Map();
async function entities(dir) {
  if (!entityCache.has(dir)) {
    entityCache.set(dir, (async () => {
      const [{ plantPages }, { utilityPages }, { regionPages }, { lookupData }] = await Promise.all([
        import('../site/entities/plants.mjs'), import('../site/entities/utilities.mjs'), import('../site/entities/regions.mjs'), import('../site/entities/lookup.mjs'),
      ]);
      const plants = plantPages(dir);
      const utilities = utilityPages(dir);
      const regions = utilities && regionPages(dir, utilities.utilities);
      return { plants, utilities, regions, lookup: lookupData(dir) };
    })());
  }
  return entityCache.get(dir);
}

export const ENTITY_KINDS = ['plant', 'utility', 'state', 'subregion', 'zip', 'scenario', 'term'];

/** The scenario model's inputs, assembled once per data folder; each region's hours are read when asked for. */
const scenarioCache = new Map();

/**
 * A balancing authority's screening model: the unmodified run's backtest always, and a change's result only
 * beside it, with the label, the omissions, and the shares of derived and substituted inputs.
 * @param {string} id a balancing authority code such as PACE
 * @param {{retire?: string[], add?: any, solar?: number, wind?: number} | undefined} change
 */
async function scenarioEntity(id, change, dir) {
  const [{ scenarioInputs, scenarioRegion }, { scenarioRun }, { OMISSIONS, scaleOf }, { default: strings }] = await Promise.all([
    import('../site/entities/scenario.mjs'), import('../core/lib/backtest.mjs'), import('../core/lib/dispatch.mjs'), import('../site/strings/en-US.mjs'),
  ]);
  if (!scenarioCache.has(dir)) scenarioCache.set(dir, scenarioInputs(dir));
  const inp = scenarioCache.get(dir);
  if (!inp) return { error: 'The scenario model needs the eia-860, eia-923, and eia-930 datasets, which are not built in this clone.' };
  const ba = String(id).trim().toUpperCase();
  const r = scenarioRegion(inp, ba);
  if (!r) return { error: `No scenario model for ${JSON.stringify(ba)}: it is not a balancing authority with coal, gas, or oil output in ${inp.year}. Balancing authorities with one are listed at https://gridprims.com/scenario/.` };
  const s = r.fleet.summary;
  const out = {
    region: r.ba, name: r.name, year: r.year, label: strings['scenario.label'],
    omissions: OMISSIONS.map((k) => strings[`scenario.omit.${k}`]),
    backtest: { ...r.backtest, definitions: { bias: strings['scenario.def.bias'], mae: strings['scenario.def.mae'], marginalMatch: strings['scenario.def.marginal'] } },
    causes: r.causes,
    shares: { plantHeatRate: s.plant_rate_share, groupHeatRate: s.derived_share, measuredHeatRate: s.measured_share, substitutedPrice: s.substituted_share },
    fleet: { placed_mw: s.placed_mw, unplaceable_mw: s.unplaceable_mw, recorded_mw: s.recorded_mw, by_class: s.by_class, units: r.fleet.units.length, unplaceable: r.fleet.unplaceable.map((u) => ({ id: u.id, name: u.plant_name, mw: u.capacity_mw, missing: u.missing })) },
    unmet: r.unmet, co2_t: r.co2_t,
    unverified: strings['scenario.unverified'],
  };
  if (change) {
    const known = new Set(r.fleet.units.map((u) => u.id));
    const unknown = (change.retire ?? []).filter((x) => !known.has(x));
    if (unknown.length) return { error: `No placed unit ${unknown.map((x) => JSON.stringify(x)).join(', ')} in ${ba}. Unit ids are plant-generator, such as ${r.fleet.units[0].id}; the fleet is at https://gridprims.com/scenario/${ba.toLowerCase()}/fleet.json.` };
    const edits = [...(change.retire ?? []).map((x) => ({ kind: 'retire', id: x })), ...(change.add ? [{ kind: 'add', unit: { id: 'added-1', name: change.add.name ?? 'Added unit', capacity_mw: change.add.capacity_mw, class: change.add.fuel, cost: change.add.cost, co2_t_per_mwh: change.add.co2_t_per_mwh ?? 0 } }] : [])];
    const { expandUnit } = await import('../core/lib/fleet.mjs');
    const sc = scenarioRun({ units: r.fleet.units.map(expandUnit), rows: r.rows, base: r.run, bt: r.backtest, edits, scale: scaleOf(change) });
    out.scenario = {
      edits: sc.edits, solar: change.solar ?? 1, wind: change.wind ?? 1,
      changes: sc.changes, co2: sc.co2, unmet: sc.unmet, added: sc.added,
      reading: 'A fuel\'s change counts as a finding only when it is larger than the backtest\'s mean bias for that fuel over the same hours (finding: true). The unmet modeling residual measures what the model could not place, not whether the grid would have had enough capacity.',
    };
  }
  return { entity: out, url: `/scenario/${ba.toLowerCase()}/`, sources: {}, versions: r.versions };
}

/**
 * One entity as its page shows it, with the page's address.
 * @param {'plant' | 'utility' | 'state' | 'subregion' | 'zip'} kind
 * @param {string} id an EIA plant code or utility id, a state code, an eGRID subregion code, or a five-digit ZIP
 * @returns {Promise<{entity: any, url: string, sources: any} | {error: string}>}
 */
export async function entity(kind, id, dir = DATA_DIR, change = undefined) {
  if (kind === 'scenario') return scenarioEntity(id, change, dir);
  if (kind === 'term') {
    const [{ default: glossary }, { askedTerm }] = await Promise.all([import('../data/curated/glossary.mjs'), import('../core/contract/command.mjs')]);
    const key = askedTerm(String(id));
    const found = glossary.find((g) => g.id === key || [g.term, ...g.aliases].some((n) => askedTerm(n) === key));
    return found ? { entity: found, url: `/learn/glossary/#${found.id}`, sources: {}, versions: null } : { error: `No glossary entry for ${JSON.stringify(String(id))}. Search with gridprims_search, or see https://gridprims.com/learn/glossary/.` };
  }
  const e = await entities(dir);
  const key = String(id).trim();
  if (kind === 'plant' || kind === 'utility') {
    const list = kind === 'plant' ? e.plants?.plants : e.utilities?.utilities.filter((u) => u.page);
    const found = list?.find((x) => String(x.id) === key);
    if (!found) return { error: `No ${kind} page for id ${JSON.stringify(key)}. Find ids with gridprims_search, or query the eia-${kind === 'plant' ? '860' : '861'} dataset.` };
    return { entity: found, url: `/${kind}s/${found.id}/`, sources: (kind === 'plant' ? e.plants : e.utilities).sources };
  }
  if (kind === 'state') {
    const found = e.regions?.states.find((s) => s.code === key.toUpperCase());
    return found ? { entity: found, url: `/states/${found.code.toLowerCase()}/`, sources: e.regions.sources } : { error: `No state ${JSON.stringify(key)}. Use a two-letter code such as TX or DC.` };
  }
  if (kind === 'subregion') {
    const found = e.regions?.subregions.find((s) => s.subregion === key.toUpperCase());
    return found ? { entity: found, url: `/subregions/${found.subregion.toLowerCase()}/`, sources: { egrid: e.regions.sources.egrid } } : { error: `No eGRID subregion ${JSON.stringify(key)}. Subregions: ${e.regions?.subregions.map((s) => s.subregion).join(', ')}.` };
  }
  const { parseZip, lookupZip, statesFor } = await import('../core/lib/zip-lookup.mjs');
  const z = parseZip(key);
  if (!z.ok) return { error: z.reason === 'four-digits' ? `A ZIP code has five digits. Did you mean ${z.suggestion}?` : 'A ZIP code is five digits, such as 78701.' };
  const shards = Object.fromEntries(statesFor(z.zip, e.lookup.zip3).map((st) => [st, e.lookup.shards.get(st)]));
  return { entity: { ...lookupZip(z.zip, shards), note: 'ZIP areas are approximated by Census ZCTAs; an address may be served by only one of the utilities listed.' }, url: '/lookup/', sources: e.lookup.sources };
}
