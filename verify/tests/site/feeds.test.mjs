// Atom feeds (site experience task 4.3): the changelog, data releases, and
// corrections, each valid under RFC 4287, with one data entry per version.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { atomFeed, releaseEntry } from '../../../site/lib/atom.mjs';
import { checkAtom } from '../../lib/atom-check.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const read = (p) => readFileSync(join(out, p), 'utf8');

test('each feed is valid Atom', () => {
  for (const f of ['changelog', 'data', 'corrections']) assert.deepEqual(checkAtom(read(`feeds/${f}.xml`)), [], f);
});

test('the data feed has one entry per dataset version, and pages link their feed', () => {
  const versions = readdirSync(join(ROOT, 'data')).filter((id) => { try { return readdirSync(join(ROOT, 'data', id)).includes('current.json'); } catch { return false; } })
    .flatMap((id) => readdirSync(join(ROOT, 'data', id)).filter((v) => /^\d{4}-\d{2}$/.test(v)).map((v) => `https://gridprims.com/data/${id}/${v}/`));
  const ids = [...read('feeds/data.xml').matchAll(/<entry>\n<id>([^<]+)<\/id>/g)].map((m) => m[1]);
  assert.deepEqual(ids.sort(), versions.sort());
  assert.match(read('data/index.html'), /<link rel="alternate" type="application\/atom\+xml" title="gridprims data releases" href="\/feeds\/data\.xml">/);
  assert.match(read('changelog/index.html'), /href="\/feeds\/changelog\.xml"/);
  assert.match(read('corrections/index.html'), /href="\/feeds\/corrections\.xml"/);
});

test('a new EIA-860 version adds one entry with its version id, data period, row changes, and download link', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'data/eia-860/2026-10/manifest.json'), 'utf8'));
  const next = { ...m, version: '2027-09', generatedAt: '2027-09-30T00:00:00Z', tables: m.tables.map((t) => ({ ...t, dataPeriod: '2026', changes: { from: '2026-10', added: 420, removed: 15, changed: 3100 } })) };
  const feed = (ms) => atomFeed({ id: 'https://gridprims.com/feeds/data.xml', title: 't', self: 'https://gridprims.com/feeds/data.xml', alternate: 'https://gridprims.com/data/', author: 'gridprims', entries: ms.map((x) => releaseEntry(x, 'EIA-860: power plants and generators', 'https://gridprims.com')) });
  const before = feed([m]);
  const after = feed([m, next]);
  assert.equal(after.match(/<entry>/g).length, before.match(/<entry>/g).length + 1);
  assert.deepEqual(checkAtom(after), []);
  const entry = after.split('<entry>')[1];
  assert.match(entry, /<id>https:\/\/gridprims\.com\/data\/eia-860\/2027-09\/<\/id>/, 'the newest entry comes first');
  assert.match(entry, /Version 2027-09, data for 2026\. plants: 420 added, 15 removed, 3100 changed; generators: 420 added, 15 removed, 3100 changed\./);
  assert.match(entry, /Download: https:\/\/gridprims\.com\/data\/eia-860\/2027-09\/plants\.csv\.gz/);
  assert.match(after, /<feed[^>]*>\n<id>[^<]+<\/id>\n<title>t<\/title>\n<updated>2027-09-30T00:00:00Z<\/updated>/, 'the feed is dated by its newest entry');
});

test('the checker catches what RFC 4287 forbids', () => {
  assert.deepEqual(checkAtom('<rss/>'), ['the root is not an Atom feed element']);
  const bad = '<feed xmlns="http://www.w3.org/2005/Atom"><id>not an iri</id><title>x</title><updated>2026-10-31</updated><entry><id>https://a.example/1</id><title>y</title><updated>2026-10-31T00:00:00Z</updated></entry></feed>';
  const problems = checkAtom(bad);
  for (const p of [/feed id "not an iri"/, /feed updated "2026-10-31" is not RFC 3339/, /feed has no self link/, /entry 1 has no author/, /entry 1 has neither content nor an alternate link/]) assert.ok(problems.some((x) => p.test(x)), String(p));
});
