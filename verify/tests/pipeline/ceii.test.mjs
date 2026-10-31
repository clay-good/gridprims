// The automatic CEII screen (public grid data task 7.1): every release is
// screened before it is written, and the record needs no signature.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { ceiiScreen } from '../../../pipeline/lib/ceii.mjs';
import { checkRegistry } from '../../gates/registry.mjs';
import egrid from '../../../pipeline/registry/egrid.mjs';

test('a column that names a location or network detail fails the screen; plain names pass', () => {
  const cols = (...names) => [{ name: 't', columns: names.map((name) => ({ name })) }];
  assert.deepEqual(ceiiScreen({ ceii: { infrastructure: false } }, cols('plant_name', 'county', 'ba_code', 'subregion', 'ieee_highest_voltage'), '2026-10-31').flagged, []);
  assert.deepEqual(ceiiScreen({ ceii: { infrastructure: false } }, cols('latitude', 'plant_lon', 'substation_name', 'bus_impedance', 'poi_name'), '2026-10-31').flagged, ['t.latitude', 't.plant_lon', 't.substation_name', 't.bus_impedance', 't.poi_name']);
  const partial = ceiiScreen({ ceii: { infrastructure: true, checklist: { publicSourceOnly: true } } }, cols('plant_name'), '2026-10-31');
  assert.equal(partial.passed, false);
  assert.ok(partial.unconfirmed.includes('noSubstationPoints'));
});

test('every served version carries a passing record that matches a fresh screen, and nothing waits on a person', () => {
  for (const id of ['eia-860', 'egrid', 'lbnl-queued-up', 'eia-861']) {
    const m = JSON.parse(readFileSync(join(ROOT, 'data', id, '2026-10/manifest.json'), 'utf8'));
    assert.equal(m.ceiiScreen.passed, true, id);
    assert.equal(m.ceiiScreen.rule, '18 CFR 388.113');
    assert.equal(m.ceiiScreen.screened, m.retrieved, 'dated by the run, not by anyone signing');
    assert.ok(!('signedBy' in m.ceiiScreen) && !('reviewer' in m.ceiiScreen));
  }
  assert.equal(JSON.parse(readFileSync(join(ROOT, 'data/egrid/2026-10/manifest.json'), 'utf8')).ceiiScreen.infrastructure, true);
  assert.deepEqual(egrid.ceii.checklist && Object.values(egrid.ceii.checklist).every(Boolean), true);
});

test('the registry gate fails a version whose screen record is missing or stale', async () => {
  const root = mkdtempSync(join(tmpdir(), 'gridprims-ceii-'));
  for (const p of ['pipeline/registry', 'pipeline/lib', 'openspec/changes/add-public-grid-data', 'data/eia-923']) cpSync(join(ROOT, p), join(root, p), { recursive: true });
  cpSync(join(ROOT, 'pipeline/registry/eia-923.mjs'), join(root, 'pipeline/registry/eia-923.mjs'));
  const file = join(root, 'data/eia-923/2026-10/manifest.json');
  const m = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, JSON.stringify({ ...m, ceiiScreen: undefined }));
  assert.match((await checkRegistry(root)).join('\n'), /eia-923 2026-10: no CEII screen record/);
  writeFileSync(file, JSON.stringify({ ...m, ceiiScreen: { ...m.ceiiScreen, columnsChecked: 1 } }));
  assert.match((await checkRegistry(root)).join('\n'), /eia-923 2026-10: the CEII screen record is stale/);
});
