// Cuts the bill test vector release from the regulator ground truth (add-tariff-conformance-suite 2.3): every
// vector pipeline/lib/ground-truth-vectors.mjs builds from an itemized document goes to
// data/curated/conformance/vectors, one per file, and the release's coverage and untestable schedules to
// data/curated/conformance/release.json. With a directory argument it also writes each distinct tariff as
// URPX JSON-LD there, for verify/tools/urpx-shacl.py:
//   node verify/tools/ground-truth-vectors.mjs [/tmp/vector-urpx]
//   python -I verify/tools/urpx-shacl.py /tmp/urpx /tmp/vector-urpx > verify/reference/urpx/vector-shacl-results.json
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadGroundTruth } from '../../site/entities/ground-truth.mjs';
import { releaseCoverage, vectorsFrom } from '../../pipeline/lib/ground-truth-vectors.mjs';
import { ROOT } from '../../pipeline/run.mjs';

/** The release as the committed files hold it. */
export function buildRelease(root = ROOT) {
  const built = loadGroundTruth(root).map(vectorsFrom);
  const vectors = built.flatMap((b) => b.vectors);
  const untestable = built.flatMap((b) => b.untestable);
  return { vectors, release: { license: 'CC BY 4.0', format: 'https://github.com/clay-good/gridprims/blob/main/docs/formats/bill-test-vector.md', coverage: releaseCoverage(vectors, untestable), vectors: vectors.map((v) => v.id), untestable } };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
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
