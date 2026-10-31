// Sitemaps and robots.txt (site experience task 4.2): every published page,
// at most 50,000 to a file, each dated by the data it shows, and unchanged
// by a rebuild with unchanged data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { URLS_PER_FILE, sitemaps } from '../../../site/lib/sitemap.mjs';
import { pagesOf } from '../../gates/urls.mjs';
import { tempDir } from '../../lib/temp.mjs';

const a = tempDir('gridprims-sitemap-a-');
const b = tempDir('gridprims-sitemap-b-');
await build({ outDir: a });
await build({ outDir: b });
const read = (dir, p) => readFileSync(join(dir, p), 'utf8');
const entries = (xml) => [...xml.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><\/url>/g)].map((m) => [m[1], m[2]]);

test('a rebuild with no dataset version change leaves every lastmod unchanged', () => {
  assert.equal(read(a, 'sitemap.xml'), read(b, 'sitemap.xml'));
  assert.equal(read(a, 'sitemaps/sitemap-1.xml'), read(b, 'sitemaps/sitemap-1.xml'));
});

test('the sitemaps list every published page and nothing else', () => {
  const listed = entries(read(a, 'sitemaps/sitemap-1.xml')).map(([u]) => u.replace('https://gridprims.com', ''));
  assert.deepEqual(listed, pagesOf(a).sort());
  assert.ok(!listed.includes('/404.html'));
  assert.ok(listed.length > 17000);
});

test('each lastmod is the newest as-of date of the data its page shows', () => {
  const dates = new Map(entries(read(a, 'sitemaps/sitemap-1.xml')).map(([u, d]) => [u.replace('https://gridprims.com', ''), d]));
  const asOf = (id) => JSON.parse(read(a, `data/${id}/2026-10/manifest.json`)).asOf;
  assert.equal(dates.get('/data/egrid/'), asOf('egrid'));
  assert.equal(dates.get('/subregions/erct/'), asOf('egrid'));
  assert.equal(dates.get('/queue/tx/'), asOf('lbnl-queued-up'));
  assert.equal(dates.get('/plants/3470/'), ['eia-860', 'eia-860m', 'eia-923', 'egrid'].map(asOf).sort().at(-1));
  assert.equal(dates.get('/tools/calc/energy-units/convert/'), '2026-10-31', 'a tool page is dated by its version');
});

test('files split at 50,000 URLs under one index; robots.txt allows all and points to it', () => {
  const pages = Array.from({ length: URLS_PER_FILE + 2 }, (_, i) => ({ path: `/p/${String(i).padStart(6, '0')}/`, lastmod: '2026-01-01' }));
  const { files } = sitemaps(pages, 'https://gridprims.com');
  assert.deepEqual(Object.keys(files).sort(), ['sitemap.xml', 'sitemaps/sitemap-1.xml', 'sitemaps/sitemap-2.xml']);
  assert.equal(entries(files['sitemaps/sitemap-2.xml']).length, 2);
  assert.equal(read(a, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: https://gridprims.com/sitemap.xml\n');
});
