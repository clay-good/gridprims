// Texas's interconnection tests as screen records (add-interconnection-screens 1.2): each number is in its own
// subsection of the stored PUCT text, and with the Secretary of State's page recorded unreachable, each
// threshold publishes labeled single-source rather than waiting on a person.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCREENS, record } from '../../../data/curated/interconnect/tx/_screens.mjs';
import { checkRecord } from '../../../pipeline/lib/curated.mjs';
import { checkScreenRecord } from '../../../pipeline/lib/screen-records.mjs';
import { ROOT } from '../../../pipeline/run.mjs';

const capture = readFileSync(`${ROOT}/data/curated/captures/interconnect/puct-25.211.txt`, 'utf8').split('\n----\n')[1];
const part = (locator) => { const start = capture.indexOf(`[${locator}]`); const next = capture.indexOf('\n[', start + 1); assert.ok(start >= 0, locator); return capture.slice(start, next < 0 ? undefined : next); };

test('every number is in its own subsection of the PUCT text', () => {
  for (const s of SCREENS) for (const x of s.numbers) assert.ok(part(s.locator).includes(x), `${s.locator}: ${x}`);
  assert.match(part('§ 25.211(g)(1)'), /up to 500 kW that export not more than 15% of the total load on a single radial feeder/);
});

test('each record passes, its threshold labeled single-source with the date the second source was unreachable', () => {
  for (const s of SCREENS) {
    const r = record(s.id);
    assert.equal(r.jurisdiction, 'TX');
    assert.deepEqual(checkScreenRecord(r), [], s.id);
    const c = checkRecord(r, ROOT);
    assert.deepEqual(c.problems, [], s.id);
    assert.match(c.labels.threshold, /^single source: the second \(https:\/\/texreg\.sos\.state\.tx\.us\/.+\) was unreachable on 2026-11-16$/);
    assert.equal(c.publishable.threshold, s.threshold);
  }
});
