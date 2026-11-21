// The scorecard's published files (add-tariff-conformance-suite 3.5, "Reproducible by anyone"): the method,
// the database version and its checksum, the ground-truth documents and the vector release with theirs, the
// exact rate list, and the results, so a third party can rerun it and get the same numbers.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GROUND_TRUTH_DIR, loadGroundTruth } from '../../site/entities/ground-truth.mjs';
import PUBLICATIONS from '../../data/curated/conformance-publications.mjs';
import CROSSWALK, { CHECKED as CROSSWALK_CHECKED } from '../../data/curated/conformance/urdb-crosswalk.mjs';
import { RELEASES_DIR, changelog, releaseFile } from './vector-releases.mjs';
import { readShard } from '../../core/lib/shard.mjs';
import { runVector } from '../../core/lib/run-vector.mjs';
import { engineRow, scorecard } from './scorecard.mjs';

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const quote = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csv = (head, rows) => [head.join(','), ...rows.map((r) => r.map(quote).join(','))].join('\n') + '\n';

export const METHOD = [
  'Each schedule a state commission prices is matched to one URDB record through data/curated/conformance/urdb-crosswalk.mjs, which says why, or why the schedule cannot be matched.',
  'The record is read as URDB holds it: the fixed charge, the energy tiers with each tier\'s adjustment added to its rate, and the period its weekday schedule gives for the billing month; a record that changes by hour, or has demand charges, is not priced.',
  'The bill is priced for the commission\'s billing month at each consumption level the commission publishes, each line rounded half up to the cent and summed.',
  'Two bills agree when they differ by no more than 0.5% of the commission\'s bill or $1.00, whichever is larger.',
  'Our engine is measured the same way on the bill test vectors: each schedule as the commission itemizes it, against the commission\'s bill.',
];

/** Versions and checksums of every input. */
export function versions(root, urdbVersion) {
  const manifest = JSON.parse(readFileSync(join(root, 'data/urdb', urdbVersion, 'manifest.json'), 'utf8'));
  const snapshot = join(root, 'data/urdb', urdbVersion, 'rates.csv.gz');
  const log = changelog(root);
  return {
    urdb: { version: urdbVersion, asOf: manifest.asOf, bulk: manifest.raw?.[0] ?? null, snapshot: { file: 'rates.csv.gz', sha256: existsSync(snapshot) ? sha(readFileSync(snapshot)) : null } },
    groundTruth: PUBLICATIONS.filter((p) => p.status === 'used').map((p) => ({ state: p.state, file: p.file, sha256: sha(readFileSync(join(root, GROUND_TRUTH_DIR, p.file))) })),
    vectors: log.length ? { version: log.at(-1).version, file: releaseFile(log.at(-1).version), sha256: sha(readFileSync(join(root, RELEASES_DIR, releaseFile(log.at(-1).version)))) } : null,
    crosswalk: { checked: CROSSWALK_CHECKED },
  };
}

/** The exact rate list: each URDB record, the month, and the levels it is priced at. */
export const rateList = (card) => card.entries.map((e) => ({ label: e.urdb.label, state: e.state, utility: e.utility, schedule: e.schedule, month: e.month, kwh: e.levels.map((l) => l.kwh) }));

/** One row per compared bill. */
export const resultsCsv = (card) => csv(
  ['state', 'utility', 'schedule', 'urdb_label', 'urdb_effective', 'month', 'kwh', 'commission_usd', 'urdb_usd', 'difference_usd', 'difference_percent', 'within_margin', 'wording'],
  card.entries.flatMap((e) => e.levels.map((l) => [e.state, e.utility, e.schedule, e.urdb.label, e.urdb.effective, e.month, l.kwh, l.commission.toFixed(2), l.database.toFixed(2), l.difference.toFixed(2), l.percent.toFixed(1), l.agree, e.wording.kind])));

/** The rate list as CSV, with the untestable schedules and why. */
export const ratesCsv = (card) => csv(['state', 'utility', 'schedule', 'urdb_label', 'month', 'levels_kwh', 'untestable_why'],
  [...rateList(card).map((r) => [r.state, r.utility, r.schedule, r.label, r.month, r.kwh.join(' '), '']), ...card.untestable.map((u) => [u.state, u.utility, u.schedule, '', '', '', u.why])]);

/**
 * The scorecard from the committed inputs: the ground truth, the crosswalk, the URDB snapshot the repository
 * serves, any maintainers' findings, and the latest vector release for our engine's row.
 */
export function loadScorecard(root) {
  const urdbVersion = JSON.parse(readFileSync(join(root, 'data/urdb/current.json'), 'utf8')).version;
  const states = [...new Set(CROSSWALK.map((c) => c.state))];
  const records = new Map(states.flatMap((st) => readShard(readFileSync(join(root, 'data/urdb', urdbVersion, 'rates', `${st}.bin`))).rows()).map((r) => [r.label, r]));
  const findings = JSON.parse(readFileSync(join(root, 'data/curated/conformance/scorecard-findings.json'), 'utf8'));
  const card = scorecard(loadGroundTruth(root), CROSSWALK, records, findings);
  const log = changelog(root);
  const release = log.length ? JSON.parse(readFileSync(join(root, RELEASES_DIR, releaseFile(log.at(-1).version)), 'utf8')) : { vectors: [], untestable: [] };
  return { card, engine: engineRow(release.vectors, runVector, release.untestable), versions: versions(root, urdbVersion) };
}

/** The scorecard JSON as published. */
export const scorecardJson = ({ card, engine, versions: v }, limits) => ({
  license: 'CC BY 4.0', limits, method: METHOD, versions: v, margin: 'within 0.5% of the published bill or $1.00, whichever is larger',
  rates: rateList(card), counts: card.counts, engine, entries: card.entries, untestable: card.untestable,
});
