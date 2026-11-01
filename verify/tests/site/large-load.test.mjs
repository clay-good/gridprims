// The large-load request card's prefill (add-large-load-screen 1.3, request
// context verification): the figures it fills read the same values as the
// utility pages for 10 sampled utilities, and three utilities recomputed by
// hand from their cited Form 714 and EIA-861 rows give the same percents to
// 0.1 point and the same homes to 100.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { runTool } from '../../../core/contract/run.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const built = existsSync(join(ROOT, 'data/pudl-ferc714/current.json')) && existsSync(join(ROOT, 'data/eia-861/current.json'));
const out = await sharedSite();
const prefill = built ? JSON.parse(readFileSync(join(out, 'large-load/utilities.json'), 'utf8')) : null;
const tool = TOOLS.find((t) => t.manifest.id === 'grid.large-load.context');

test('the prefill reads the same peak as the utility page for 10 sampled utilities', { skip: !built && 'not built' }, () => {
  const withPage = prefill.utilities.filter((u) => u.page);
  const withPeak = withPage.filter((u) => u.peak);
  const sample = [...withPeak.slice(0, 5), ...withPage.filter((u) => !u.peak).filter((_, i) => i % 97 === 0).slice(0, 5)];
  assert.equal(sample.length, 10);
  for (const u of sample) {
    const page = readFileSync(join(out, `utilities/${u.id}/index.html`), 'utf8');
    const shown = /<p data-peak>([^<]*)<\/p>/.exec(page)[1];
    if (u.peak) assert.ok(shown.includes(`${Math.round(u.peak.mw).toLocaleString('en-US')} MW`) && shown.includes(String(u.peak.year)), `${u.id}: ${shown}`);
    else assert.doesNotMatch(shown, /\d MW/, `${u.id}: ${shown}`);
  }
});

test('three utilities recomputed by hand from their cited rows give the same answers', { skip: !built && 'not built' }, () => {
  const fx = JSON.parse(readFileSync(join(ROOT, 'verify/fixtures/large-load/request-context.json'), 'utf8'));
  assert.equal(fx.cases.length, 3);
  for (const c of fx.cases) {
    const u = prefill.utilities.find((x) => x.id === c.utility_id);
    assert.deepEqual([u.salesMwh, u.residentialKwh ?? u.resKwh, u.peak.mw], [c.hand.salesMwh, c.hand.residentialKwh, c.hand.peakMw], c.name);
    const r = runTool(tool.manifest, tool.impl, { ...fx.request, peakMw: u.peak.mw, salesMwh: u.salesMwh, residentialKwh: u.resKwh });
    assert.ok(Math.abs(r.outputs.peakShare.value - c.hand.peakShare) <= 0.1, `${c.name} peak share`);
    assert.ok(Math.abs(r.outputs.salesShare.value - c.hand.salesShare) <= 0.1, `${c.name} sales share`);
    assert.ok(Math.abs(r.outputs.homes.value - c.hand.homes) <= 100, `${c.name} homes`);
  }
});
