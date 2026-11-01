// Net metering on state and utility pages (add-program-fact-pages 2.2, 2.3):
// capacity by the survey's technology groups with battery apart, the
// non-net-metered arrangement shown separately, a utility that reported none
// said in words, and the rules linked, never restated.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const built = existsSync(join(ROOT, 'data/eia-861-net-metering/current.json'));
const out = await sharedSite();
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/&#39;/g, "'");

test('a state page breaks net metering out by technology, keeps battery apart, and shows non-net-metered generation separately', { skip: !built && 'not built' }, () => {
  const html = readFileSync(join(out, 'states/ca/index.html'), 'utf8');
  const s = text(html.slice(html.indexOf('data-net-metering')));
  assert.match(s, /Net-metered capacity in California by technology/);
  assert.match(s, /Photovoltaic \(MW\) Battery or storage \(MW\) Wind \(MW\)/);
  assert.match(s, /2025 20,041\.1 3,272\.0/);
  assert.match(s, /Neither is added into photovoltaic here/);
  assert.match(s, /Distributed generation that is not net metered A different arrangement/);
  assert.match(s, /We do not restate net metering rules, which change/);
  assert.match(html, /href="https:\/\/programs\.dsireusa\.org\/system\/program\?state=CA"/);
  assert.match(html, /href="https:\/\/www\.cpuc\.ca\.gov\/"/);
});

test('a utility that reported none says so for the year, and links its state\'s page and rules', { skip: !built && 'not built' }, () => {
  const dir = join(out, 'utilities');
  const page = readdirSync(dir).map((d) => readFileSync(join(dir, d, 'index.html'), 'utf8')).find((h) => h.includes('data-nm-none'));
  assert.ok(page, 'some utility reported none');
  assert.match(text(page), /reported no net-metered capacity to EIA for 2025/);
  assert.match(page, /href="\/states\/[a-z]{2}\/">Net metering in/);
  assert.match(page, /data-nm-rules/);
});
