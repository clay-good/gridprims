// Versioned releases of the bill test vectors (add-tariff-conformance-suite 2.4): each release is one file,
// frozen when it is cut, holding the vectors, the format documentation, the coverage, the limits, and the
// license, so a developer downloads everything at one stable address with no account. The changelog records
// each release's date, what changed, and the file's SHA-256; a release never changes after it is cut, and the
// vectors never change without a new release.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export const RELEASES_DIR = 'data/curated/conformance/releases';
export const VECTORS_DIR = 'data/curated/conformance/vectors';
const VERSION = /^\d{4}\.\d{1,2}\.\d+$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const sha = (text) => createHash('sha256').update(text).digest('hex');
const order = (v) => v.split('.').map(Number);
const newer = (a, b) => { const x = order(a); const y = order(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

/** The vectors as committed, in file order. */
export function committedVectors(root) {
  const dir = join(root, VECTORS_DIR);
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))) : [];
}

/** The changelog, oldest first. @returns {Array<{version: string, date: string, summary: string, sha256: string}>} */
export function changelog(root) {
  const file = join(root, RELEASES_DIR, 'changelog.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
}

/** The file a release is served and stored as. */
export const releaseFile = (version) => `bill-test-vectors-${version}.json`;

/**
 * One release's contents: everything a developer of another engine needs, in one file.
 * @param {{version: string, date: string, summary: string, vectors: any[], release: any, format: string, limits: string}} p
 */
export function releaseBundle({ version, date, summary, vectors, release, format, limits }) {
  return {
    name: 'gridprims bill test vectors', version, date, summary,
    license: 'CC BY 4.0', credit: 'Expected bills are the state commissions\' own, each cited to its document and page; credit the commission and gridprims.',
    limits, coverage: release.coverage, untestable: release.untestable, formatDocumentation: format, vectors,
  };
}

/** The bytes a release is stored as. */
export const releaseBytes = (bundle) => JSON.stringify(bundle, null, 2) + '\n';

/**
 * The release rules: each changelog entry has its file, unchanged since it was cut; versions rise with dates;
 * and the latest release holds exactly the committed vectors and coverage.
 * @returns {string[]} problems, empty when the releases are in order
 */
export function checkReleases(root) {
  const problems = [];
  const log = changelog(root);
  const vectors = committedVectors(root);
  if (!log.length) return vectors.length ? ['vectors are committed but no release has been cut: run node verify/tools/ground-truth-vectors.mjs --cut <version> <date> "<what changed>"'] : [];
  log.forEach((e, i) => {
    if (!VERSION.test(e.version ?? '')) problems.push(`${e.version}: a version is year.month.patch, such as 2026.11.0`);
    if (!ISO.test(e.date ?? '')) problems.push(`${e.version}: date is not a date`);
    if (!e.summary) problems.push(`${e.version}: the changelog says nothing about what changed`);
    const prev = log[i - 1];
    if (prev && !(newer(e.version, prev.version) && e.date >= prev.date)) problems.push(`${e.version}: does not follow ${prev.version}`);
    const file = join(root, RELEASES_DIR, releaseFile(e.version));
    if (!existsSync(file)) return problems.push(`${e.version}: ${releaseFile(e.version)} is missing`);
    if (sha(readFileSync(file)) !== e.sha256) problems.push(`${e.version}: ${releaseFile(e.version)} changed after it was cut; a release is frozen, so cut a new one instead`);
  });
  const latest = log.at(-1);
  const file = join(root, RELEASES_DIR, releaseFile(latest.version));
  if (existsSync(file)) {
    const bundle = JSON.parse(readFileSync(file, 'utf8'));
    const sorted = (xs) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
    if (!isDeepStrictEqual(sorted(bundle.vectors), sorted(vectors))) problems.push(`the vectors changed since ${latest.version}; cut a new release with node verify/tools/ground-truth-vectors.mjs --cut <version> <date> "<what changed>"`);
    const current = join(root, 'data/curated/conformance/release.json');
    if (existsSync(current) && !isDeepStrictEqual(bundle.coverage, JSON.parse(readFileSync(current, 'utf8')).coverage)) problems.push(`the coverage changed since ${latest.version}; cut a new release`);
  }
  return problems;
}

/** The changelog entry for a bundle about to be cut. */
export const changelogEntry = (bundle) => ({ version: bundle.version, date: bundle.date, summary: bundle.summary, vectors: bundle.vectors.length, sha256: sha(releaseBytes(bundle)) });
