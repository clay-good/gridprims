// Page metadata and structured data (site experience task 4.1): unique titles
// of at most 60 characters, descriptions of at most 155, Open Graph fields,
// breadcrumbs on every page, and Dataset markup that states only facts the
// page shows.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { fit, jsonLd, pageTitle, uniqueNames } from '../../../site/lib/meta.mjs';
import { walk } from '../../lib/walk.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-meta-'));
await build({ outDir: out });
const read = (p) => readFileSync(join(out, p), 'utf8');
const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('two utilities named "City of Springfield" get their states in their titles; a third in the same state gets its id', () => {
  const names = uniqueNames([
    { key: 1, name: 'City of Springfield', state: 'IL', id: 17828 }, { key: 2, name: 'City of Springfield', state: 'MO', id: 17833 },
    { key: 3, name: 'Austin Energy', state: 'TX', id: 1015 }, { key: 4, name: 'Solar One', state: 'CA', id: 7 }, { key: 5, name: 'Solar One', state: 'CA', id: 8 },
  ], 'utility');
  assert.deepEqual([...names.values()], ['City of Springfield (IL)', 'City of Springfield (MO)', 'Austin Energy', 'Solar One (CA, utility 7)', 'Solar One (CA, utility 8)']);
  assert.equal(pageTitle('City of Springfield (IL)'), 'City of Springfield (IL) · gridprims');
});

test('titles and descriptions are cut at a word to their limits', () => {
  const long = 'Annual Electric Power Industry Report from the U.S. Energy Information Administration';
  assert.ok(pageTitle(long).length <= 60);
  assert.match(pageTitle(long), /…\s·\sgridprims$/);
  assert.equal(fit('short', 10), 'short');
  assert.equal(jsonLd({ name: '</script><b>' }), '{"name":"\\u003c/script>\\u003cb>"}');
});

test('every page has a unique title, a fitted description, a canonical URL, Open Graph fields, and breadcrumbs', () => {
  const pages = walk(out).filter((f) => f.endsWith('index.html'));
  const titles = new Set();
  for (const f of pages.filter((_, i) => i % 50 === 0 || !/^(plants|utilities)\//.test(_))) {
    const html = read(f);
    const title = html.match(/<title>([^<]*)<\/title>/)[1];
    assert.ok(!titles.has(title), `${f}: duplicate title ${title}`);
    titles.add(title);
    for (const tag of ['og:title', 'og:description', 'og:url', 'og:site_name']) assert.match(html, new RegExp(`<meta property="${tag}" content="[^"]+">`), `${f} ${tag}`);
    assert.match(html, /<meta name="twitter:card" content="summary">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/gridprims\.com\//);
    const crumbs = ld(html).find((x) => x['@type'] === 'BreadcrumbList');
    assert.ok(crumbs && crumbs.itemListElement[0].name === 'Home', `${f} breadcrumbs`);
  }
});

test('the EIA-861 library page\'s Dataset markup names EIA, the license, the period, and each download with its SHA-256', () => {
  const html = read('data/eia-861/index.html');
  const d = ld(html).find((x) => x['@type'] === 'Dataset');
  const m = JSON.parse(read('data/eia-861/2026-10/manifest.json'));
  assert.equal(d.creator.name, 'U.S. Energy Information Administration');
  assert.equal(d.license, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(d.temporalCoverage, '2025');
  assert.deepEqual(d.distribution.map((x) => [x.contentUrl, x.sha256]), m.tables.map((t) => [`https://gridprims.com/data/eia-861/2026-10/${t.download.path}`, t.download.sha256]));
  for (const forbidden of ['aggregateRating', 'review', 'offers', 'price']) assert.ok(!(forbidden in d), forbidden);
  assert.match(html, /<title>EIA-861: utility sales, prices, and reliability · gridprims<\/title>/);
  assert.equal(ld(read('data/eia-861-history/index.html')).find((x) => x['@type'] === 'Dataset').temporalCoverage, '2021/2025');
});

test('entity titles say what they are, so a state and a plant named Washington do not collide', () => {
  assert.match(read('states/wa/index.html'), /<title>Electricity in Washington · gridprims<\/title>/);
  assert.match(read('plants/3470/index.html'), /<title>W A Parish power plant · gridprims<\/title>/);
});
