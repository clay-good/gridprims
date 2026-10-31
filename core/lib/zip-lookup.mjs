// The ZIP and county lookup's logic, run on the visitor's device
// (add-public-grid-data: utility lookup). Pure functions over the prefix table
// and state shards the site publishes; nothing here makes a request.

/**
 * Read what a visitor typed as a ZIP code.
 * @param {string} text
 * @returns {{ok: true, zip: string} | {ok: false, reason: 'empty' | 'not-digits' | 'four-digits' | 'length', suggestion?: string}}
 */
export function parseZip(text) {
  const s = String(text ?? '').trim().replace(/-\d{4}$/, ''); // a ZIP+4 is read by its first five digits
  if (!s) return { ok: false, reason: 'empty' };
  if (!/^\d+$/.test(s)) return { ok: false, reason: 'not-digits' };
  if (s.length === 5) return { ok: true, zip: s };
  if (s.length === 4) return { ok: false, reason: 'four-digits', suggestion: `0${s}` }; // a dropped leading zero, as spreadsheets do
  return { ok: false, reason: 'length' };
}

/** The states whose shards a ZIP needs, from its three-digit prefix. */
export const statesFor = (zip, zip3) => zip3[zip.slice(0, 3)] ?? [];

const MARKETER = 'Retail Power Marketer';

/**
 * Every utility serving any county a ZIP's ZCTA touches, ordered by customers,
 * with retail power marketers apart from the utilities that deliver power.
 * @param {string} zip
 * @param {Record<string, any>} shards state shards by state code, as fetched
 */
export function lookupZip(zip, shards) {
  const counties = [];
  for (const [st, s] of Object.entries(shards)) {
    for (const [fips, share] of s.zctas[zip] ?? []) counties.push({ fips, state: st, name: s.counties[fips]?.name ?? null, share });
  }
  counties.sort((a, b) => b.share - a.share || a.fips.localeCompare(b.fips));
  const subregions = [...new Set(Object.values(shards).flatMap((s) => s.subregions[zip] ?? []))];
  return { zip, hasZcta: counties.length > 0, counties, subregions, ...utilitiesFor(counties, shards) };
}

/** The same answer for one county a visitor picked by state and name. */
export function lookupCounty(state, fips, shard) {
  const counties = [{ fips, state, name: shard.counties[fips]?.name ?? null, share: 1 }];
  return { counties, subregions: [], ...utilitiesFor(counties, { [state]: shard }) };
}

function utilitiesFor(counties, shards) {
  const seen = new Map();
  for (const c of counties) {
    const s = shards[c.state];
    for (const id of s.counties[c.fips]?.utilities ?? []) {
      const key = `${c.state}|${id}`;
      if (seen.has(key)) continue;
      const u = s.utilities[id];
      seen.set(key, { id, state: c.state, name: u.name, ownership: u.ownership, customers: u.customers, kinds: u.kinds, bas: u.bas });
    }
  }
  const all = [...seen.values()].sort((a, b) => b.customers - a.customers || a.name.localeCompare(b.name));
  const marketer = (u) => u.ownership === MARKETER || (u.kinds.length > 0 && u.kinds.every((k) => k === 'Energy'));
  return {
    utilities: all.filter((u) => !marketer(u)),
    marketers: all.filter(marketer),
    bas: [...new Set(all.filter((u) => !marketer(u)).flatMap((u) => u.bas))].sort(),
  };
}

/** Counties in a state's shard whose name starts with what was typed, for the county picker. */
export function countiesMatching(shard, text) {
  const q = String(text ?? '').trim().toLowerCase().replace(/\s+county$/, '');
  return Object.entries(shard.counties).filter(([, c]) => c.name.toLowerCase().startsWith(q)).map(([fips, c]) => ({ fips, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
}
