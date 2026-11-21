// The discount and allowance programs as read from the tariff sheets (add-household-bill-check 1.4): every
// record cites its sheet and quotes the figure it uses, and each covers exactly the URDB rates its sheet names.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import PROGRAMS, { GROUPS } from '../../../data/curated/discount-programs.mjs';
import { covers } from '../../../core/lib/discount-programs.mjs';
import { readShard } from '../../../core/lib/shard.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const ca = readShard(readFileSync(join(ROOT, 'data/urdb/2026-10/rates/CA.bin'))).rows().filter((r) => r.sector === 'Residential' && !r.end_date).map((r) => ({ name: r.rate_name, utilityId: Number(r.utility_id) }));
const by = (id) => PROGRAMS.find((p) => p.id === id);
const names = (id) => ca.filter((r) => covers(by(id), r)).map((r) => r.name);

test('every program cites its sheet, quotes the figure it uses, and is one of the groups a household ticks', () => {
  for (const p of PROGRAMS) {
    assert.ok(GROUPS.includes(p.group), p.id);
    assert.match(p.url, /^https:\/\//);
    assert.ok(p.schedule && p.effective && p.quote, p.id);
    const figure = p.kind === 'percent' ? String(p.percent) : String(p.kwhPerDay);
    assert.ok(p.quote.includes(figure.replace(/^35$/, '35.000').replace(/^18$/, p.id === 'sce-fera' ? '18.0' : '18')), `${p.id}: the quote states ${figure}`);
  }
});

test('PG&E CARE covers E-1, E-TOU-C, E-TOU-D, E-ELEC, and EV2, and not the closed E-6, E-7, or E-TOU options', () => {
  const n = names('pge-care');
  for (const re of [/^E-1 /, /^E-TOU-C /, /^E-TOU-D /, /^E-ELEC /, /EV2/]) assert.ok(n.some((x) => re.test(x)), String(re));
  assert.ok(!n.some((x) => /^E-6 |^E-7 |^E-TOU Option/.test(x)));
  assert.ok(!n.some((x) => !/^E-|EV2/.test(x)), 'nothing outside its list');
});

test('SCE FERA covers the TOU-D options only; CARE adds schedule D; neither covers the EV schedules', () => {
  const fera = names('sce-fera');
  assert.ok(fera.length && fera.every((x) => /TOU-D/.test(x) && !/TEV/.test(x)));
  assert.ok(!fera.some((x) => /Domestic Service: D/.test(x)));
  const care = names('sce-care');
  assert.ok(care.some((x) => /Domestic Service: D/.test(x)) && care.some((x) => /TOU-D-PRIME/.test(x)));
  assert.ok(!care.some((x) => /TOU-EV-1|TEV/.test(x)));
});

test('medical baseline: PG&E adds 16.438 kWh a day, SCE 16.5 except on TOU-D-PRIME, and PG&E\'s no-baseline rates take 12%', () => {
  assert.equal(by('pge-medical-baseline').kwhPerDay, 16.438);
  assert.equal(by('sce-medical-baseline').kwhPerDay, 16.5);
  assert.ok(!names('sce-medical-baseline').some((x) => /PRIME/.test(x)));
  assert.deepEqual([...new Set(names('pge-medical-discount').map((x) => x.split(' ')[0]))].sort(), ['E-ELEC', 'E-TOU-D', 'Electric']);
});
