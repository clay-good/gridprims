// NLR Sharing the Sun (add-program-fact-pages 3.1 to 3.4): the posture is
// derived automatically from the publisher's own license page, the terms
// re-capture drops the posture when the page changes, our state sums match the
// laboratory's State Summary for the recorded snapshot (one documented
// difference), and state pages keep in-queue capacity apart with the credit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../../pipeline/run.mjs';
import { postureOf, validateEntry } from '../../../pipeline/lib/registry.mjs';
import { compareTerms } from '../../../pipeline/lib/terms.mjs';
import { served } from '../../../site/entities/plants.mjs';
import { tableRows } from '../../lib/walk.mjs';
import { sharedSite } from '../../lib/shared-site.mjs';
import entry from '../../../pipeline/registry/nlr-sharing-the-sun.mjs';

const built = existsSync(join(ROOT, 'data/nlr-sharing-the-sun/current.json'));

test('the posture is derived from the captured terms, with no hand-set value', () => {
  assert.deepEqual(validateEntry(entry), []);
  assert.equal(entry.posture, undefined);
  assert.equal(postureOf(entry).posture, 'derive');
  // The page as captured keeps derive; a page with the license gone can only stay or drop.
  assert.equal(compareTerms(entry, `<p>${entry.terms.text}</p>`).posture, 'derive');
  const gone = compareTerms(entry, '<p>Data are available on request.</p>');
  assert.equal(gone.changed, true);
  assert.equal(gone.posture, 'derive');
});

test('state capacity by year and in total matches the laboratory\'s own State Summary, but for the documented Maine total', { skip: !built && 'not built' }, () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'verify/reference/nlr-sts-summary-2026-09.json'), 'utf8'));
  const years = served(join(ROOT, 'data'), 'nlr-sharing-the-sun', 'state_years').rows;
  const projects = served(join(ROOT, 'data'), 'nlr-sharing-the-sun', 'state_projects').rows;
  const documented = new Set(tableRows(readFileSync(join(ROOT, 'docs/derivations/community-solar.md'), 'utf8')).keys());
  const off = [];
  for (const [named, v] of Object.entries(ref.states)) {
    const st = named.replace('*', '');
    for (const [y, mw] of Object.entries(v.years)) {
      const got = years.filter((r) => r.state === st && r.year === Number(y)).reduce((n, r) => n + r.mw_ac, 0);
      if (Math.abs(got - mw) > 1e-4) off.push(`${st} ${y}: ${got} against ${mw}`);
    }
    const total = projects.filter((r) => r.state === st).reduce((n, r) => n + r.mw_ac, 0);
    if (Math.abs(total - v.total) > 1e-4 && !documented.has(`${st}-total`)) off.push(`${st} total: ${total} against ${v.total}`);
  }
  assert.deepEqual(off, []);
});

test('a state page shows serving and in-queue capacity apart, never combined, with the credit', { skip: !built && 'not built' }, async () => {
  const out = await sharedSite();
  const html = readFileSync(join(out, 'states/ny/index.html'), 'utf8');
  const section = html.slice(html.indexOf('data-community-solar'), html.indexOf('</section>', html.indexOf('data-community-solar')));
  assert.match(section, /1,514 community solar projects serving customers, 3,068\.9 MW-AC/);
  assert.match(section, /403\.6 MW-AC as in queue/);
  assert.doesNotMatch(section, /3,472/, 'no headline adds the queue to the capacity serving customers');
  assert.match(section, /data-cs-credit>Data: Kannan, S\./);
  assert.doesNotMatch(section, /sign up|subscribe now|save \$/i);
});
