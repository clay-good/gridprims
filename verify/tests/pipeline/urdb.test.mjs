// OpenEI URDB (public grid data task 1.3): rates in effect, placed by state
// through EIA-861, with their structures kept as URDB writes them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { ROOT, runRecipe } from '../../../pipeline/run.mjs';
import { checkDataset } from '../../../pipeline/check.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { urdbDate } from '../../../pipeline/normalize/urdb-rates.mjs';
import entry from '../../../pipeline/registry/urdb.mjs';
import eia861 from '../../../pipeline/registry/eia-861.mjs';
import { eia861Zip, smallTables } from '../../fixtures/data/eia-861/workbook.mjs';
import { tempDir } from '../../lib/temp.mjs';

const sched = (p) => Array.from({ length: 12 }, () => Array(24).fill(p));
const rate = (id, eiaId, f = {}) => ({ _id: { $oid: id }, eiaId, utilityName: `Utility ${eiaId}`, rateName: `Rate ${id}`, sector: 'Residential', approved: true,
  effectiveDate: { $date: '2024-01-01T05:00:00Z' }, revisions: [{ date: { $date: '2024-02-01T00:00:00Z' }, userid: '1' }, { date: { $date: '2025-03-04T09:00:00Z' }, userid: '2' }],
  fixedChargeFirstMeter: 12.5, fixedChargeUnits: '$/month', energyRateStrux: [{ energyRateTiers: [{ max: 500, rate: 0.11 }, { rate: 0.13 }] }],
  energyWeekdaySched: sched(0), energyWeekendSched: sched(0), ...f });
/** EIA-861's fixture utilities: 55 sells in MS, 84 in VA (sales), 1015 serves TX counties (territory). */
const bulk = (rates) => gzipSync(JSON.stringify(rates ?? [
  rate('a1', 84), rate('a2', 1015, { demandRatchetPercentage: Array(12).fill(0.8), dgRules: 'Net Metering' }),
  rate('a3', 55, { endDate: { $date: { $numberLong: String(Date.parse('2026-12-31T00:00:00Z')) } } }),
  rate('old', 84, { endDate: { $date: '2025-12-31T00:00:00Z' } }), // expired: stays in OpenEI's file
  rate('gone', 424242), // utility not in EIA-861
]));

/** A data folder with the EIA-861 fixture served, so the join has something to read. */
async function withEia861() {
  const out = tempDir('gridprims-urdb-');
  const r = await runRecipe({ dataset: 'eia-861', year: 2025, retrieved: '2026-10-31', outDir: out, input: eia861Zip(),
    entry: { ...eia861, vintages: { 2025: { ...eia861.vintages[2025], sha256: null } }, tables: smallTables(eia861) } });
  assert.equal(r.ok, true, r.failures?.join('\n'));
  return out;
}
const small = { ...entry, vintages: { '2026-10': { ...entry.vintages['2026-10'], sha256: null } }, tables: entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) })) };
const run = (out, o) => runRecipe({ dataset: 'urdb', year: '2026-10', retrieved: '2026-10-31', entry: small, input: bulk(), outDir: out, ...o });
const shard = (out, st) => readShard(readFileSync(join(out, 'urdb/2026-10/rates', `${st}.bin`))).rows();

test('rates in effect are placed by their utility\'s EIA-861 states; expired ones are left out', async () => {
  const out = await withEia861();
  const r = await run(out);
  assert.equal(r.ok, true, r.failures?.join('\n'));
  const t = r.manifest.tables[0];
  assert.deepEqual([t.rows, t.unmatched, t.shards.map((s) => s.state).join(' ')], [4, 1, 'MS TX VA unmatched']);
  assert.deepEqual(t.joinedFrom, [{ dataset: 'eia-861', table: 'sales', version: '2026-10' }, { dataset: 'eia-861', table: 'service_territory', version: '2026-10' }]);
  assert.ok(!['VA', 'TX', 'MS', 'unmatched'].flatMap((s) => shard(out, s)).some((x) => x.label === 'old'));
  assert.deepEqual(shard(out, 'unmatched').map((x) => [x.label, x.state, x.utility_states]), [['gone', null, 0]]);
});

