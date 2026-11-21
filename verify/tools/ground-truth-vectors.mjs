// Cuts the bill test vector release from the regulator ground truth (add-tariff-conformance-suite 2.3): every
// vector pipeline/lib/ground-truth-vectors.mjs builds from an itemized document goes to
// data/curated/conformance/vectors, one per file, and the release's coverage and untestable schedules to
// data/curated/conformance/release.json. With a directory argument it also writes each distinct tariff as
// URPX JSON-LD there, for verify/tools/urpx-shacl.py:
//   node verify/tools/ground-truth-vectors.mjs [/tmp/vector-urpx]
//   python -I verify/tools/urpx-shacl.py /tmp/urpx /tmp/vector-urpx > verify/reference/urpx/vector-shacl-results.json
// Then cut a release (pipeline/lib/vector-releases.mjs): the committed vectors, coverage, format documentation,
// and limits frozen in one file, with its changelog entry:
//   node verify/tools/ground-truth-vectors.mjs --cut 2026.11.0 2026-11-21 "What changed"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIMITS, loadGroundTruth } from '../../site/entities/ground-truth.mjs';
import { RELEASES_DIR, changelog, changelogEntry, committedVectors, releaseBundle, releaseBytes, releaseFile } from '../../pipeline/lib/vector-releases.mjs';
import { releaseCoverage, vectorsFrom } from '../../pipeline/lib/ground-truth-vectors.mjs';
import { ROOT } from '../../pipeline/run.mjs';

/** The release as the committed files hold it. */
export function buildRelease(root = ROOT) {
  const built = loadGroundTruth(root).map(vectorsFrom);
  const vectors = built.flatMap((b) => b.vectors);
  const untestable = built.flatMap((b) => b.untestable);
  return { vectors, release: { license: 'CC BY 4.0', format: 'https://github.com/clay-good/gridprims/blob/main/docs/formats/bill-test-vector.md', coverage: releaseCoverage(vectors, untestable), vectors: vectors.map((v) => v.id), untestable } };
}

/** Freeze the committed vectors as a new release and add it to the changelog. */
function cut(version, date, summary) {
  const log = changelog(ROOT);
  if (log.some((e) => e.version === version)) throw new Error(`${version} is already cut; a release is frozen`);
  const release = JSON.parse(readFileSync(join(ROOT, 'data/curated/conformance/release.json'), 'utf8'));
  const format = readFileSync(join(ROOT, 'docs/formats/bill-test-vector.md'), 'utf8');
  const bundle = releaseBundle({ version, date, summary, vectors: committedVectors(ROOT), release, format, limits: LIMITS });
  mkdirSync(join(ROOT, RELEASES_DIR), { recursive: true });
  writeFileSync(join(ROOT, RELEASES_DIR, releaseFile(version)), releaseBytes(bundle));
  writeFileSync(join(ROOT, RELEASES_DIR, 'changelog.json'), JSON.stringify([...log, changelogEntry(bundle)], null, 2) + '\n');
  console.error(`cut ${version}: ${bundle.vectors.length} vectors`);
}

if (process.argv[1] === new URL(import.meta.url).pathname && process.argv[2] === '--cut') cut(...process.argv.slice(3, 6));
else if (process.argv[1] === new URL(import.meta.url).pathname) {
  const { vectors, release } = buildRelease();
  const dir = join(ROOT, 'data/curated/conformance/vectors');
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) rmSync(join(dir, f));
  for (const v of vectors) writeFileSync(join(dir, `${v.id}.json`), JSON.stringify(v, null, 2) + '\n');
  writeFileSync(join(ROOT, 'data/curated/conformance/release.json'), JSON.stringify(release, null, 2) + '\n');
  if (process.argv[2]) {
    mkdirSync(process.argv[2], { recursive: true });
    const docs = new Map(vectors.map((v) => [v.tariff.document['@graph'][0]['urpx:hasRatePlan']['urpx:ratePlanUniqueIdentifier'], v.tariff.document]));
    for (const [id, doc] of docs) writeFileSync(join(process.argv[2], `${id}.jsonld`), JSON.stringify(doc, null, 2) + '\n');
  }
  console.error(`${vectors.length} vectors, ${release.untestable.length} untestable schedules`);
}
