// The utilities serving a typed ZIP, for the household tools' pickers. Requests
// go only for the ZIP prefix table and the state shards the ZIP needs; the ZIP
// stays on the device.

import { lookupZip, parseZip, statesFor } from '../../core/lib/zip-lookup.mjs';

const cache = new Map();
export const getJson = (path) => cache.get(path) ?? cache.set(path, fetch(path).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))).get(path);

/**
 * @param {string} text the ZIP as typed
 * @returns {Promise<{parsed: any, utilities: any[], subregions: string[], shards: Record<string, any>}>}
 */
export async function utilitiesForZip(text) {
  const parsed = parseZip(text);
  if (!parsed.ok) return { parsed, utilities: [], subregions: [], shards: {} };
  const states = statesFor(parsed.zip, await getJson('/lookup/zip3.json'));
  const shards = Object.fromEntries(await Promise.all(states.map(async (st) => [st, await getJson(`/lookup/${st}.json`)])));
  const found = states.length ? lookupZip(parsed.zip, shards) : null;
  return { parsed, utilities: found?.utilities ?? [], subregions: found?.subregions ?? [], shards };
}

/**
 * A utility handed over in the URL fragment (#utility=44372&state=TX), as a utility page or a data guide links
 * a household tool. The fragment never reaches a server; only the state's shard is fetched.
 * @param {string} hash
 * @returns {Promise<{utility: any, shard: any} | null>} null when the fragment names none, or one the shard lacks
 */
export async function utilityFromFragment(hash) {
  const p = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  const id = Number(p.get('utility'));
  const state = (p.get('state') ?? '').toUpperCase();
  if (!(id > 0) || !/^[A-Z]{2}$/.test(state)) return null;
  const shard = await getJson(`/lookup/${state}.json`).catch(() => null);
  const u = shard?.utilities?.[id];
  return u ? { utility: { ...u, id, state }, shard } : null;
}
