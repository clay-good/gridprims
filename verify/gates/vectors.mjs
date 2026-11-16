// The bill engine is gated on the bill test vectors (add-tariff-conformance-suite 2.5): every vector in
// data/curated/conformance/vectors must pass the vector check, and our engine must reproduce it within its
// tolerance, unless data/curated/conformance/findings.json records that the vector itself is wrong.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkVector } from '../../pipeline/lib/bill-vectors.mjs';
import { gateVectors } from '../../pipeline/lib/run-vectors.mjs';

/** @param {string} root */
export function checkVectors(root) {
  const dir = join(root, 'data/curated/conformance/vectors');
  if (!existsSync(dir)) return [];
  const vectors = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => ({ f, v: JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
  const problems = vectors.flatMap(({ f, v }) => checkVector(v).map((p) => `${f}: ${p}`));
  if (problems.length) return problems;
  const file = join(root, 'data/curated/conformance/findings.json');
  const findings = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  return gateVectors(vectors.map((x) => x.v), findings);
}
