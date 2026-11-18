// The project pipeline as built (projects/pipeline-pages, projects/stages):
// the served pages, the open JSON, and how a visitor reaches them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const page = (p) => readFileSync(join(out, p, 'index.html'), 'utf8');
const text = (s) => s.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, '\'').replace(/\s+/g, ' ');
const state = (st) => JSON.parse(readFileSync(join(out, 'projects', `${st}.json`), 'utf8'));
const LIMIT = /leaves out transmission lines, pipelines, data centers, and projects not yet reported\. Location stops at the county, and capacity is nameplate\. A reported date is the owner's, not a forecast\./;

test('the national page answers first and keeps Finished apart from work in progress', () => {
  const body = text(page('projects'));
  assert.match(body, /290,242 MW of generating capacity is in progress in the United States, from first plans through construction, as reported to EIA for September 2026\./);
  assert.match(body, /Planned 100,557 MW 695 generators at 320 plants/);
  assert.match(body, /Waiting for approval 64,727 MW 406 generators at 269 plants/);
  assert.match(body, /Approvals received 27,036 MW 228 generators at 189 plants/);
  assert.match(body, /Being built 97,922 MW 1,029 generators at 849 plants/);
  assert.match(body, /Finished 118,972 MW 2,176 generators at 1,831 plants/);
  assert.match(body, /1,745 canceled or postponed generators, 185,357 MW, are counted in no stage\./);
  assert.match(body, LIMIT);
  assert.match(page('projects'), /href="\/projects\/tx\/"/);
});

test('a state page lists its projects with the limits, the queue kept apart, and its source', () => {
  const html = page('projects/tx');
  const body = text(html);
  assert.match(body, /Power projects in Texas/);
  assert.match(body, LIMIT);
  assert.match(body, /Counted separately: Lawrence Berkeley National Laboratory and GridTracker list [\d,]+ active interconnection requests in Texas, [\d,]+ MW, as of Dec 31, 2025\. A queue request is not a commitment to build\./);
  assert.match(html, /href="\/queue\/tx\/"/);
  assert.match(page('queue/tx'), /href="\/projects\/tx\/"/);
  assert.match(body, /U\.S\. Energy Information Administration/);
  assert.equal((html.match(/<tr data-stage=/g) ?? []).length, state('tx').rows.length, 'every row is in the served HTML');
  assert.match(html, /<form class="panel project-filters" data-project-filters hidden/, 'the filters wait for JavaScript, so the page never offers a control that does nothing');
});

test('a row shows its date, stage, and wording; odd records are labeled, not guessed', () => {
  const body = text(page('projects/va'));
  assert.match(body, /Coastal Virginia Offshore Wind \(CVOW\) Commercial Project/);
  assert.match(body, /County not confirmed/);
  const row = state('va').rows.find((r) => r.plantId === 64550);
  assert.deepEqual([row.mw, row.county, row.countyConfirmed], [2640, null, false]);
  assert.match(text(page('projects/ms')), /Henderson \(county not confirmed\)/);
});

test('a plant links to its page only where that page exists', () => {
  for (const st of ['tx', 'ca', 'va']) {
    for (const [, id] of page(`projects/${st}`).matchAll(/<th scope="row"><a href="\/plants\/(\d+)\/"/g)) assert.ok(existsSync(join(out, 'plants', id, 'index.html')), `plant ${id}`);
  }
  const rows = state('tx').rows.filter((r) => !existsSync(join(out, 'plants', String(r.plantId), 'index.html')));
  assert.ok(rows.length > 0, 'some proposed plants have no page');
  assert.ok(!page('projects/tx').includes(`href="/plants/${rows[0].plantId}/"`));
});

test('the JSON holds one state, with its source, inside the size budget', () => {
  const files = readdirSync(join(out, 'projects')).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 51, 'each state and DC');
  let largest = 0;
  for (const f of files) largest = Math.max(largest, gzipSync(readFileSync(join(out, 'projects', f))).length);
  assert.ok(largest <= 40_000, `${largest} bytes compressed`);
  console.log(`BUDGET project JSON largest ${largest} bytes gzip`);
  const tx = state('tx');
  assert.equal(tx.state, 'TX');
  assert.deepEqual([tx.inventoryMonth, tx.asOf, tx.publisher], ['2026-09', '2026-10-23', 'U.S. Energy Information Administration']);
  assert.match(tx.attribution, /Form EIA-860M/);
});

test('the project pages name no coordinate or connection detail', () => {
  const tx = readFileSync(join(out, 'projects', 'tx.json'), 'utf8');
  for (const k of ['latitude', 'longitude', 'poi', 'substation', 'Google Map']) assert.ok(!tx.includes(`"${k}"`), k);
});

test('the Grid section links the pipeline and the home page does not', () => {
  assert.match(page('grid'), /href="\/projects\/"/);
  assert.ok(!page('.').includes('href="/projects/"'));
});

test('the limits page refuses completion odds', () => {
  assert.match(text(page('limits')), /Whether a listed power project will be finished, or when/);
});
