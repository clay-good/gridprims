// The shipped EAGLE-I events against an independent Python computation for
// three counties (add-electrification-tools 1.5): the same count of events,
// and every duration within 15 minutes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { served } from '../../../site/entities/plants.mjs';

const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/eaglei-events-3-counties.json'), 'utf8'));
const events = served(join(ROOT, 'data'), 'eaglei', 'events');

test('three counties: event counts match exactly, and every duration is within 15 minutes', { skip: !events && 'eaglei is not built' }, () => {
  for (const [fips, want] of Object.entries(ref.counties)) {
    const got = events.rows.filter((r) => r.fips === fips);
    assert.equal(got.length, want.count, `${want.name}: ${got.length} events, expected ${want.count}`);
    assert.ok(want.count > 10, `${want.name} has events to compare`);
    got.forEach((e, i) => {
      assert.equal(e.start, want.events[i].start, `${want.name} event ${i}`);
      assert.ok(Math.abs(e.hours - want.events[i].hours) <= 0.25, `${want.name} event ${i}: ${e.hours} h against ${want.events[i].hours} h`);
    });
  }
});
