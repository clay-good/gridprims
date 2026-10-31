// The on-device ZIP and county lookup's logic (public grid data task 5.1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { countiesMatching, lookupCounty, lookupZip, parseZip, statesFor } from '../../../core/lib/zip-lookup.mjs';
import { lookupData } from '../../../site/entities/lookup.mjs';

const data = lookupData(join(ROOT, 'data'));
const shardsFor = (zip) => Object.fromEntries(statesFor(zip, data.zip3).map((st) => [st, data.shards.get(st)]));
const look = (zip) => lookupZip(zip, shardsFor(zip));

test('a four-digit ZIP suggests the dropped leading zero and asks for five digits', () => {
  assert.deepEqual(parseZip('4321'), { ok: false, reason: 'four-digits', suggestion: '04321' });
  assert.deepEqual(parseZip(' 78701 '), { ok: true, zip: '78701' });
  assert.deepEqual(parseZip('78701-1234'), { ok: true, zip: '78701' });
  assert.deepEqual(parseZip('Austin'), { ok: false, reason: 'not-digits' });
  assert.deepEqual(parseZip('123'), { ok: false, reason: 'length' });
  assert.deepEqual(parseZip(''), { ok: false, reason: 'empty' });
});

test('a ZIP whose ZCTA spans two states needs both state shards and lists utilities from both', () => {
  const zip = '86515'; // a Navajo Nation ZCTA in Arizona and New Mexico; its prefix also reaches Utah
  assert.deepEqual(statesFor(zip, data.zip3), ['AZ', 'NM', 'UT']);
  const r = look(zip);
  assert.deepEqual([...new Set(r.counties.map((c) => c.state))].sort(), ['AZ', 'NM']);
  assert.deepEqual([...new Set(r.utilities.map((u) => u.state))].sort(), ['AZ', 'NM']);
});

test('a ZIP in two eGRID subregions lists both', () => {
  const r = look('07401'); // Allendale, New Jersey, in EPA's table under RFCE and NYUP
  assert.equal(r.hasZcta, true);
  assert.equal(r.subregions.length, 2);
});

test('several utilities in the ZIP\'s counties are ordered by customers, with marketers apart', () => {
  const r = look('78701'); // Austin: Austin Energy, plus the retail providers EIA-861 lists for Travis County
  assert.equal(r.counties[0].name, 'Travis County');
  assert.ok(r.utilities.length >= 1);
  for (let i = 1; i < r.utilities.length; i++) assert.ok(r.utilities[i - 1].customers >= r.utilities[i].customers);
  assert.ok(r.marketers.every((u) => u.ownership === 'Retail Power Marketer' || u.kinds.every((k) => k === 'Energy')));
  assert.ok(!r.utilities.some((u) => u.ownership === 'Retail Power Marketer'));
});

test('a ZIP with no ZCTA says so and still returns EPA\'s subregion when it has one', () => {
  const noZcta = Object.keys(data.shards.get('TX').subregions).find((z) => !look(z).hasZcta); // a PO box ZIP
  const r = look(noZcta);
  assert.equal(r.hasZcta, false);
  assert.deepEqual(r.counties, []);
  assert.ok(r.subregions.length >= 1);
});

test('county lookup works inside one state; "Washington" matches by name only after a state is chosen', () => {
  const al = data.shards.get('AL');
  const [wash] = countiesMatching(al, 'Washington County');
  assert.equal(wash.name, 'Washington County');
  const r = lookupCounty('AL', wash.fips, al);
  assert.ok(r.utilities.length >= 1);
  assert.ok(Object.values(Object.fromEntries(data.shards)).filter((s) => countiesMatching(s, 'Washington').length).length > 20, 'the name repeats across many states');
});

test('50 stored cases: ZIP to ZCTA to county to utility matches the publishers\' own files', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { readShard } = await import('../../../core/lib/shard.mjs');
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/lookup-cases.json'), 'utf8'));
  assert.equal(ref.cases.length, 50);
  const territory = readdirSync(join(ROOT, 'data/eia-861/2026-10/service_territory')).flatMap((f) => readShard(readFileSync(join(ROOT, 'data/eia-861/2026-10/service_territory', f))).rows());
  const listed = new Set(territory.map((r) => r.utility_id));
  const v = `snapshot ${data.versions.eia861} (EIA-861), ${data.versions.zcta} (Census), ${data.versions.egrid} (eGRID)`;
  for (const c of ref.cases) {
    const r = look(c.zip);
    const counties = r.counties.map((x) => x.fips).sort();
    const utilities = [...r.utilities, ...r.marketers].map((u) => u.id).sort((a, b) => a - b);
    assert.deepEqual(counties, c.counties, `${c.zip} (${c.kind}) counties: was ${c.counties.join(', ')}, now ${counties.join(', ')}; ${v}`);
    assert.deepEqual(utilities, c.utilities, `${c.zip} (${c.kind}) utilities: was ${c.utilities.join(', ')}, now ${utilities.join(', ')}; ${v}`);
    assert.deepEqual([...r.subregions].sort(), c.subregions, `${c.zip} (${c.kind}) subregions; ${v}`);
    assert.equal(r.hasZcta, c.kind !== 'no-zcta', c.zip);
    for (const id of utilities) assert.ok(listed.has(id), `${c.zip}: utility ${id} has service-territory rows in EIA-861`);
  }
});
