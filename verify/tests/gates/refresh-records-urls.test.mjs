// The scheduled data refresh records the pages it publishes on purpose (each new release's diff page) with the
// URL-only switch, so it no longer fails on its own new pages, and never with GRIDPRIMS_RECORD, which would
// also accept a tool's changed results without a changelog entry.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';

test('the refresh workflow records new URLs, and only URLs, on its gates step', () => {
  const yml = readFileSync(join(ROOT, '.github/workflows/refresh-data.yml'), 'utf8');
  const step = /- name: Gates on the result\n([\s\S]*?)(?=\n {6}- name:)/.exec(yml)?.[1] ?? '';
  assert.match(step, /run: node verify\/check\.mjs/);
  assert.match(step, /GRIDPRIMS_RECORD_URLS: '1'/);
  assert.doesNotMatch(yml, /GRIDPRIMS_RECORD[^_]/);
  const check = readFileSync(join(ROOT, 'verify/check.mjs'), 'utf8');
  assert.match(check, /checkSiteUrls\(root, \{ record: Boolean\(process\.env\.GRIDPRIMS_RECORD \|\| process\.env\.GRIDPRIMS_RECORD_URLS\) \}\)/);
  assert.match(check, /checkVersions\(root, \{ record: Boolean\(process\.env\.GRIDPRIMS_RECORD\) \}\)/, 'the versions gate does not take the URL switch');
});
