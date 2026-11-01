// The large-load terms table (add-large-load-screen 1.1, 1.2, 2.1): a field
// without a passing primary source reads "Not public"; a news-only citation
// fails the check; one archived source publishes only when the second is
// shown unreachable, labeled single source; a record unchecked for 13 months
// needs review; Texas's rule applies to ERCOT utilities only; and the
// downloads carry every citation with an archived copy that matches.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { checkRecord } from '../../../pipeline/lib/curated.mjs';
import { termsData, termsFor } from '../../../site/entities/large-load-terms.mjs';
import { AEP_PAGE, PUCO_DOCKET } from '../../../data/curated/large-load-tariffs/_sources.mjs';
import aep from '../../../data/curated/large-load-tariffs/aep-ohio-dct.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';

const out = await sharedSite();
const NOW = Date.parse('2026-11-01T00:00:00Z');
const record = (fields) => ({ ...aep, id: 'test', fields });

test('every committed record passes; each field is single source with its blocked second recorded, or reads "Not public"', () => {
  const d = termsData(ROOT, NOW);
  assert.deepEqual(d.entries.map((e) => e.id), ['aep-ohio-dct', 'dominion-gs5', 'georgia-power-large-load', 'texas-25-194']);
  for (const e of d.entries) {
    for (const [k, f] of Object.entries(e.fields)) {
      if (f.value === null) { assert.deepEqual(f.citations, [], `${e.id}.${k}`); continue; }
      assert.ok(f.citations.length >= 1 && f.citations.every((c) => c.archive && c.sha256), `${e.id}.${k} cites an archived copy`);
      if (f.label) assert.match(f.label, /^single source: the second \(.+\) was unreachable on 2026-11-01$/, `${e.id}.${k}`);
    }
  }
  assert.equal(d.entries.find((e) => e.id === 'georgia-power-large-load').fields.exitFee.value, null, 'Georgia\'s exit fee is not public');
});

test('a term cited only to a news article fails and asks for the order or tariff sheet', () => {
  const r = checkRecord(record({ threshold: { value: '25 MW', disputable: true, sources: [{ type: 'news', publisher: 'Utility Dive', url: 'https://www.utilitydive.com/x', retrieved: '2026-11-01' }] } }), ROOT);
  assert.ok(!('threshold' in r.publishable));
  assert.match(r.problems.join('\n'), /cites a news source.*cite the order, tariff sheet, or regulator's page instead/);
});

test('one archived citation fails unless the second source is recorded as unreachable, then publishes labeled', () => {
  const one = checkRecord(record({ threshold: { value: '25 MW', disputable: true, sources: [{ ...AEP_PAGE, locator: 'x' }] } }), ROOT);
  assert.match(one.problems.join('\n'), /needs two independent archived primary sources; it has 1/);
  const two = checkRecord(record({ threshold: { value: '25 MW', disputable: true, sources: [{ ...AEP_PAGE, locator: 'x' }, PUCO_DOCKET] } }), ROOT);
  assert.equal(two.publishable.threshold, '25 MW');
  assert.match(two.labels.threshold, /single source/);
});

test('a record last checked 13 months ago needs review', () => {
  const stale = { ...aep, lastChecked: '2025-10-01' };
  const [e] = termsData(ROOT, NOW, [stale]).entries;
  assert.equal(e.needsReview, true);
  assert.equal(termsData(ROOT, NOW).entries[0].needsReview, false);
});

test('Texas\'s §25.194 applies to an ERCOT utility and not to a Texas utility outside ERCOT', () => {
  const d = termsData(ROOT, NOW);
  assert.deepEqual(termsFor(d, { id: 44372, state: 'TX', baCodes: ['ERCO'] }).map((e) => e.id), ['texas-25-194']);
  assert.deepEqual(termsFor(d, { id: 5701, state: 'TX', baCodes: ['EPE'] }), []);
  assert.deepEqual(termsFor(d, { id: 14006, state: 'OH', baCodes: ['PJM'] }).map((e) => e.id), ['aep-ohio-dct']);
});

test('the page and downloads carry every citation, and every archived copy matches its checksum', () => {
  const page = readFileSync(join(out, 'large-load/terms/index.html'), 'utf8');
  const json = JSON.parse(readFileSync(join(out, 'large-load/terms/terms.json'), 'utf8'));
  assert.equal(json.license, 'CC BY 4.0');
  for (const e of json.entries) {
    assert.match(page, new RegExp(`data-term-entry="${e.id}"`));
    for (const f of Object.values(e.fields)) for (const c of f.citations) {
      const copy = readFileSync(join(out, c.archive));
      assert.equal(createHash('sha256').update(copy).digest('hex'), c.sha256, c.archive);
    }
  }
  assert.match(page, /data-not-public>Not public/);
  const csv = readFileSync(join(out, 'large-load/terms/terms.csv'), 'utf8').trim().split('\n');
  assert.equal(csv.length - 1, json.entries.length * 12);
  assert.match(csv[0], /^entry,type,name,state,field,value,label,source,source_url,locator,archive,archive_sha256,last_checked$/);
});
