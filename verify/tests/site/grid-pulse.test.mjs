// The grid pulse (foundation task 8.7).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridPulse } from '../../../site/ui/grid-pulse.mjs';
import { layout } from '../../../site/templates/layout.mjs';
import { html } from '../../../site/lib/html.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';

const i18n = createI18n(strings, 'en-US');

test('no snapshot: the pulse is absent, not an empty or simulated chart', () => {
  assert.equal(gridPulse(null, i18n), '');
  assert.equal(gridPulse({ region: 'US48', asOf: '2026-10-25', source: 'EIA-930', values: [{ date: '2026-10-25', mw: 1 }] }, i18n), '');
  const page = String(layout({ i18n, title: 'x', description: 'x', path: '/', body: html`<p>x</p>` }));
  assert.doesNotMatch(page, /class="pulse"/);
});

test('a weekly snapshot ending six days ago shows its last 14 daily values with "as of" that date', () => {
  const values = Array.from({ length: 20 }, (_, i) => ({ date: `2026-10-${String(i + 6).padStart(2, '0')}`, mw: 400_000 + i * 1000 }));
  const out = String(gridPulse({ region: 'Lower 48', asOf: '2026-10-25', source: 'EIA-930 Hourly Electric Grid Monitor', values }, i18n));
  assert.match(out, /as of Oct 25, 2026/);
  assert.match(out, /aria-label="Lower 48 daily peak demand, latest 419,000 MW, as of Oct 25, 2026"/);
  assert.equal(out.match(/points="([^"]+)"/)[1].split(' ').length, 14);
  assert.doesNotMatch(out, /live|animate/i);
});
