// Each dataset's diff page has its own title: three datasets refreshed to the same version once shared one,
// and the page-metadata gate failed the scheduled refresh.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffPage } from '../../../site/templates/diff.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';

const i18n = createI18n(strings, 'en-US');
const diff = (dataset) => ({ dataset, from: { version: '2026-10', asOf: '2026-10-01' }, to: { version: '2026-11', asOf: '2026-11-01' }, files: { added: [], removed: [], changed: [], unchanged: 3 }, tables: [], tablesRemoved: [] });
const title = (html) => /<title>([^<]*)<\/title>/.exec(String(html))[1];

test('diff pages for datasets refreshed to the same version have different titles that name the dataset', () => {
  const titles = ['eia-923', 'eia-930', 'urdb'].map((id) => title(diffPage({ diff: diff(id), entry: { sourceUrl: 'https://example.gov' }, i18n })));
  assert.equal(new Set(titles).size, 3);
  assert.match(titles[0], /^eia-923, 2026-10 to 2026-11: what changed/);
  for (const x of titles) assert.ok(x.length <= 60, x);
});
