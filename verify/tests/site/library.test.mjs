// The data library (public grid data tasks 6.1 and 6.2): every dataset with
// its status, versions, changelog, per-file license, citation, and stable
// file addresses readable from any origin.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { serveWorker } from '../../lib/worker-server.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-library-'));
await build({ outDir: out });
const read = (p) => readFileSync(join(out, p), 'utf8');
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');
const sha = (b) => createHash('sha256').update(b).digest('hex');

test('the library lists every dataset with license, credit, period, dates, cadence, and rows; eGRID can say it waits on EPA', () => {
  const html = read('data/index.html');
  for (const id of ['eia-861', 'eia-861-history', 'eia-860', 'eia-860m', 'eia-923', 'egrid', 'census-zcta-county', 'pudl-ferc714', 'urdb', 'lbnl-queued-up']) assert.match(html, new RegExp(`data-library="${id}"`), id);
  const egrid = html.split('data-library="egrid"')[1].split('</li>')[0];
  assert.match(egrid, /data-late-from="2026-03-02" hidden/, 'revealed on the device: eGRID2024 was planned for January 2026');
  assert.match(text(egrid), /Waiting on publisher: the publisher planned the next release by Jan 31, 2026, and it has not come out\. Last checked Oct 31, 2026\./);
  assert.match(text(egrid), /License CC-BY-4.0 Data period 2023 As of Jun 16, 2025 Retrieved Oct 31, 2026 Refresh Yearly Rows [\d,]+/);
});

test('copying the EIA-861 citation names EIA, the form and year, the release date, gridprims as redistributor, the version, and a checksum that a re-download matches', () => {
  const cite = text(read('data/eia-861/index.html').match(/<pre[^>]*data-citation>([\s\S]*?)<\/pre>/)[1]);
  assert.match(cite, /^U\.S\. Energy Information Administration\. Annual Electric Power Industry Report \(Form EIA-861\), data for 2025, released Oct 7, 2026\. Redistributed by gridprims\.com, version 2026-10, manifest SHA-256 ([0-9a-f]{64})\. https:\/\/gridprims\.com\/data\/eia-861\/2026-10\/$/);
  assert.equal(cite.match(/SHA-256 ([0-9a-f]{64})/)[1], sha(readFileSync(join(out, 'data/eia-861/2026-10/manifest.json'))));
  const m = JSON.parse(read('data/eia-861/2026-10/manifest.json'));
  for (const t of m.tables) assert.equal(sha(readFileSync(join(out, 'data/eia-861/2026-10', t.download.path))), t.download.sha256, `${t.name} download`);
});

test('each download shows its license and credits, and its changelog; the queue file shows CC BY 4.0 and LBNL and GridTracker', () => {
  const queue = text(read('data/lbnl-queued-up/index.html'));
  assert.match(queue, /License: CC-BY-4.0\. Credits: Lawrence Berkeley National Laboratory and GridTracker\./);
  assert.match(queue, /First version: no earlier version to compare\./);
  const urdb = text(read('data/urdb/index.html'));
  assert.match(urdb, /Credits: U\.S\. Utility Rate Database, OpenEI .* Source: U\.S\. Energy Information Administration, Form EIA-861 \(Oct 2026\)\./, 'a joined dataset\'s credit travels with the table');
  assert.match(text(read('data/eia-860/index.html')), /Versions Version Data period Retrieved Manifest and SHA-256 2026-10 \(current\) 2025 Oct 31, 2026 manifest\.json [0-9a-f]{64}/);
});

test('a notebook on another origin reads the latest EIA-861 CSV without credentials, and the manifest names the version', async () => {
  const w = await serveWorker(out);
  try {
    const opts = { headers: { origin: 'https://notebooks.example' }, redirect: 'manual' };
    const hop = await fetch(`${w.url}/data/eia-861/latest/sales.csv.gz`, opts);
    assert.equal(hop.status, 302);
    assert.equal(hop.headers.get('location'), '/data/eia-861/2026-10/sales.csv.gz');
    assert.equal(hop.headers.get('access-control-allow-origin'), '*');
    const file = await fetch(`${w.url}${hop.headers.get('location')}`, opts);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('access-control-allow-origin'), '*');
    assert.equal(file.headers.get('cross-origin-resource-policy'), 'cross-origin');
    assert.match(gunzipSync(Buffer.from(await file.arrayBuffer())).toString().split('\n')[0], /^data_year,utility_id,utility_name/);
    const manifest = await (await fetch(`${w.url}/data/eia-861/latest/manifest.json`)).json();
    assert.equal(manifest.version, '2026-10');
    const page = await fetch(`${w.url}/data/eia-861/`);
    assert.equal(page.headers.get('access-control-allow-origin'), null, 'pages stay same-origin');
    assert.equal(page.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.equal((await fetch(`${w.url}/data/no-such-dataset/latest/x.csv.gz`, opts)).status, 404);
  } finally {
    await w.close();
  }
});

test('the Developers page documents the data addresses and the manifest', () => {
  const dev = text(read('developers/index.html'));
  for (const p of ['/data/<dataset>/current.json', '/data/<dataset>/<version>/manifest.json', '/data/<dataset>/<version>/<table>.csv.gz', '/data/<dataset>/latest/<file>']) assert.ok(dev.includes(p), p);
  assert.match(dev, /served to any origin without credentials/);
});
