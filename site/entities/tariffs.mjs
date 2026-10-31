// The residential rates the bill check's tariff picker reads
// (add-household-bill-check: billing period entry). One shard per state:
// each utility's URDB residential rates, newest first, with what the rate is
// for and, when the bill engine can price it, the engine's tariff. The page
// fetches only the state shard the chosen utility needs.

import { served } from './plants.mjs';
import { classify, toTariff } from '../../core/lib/urdb-tariff.mjs';
import { fromUrdb } from '../../core/lib/tariff-record.mjs';

/** @param {string} dataDir */
export function tariffData(dataDir) {
  const urdb = served(dataDir, 'urdb', 'rates');
  if (!urdb) return null;
  const shards = new Map();
  for (const r of urdb.rows) {
    if (r.sector !== 'Residential') continue;
    const c = classify(r);
    const t = toTariff(r);
    const s = shards.get(r.state) ?? shards.set(r.state, {}).get(r.state);
    (s[r.utility_id] ??= []).push({
      label: r.label, name: r.rate_name, effective: r.effective_date, service: c.service, conditions: c.conditions,
      ...(t ? { tariff: t.tariff, tou: t.tou, notes: t.notes } : { reasons: c.reasons }),
      ...(r.source_reference ? { source: r.source_reference } : {}),
    });
  }
  // Newest first, then by name, so the rate in force sits at the top.
  for (const s of shards.values()) for (const list of Object.values(s)) list.sort((a, b) => (b.effective ?? '').localeCompare(a.effective ?? '') || a.name.localeCompare(b.name));
  return { shards: new Map([...shards].sort()), manifest: urdb.manifest };
}

/**
 * Every utility's URDB rates as tariff records, for the workbench's bill on a meter file: one file per
 * utility, newest first. Street-lighting rates are left out; no meter file applies to them.
 * @param {string} dataDir
 */
export function rateRecords(dataDir) {
  const urdb = served(dataDir, 'urdb', 'rates');
  if (!urdb) return null;
  const byUtility = new Map();
  const seen = new Set();
  for (const r of urdb.rows) {
    if (r.sector === 'Lighting' || seen.has(r.label)) continue;
    seen.add(r.label);
    const list = byUtility.get(r.utility_id) ?? byUtility.set(r.utility_id, []).get(r.utility_id);
    list.push(fromUrdb(r));
  }
  for (const list of byUtility.values()) list.sort((a, b) => (b.effective ?? '').localeCompare(a.effective ?? '') || a.name.localeCompare(b.name));
  return byUtility;
}