test('URDB\'s structures stay URDB\'s JSON; dates, revisions, and flags are plain', async () => {
  const out = await withEia861();
  await run(out);
  const [va] = shard(out, 'VA');
  assert.deepEqual(JSON.parse(va.energy_rate_structure), [{ energyRateTiers: [{ max: 500, rate: 0.11 }, { rate: 0.13 }] }]);
  assert.equal(JSON.parse(va.energy_weekday_schedule).length, 12);
  assert.deepEqual([va.effective_date, va.last_revised, va.approved, va.fixed_charge, va.fixed_charge_units, va.end_date], ['2024-01-01', '2025-03-04', 'Y', 12.5, '$/month', null]);
  const [tx] = shard(out, 'TX');
  assert.deepEqual([tx.utility_id, tx.dg_rules, JSON.parse(tx.demand_ratchet_percentage)[0]], [1015, 'Net Metering', 0.8], 'a territory-only utility is placed through its counties');
  assert.equal(shard(out, 'MS')[0].end_date, '2026-12-31', 'a $numberLong date reads the same as an ISO one');
  assert.equal(urdbDate({ $date: 1767139200000 }), '2025-12-31');
});

test('the table credits OpenEI and EIA, whose states it uses', async () => {
  const out = await withEia861();
  const r = await run(out);
  assert.deepEqual(r.manifest.tables[0].credits.map((c) => c.publisher), [entry.publisher, eia861.publisher]);
});

test('without EIA-861 built, the join fails and nothing is written', async () => {
  const out = tempDir('gridprims-urdb-');
  const r = await run(out);
  assert.match(r.failures[0], /^rates: join needs eia-861, which is not built in /);
  assert.ok(!existsSync(join(out, 'urdb')));
});

test('the placement quirk fixture from the real file still holds', () => {
  const pinned = JSON.parse(readFileSync(join(ROOT, 'verify/fixtures/data/urdb/placement.json'), 'utf8'));
  const keep = (x) => ({ label: x.label, state: x.state, utility_id: x.utility_id, utility_states: x.utility_states, utility_name: x.utility_name, rate_name: x.rate_name });
  for (const want of pinned.rows) assert.deepEqual(readShard(readFileSync(join(ROOT, `data/urdb/2026-10/rates/${want.state}.bin`))).rows().filter((x) => x.label === want.label).map(keep), [want]);
  assert.deepEqual(readShard(readFileSync(join(ROOT, 'data/urdb/2026-10/rates/unmatched.bin'))).rows().filter((x) => x.label === pinned.unmatched[0].label).map(keep), pinned.unmatched);
});

test('release watch: the file rewritten daily is taken once a month', async () => {
  const out = await withEia861();
  await run(out);
  const url = entry.releaseWatch.urls[0];
  const site = async (u, init = {}) => {
    if (u === entry.terms.url) return new Response(`<footer>${entry.terms.text}</footer>`, { status: 200 });
    if (u !== url) return new Response('', { status: 404 });
    const b = bulk();
    return new Response(init.method === 'HEAD' ? null : b, { status: 200, headers: { 'content-length': String(b.length), 'last-modified': 'Sun, 29 Nov 2026 08:43:34 GMT' } });
  };
  const same = await checkDataset({ dataset: 'urdb', entry: small, outDir: out, today: '2026-10-31', fetch: site });
  assert.deepEqual([same.refreshed, same.waiting], [false, 'already taken this month (2026-10)']);
  const next = await checkDataset({ dataset: 'urdb', entry: small, outDir: out, today: '2026-11-30', fetch: site });
  assert.equal(next.failure, undefined);
  assert.deepEqual([next.refreshed, next.version, next.found, next.posture], [true, '2026-11', 'monthly refresh 2026-11', 'mirror']);
});
