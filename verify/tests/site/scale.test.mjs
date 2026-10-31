// The site generator at scale (foundation task 4.5): 20,000 pages through the
// same layout and escaping in well under the 10-minute budget.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { html } from '../../../site/lib/html.mjs';
import { layout } from '../../../site/templates/layout.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { tempDir } from '../../lib/temp.mjs';

test('20,000 fixture pages render and write in under 10 minutes', { timeout: 600_000 }, () => {
  const i18n = createI18n(strings, 'en-US');
  const dir = tempDir('gridprims-scale-');
  const t0 = performance.now();
  for (let i = 0; i < 20_000; i++) {
    const name = `Fixture Utility <${i}> & Co`;
    const body = html`<h1>${name}</h1><table>${Array.from({ length: 12 }, (_, m) => html`<tr><th>${m + 1}</th><td class="num">${(i * 7 + m) % 1000}</td></tr>`)}</table>`;
    const page = String(layout({ i18n, title: name, description: name, path: `/utility/${i}/`, body }));
    const d = join(dir, 'utility', String(i));
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'index.html'), page);
  }
  const seconds = (performance.now() - t0) / 1000;
  console.log(`BUDGET site-generator 20000 pages ${seconds.toFixed(1)} s`);
  assert.equal(readdirSync(join(dir, 'utility')).length, 20_000);
  assert.ok(seconds < 600, `${seconds} s`);
});
