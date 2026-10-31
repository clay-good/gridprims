// security.txt and the disclosure policy (trust-and-continuity tasks 1.1 to 1.4).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../../site/build.mjs';
import { elevenMonthsAfter, securityTxt } from '../../../site/security-txt.mjs';
import { changelogPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import strings from '../../../site/strings/en-US.mjs';
import worker from '../../../worker/index.mjs';

const out = mkdtempSync(join(tmpdir(), 'gridprims-dist-'));
await build({ outDir: out });
const txt = readFileSync(join(out, '.well-known/security.txt'), 'utf8');

/** CI's guard on the generator: every RFC 9116 field, and an expiry ahead but under a year away. */
export function checkSecurityTxt(text, now = Date.now()) {
  const field = (k) => new RegExp(`^${k}: (.+)$`, 'm').exec(text)?.[1];
  const problems = [];
  for (const k of ['Contact', 'Expires', 'Policy', 'Preferred-Languages', 'Canonical']) if (!field(k)) problems.push(`missing ${k}`);
  const exp = Date.parse(field('Expires'));
  if (!(exp > now)) problems.push('site/security-txt.mjs generated an expiry in the past');
  if (exp - now > 365 * 86_400_000) problems.push('expiry is more than a year away');
  return problems;
}

test('security.txt has every RFC 9116 field and an expiry under a year ahead', () => {
  assert.deepEqual(checkSecurityTxt(txt), []);
  assert.match(txt, /^Contact: https:\/\/gridprims\.com\/report\/$/m);
  assert.match(txt, /^Policy: https:\/\/gridprims\.com\/security\/$/m);
  assert.match(txt, /^Canonical: https:\/\/gridprims\.com\/\.well-known\/security\.txt$/m);
});

test('the expiry is eleven months after the build\'s date, and a broken generator fails the guard', () => {
  assert.equal(elevenMonthsAfter('2026-10-31T03:00:00Z'), '2027-09-28T00:00:00Z');
  assert.match(securityTxt('2026-01-15T00:00:00Z'), /Expires: 2026-12-15T00:00:00Z/);
  assert.match(checkSecurityTxt(securityTxt('2020-01-01T00:00:00Z')).join(), /generated an expiry in the past/);
});

test('the Worker serves it as plain UTF-8 text with the security headers', async () => {
  const ASSETS = { fetch: async () => new Response(txt, { headers: { 'content-type': 'application/octet-stream' } }) };
  const res = await worker.fetch(new Request('https://gridprims.com/.well-known/security.txt'), { ASSETS });
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
});

test('the policy states scope, the out-of-scope route, safe harbor, the rules, and the 5-day and 90-day targets', () => {
  const html = readFileSync(join(out, 'security/index.html'), 'utf8');
  assert.match(html, /report it through that agency’s disclosure channel; we cannot act on it/);
  assert.match(html, /We will not pursue anyone who researches in good faith/);
  assert.match(html, /do not use other people’s data, slow the site down, or try to take it offline/);
  assert.match(html, /within 5 business days.*within 90 days/s);
  assert.match(html, /not legal advice/);
});

test('a security fix appears in the changelog with the reporter credited only by name', () => {
  const html = String(changelogPage({ entries: [{ date: '2026-11-02', toolId: null, version: '', kind: 'security', reason: 'The report form now rejects oversized attachments earlier.', credit: 'A. Researcher' }], i18n: createI18n(strings, 'en-US') }));
  assert.match(html, /Security fix\. The report form now rejects oversized attachments earlier\. Reported by A\. Researcher\./);
  assert.doesNotMatch(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ''), /@/, 'no address appears; JSON-LD keys such as @type are not addresses');
});
