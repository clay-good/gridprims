// The consistency checks (add-data-continuity-ledger 3.1 to 3.7): pair and
// total interchange residuals match an independent Python rerun of EIA's
// files, the residual's meaning and the publisher's definition are on the
// page, reliability coverage by method, the missing-field shares, both
// readings of the total with the smaller leading, no composite, and the
// deferred checks with reasons.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { consistencyChecks } from '../../../site/entities/checks.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const built = existsSync(join(ROOT, 'data/eia-930-interchange/current.json'));
const out = await sharedSite();
const html = readFileSync(join(out, 'ledger/checks/index.html'), 'utf8');

test('pair and total residuals equal the independent rerun of EIA\'s own files', { skip: !built && 'not built' }, () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eia-930-interchange-2025.json'), 'utf8'));
  const c = consistencyChecks(join(ROOT, 'data')).interchange;
  for (const [pair, want] of Object.entries(ref.pairs)) {
    const [ba, neighbor] = pair.split('|');
    const got = c.pairs.find((p) => p.ba === ba && p.neighbor === neighbor);
    assert.deepEqual([got.hours_tested, got.hours_unavailable, got.residual_pct], [want.tested, want.unavailable, want.residualPct], pair);
  }
  for (const [ba, want] of Object.entries(ref.totals)) {
    const got = c.totals.find((x) => x.ba === ba);
    assert.deepEqual([got.hours_tested, got.reported_residual_pct], [want.tested, want.reportedResidualPct], ba);
  }
});

test('both readings of a total, the smaller leading', { skip: !built && 'not built' }, () => {
  for (const x of consistencyChecks(join(ROOT, 'data')).interchange.totals) {
    const lead = x.leading_reading === 'reported total' ? x.reported_residual_pct : x.adjusted_residual_pct;
    assert.ok(lead <= Math.min(x.reported_residual_pct, x.adjusted_residual_pct ?? Infinity), x.ba);
  }
});

test('the page cites the definition, says what a residual means, refuses an index, and names the deferred checks', () => {
  assert.match(html, /data-checks-meaning>A residual is an inconsistency between two reports of the same flow, not electricity that went missing or appeared/);
  assert.match(html, /href="https:\/\/www\.eia\.gov\/electricity\/930-content\/about\.html"/);
  assert.match(html, /data-checks-no-index>There is no overall score here/);
  assert.match(html, /data-checks-reliability/);
  assert.match(html, /IEEE 1366 method/);
  assert.match(html, /data-checks-missing/);
  assert.match(html, /data-checks-deferred[\s\S]*EIA-930 against EIA-923/);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), /\b(grade|score of|ranking|ranked)\b/i);
});
