// EIA-861 net metering (add-program-fact-pages 2.1, 2.4): the registry entry,
// the survey's own technology names (battery is never merged into
// photovoltaic), and state totals summed from utility rows against EIA's own
// state-level sheet for five states in 2023 and 2025.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { validateEntry } from '../../../pipeline/lib/registry.mjs';
import { served } from '../../../site/entities/plants.mjs';
import entry from '../../../pipeline/registry/eia-861-net-metering.mjs';

const built = existsSync(join(ROOT, 'data/eia-861-net-metering/current.json'));
const nm = built ? served(join(ROOT, 'data'), 'eia-861-net-metering', 'net_metering') : null;

test('the registry entry is valid, owned by the program fact pages, and credits EIA', () => {
  assert.deepEqual(validateEntry(entry), []);
  assert.equal(entry.owner, 'add-program-fact-pages');
  assert.match(entry.attribution, /U\.S\. Energy Information Administration, Form EIA-861, Net Metering/);
});

test('technologies keep the survey\'s names, and battery stays apart from photovoltaic', { skip: !built && 'not built' }, () => {
  const techs = new Set(nm.rows.filter((r) => r.data_year === 2025).map((r) => r.technology));
  assert.ok(techs.has('Photovoltaic') && techs.has('Battery') && techs.has('All Technologies'), [...techs].join(', '));
  assert.ok(nm.rows.some((r) => r.data_year === 2025 && r.technology === 'Battery' && r.measure === 'PV-Paired Battery Capacity (MW)'));
});

test('state totals summed from utility rows equal EIA\'s own state-level sheet: five states, 2023 and 2025', { skip: !built && 'not built' }, () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eia-861-net-metering-states.json'), 'utf8'));
  const sum = (year, st, tech, measure) => nm.rows.filter((r) => r.data_year === year && r.state === st && r.technology === tech && r.measure === measure && r.sector === 'Total').reduce((n, r) => n + r.value, 0);
  const off = [];
  for (const [year, states] of Object.entries(ref.years)) {
    for (const [st, want] of Object.entries(states)) {
      const got = { pvCapacityMw: sum(+year, st, 'Photovoltaic', 'Capacity MW'), pvInstallations: sum(+year, st, 'Photovoltaic', 'Installations'), allCapacityMw: sum(+year, st, 'All Technologies', 'Capacity MW'), allInstallations: sum(+year, st, 'All Technologies', 'Installations') };
      for (const k of Object.keys(want)) if (Math.abs(got[k] - want[k]) > 0.0015) off.push(`${year} ${st} ${k}: ${got[k]} against EIA's ${want[k]}`);
    }
  }
  assert.deepEqual(off, []);
});
