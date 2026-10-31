// Stored third-party reference outputs (platform/citations-and-verification,
// "Reference outputs are stored, not installed"): a reference file names its
// source, the rows as the source prints them, and vectors that run a tool and
// must agree to every figure the source prints.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A printed number such as "1.055 056 E+03" as a value and its significant figures. */
export function readPrinted(text) {
  const t = text.replace(/\s+/g, '').replace(/E/i, 'e');
  const mantissa = t.split('e')[0].replace(/^[-+]/, '').replace('.', '').replace(/^0+/, '');
  return { value: Number(t), sigFigs: mantissa.length };
}

/**
 * @param {{manifest: any, impl: any}} tool
 * @param {string} root repository root
 * @returns {string[]} failures naming the tool, vector, expected, actual, and tolerance
 */
export function runReferenceVectors({ manifest, impl }, root) {
  const failures = [];
  for (const e of manifest.validation.evidence.filter((x) => (x.kind === 'reference-output' || x.kind === 'published-example') && x.path)) {
    const ref = JSON.parse(readFileSync(join(root, e.path), 'utf8'));
    for (const v of ref.vectors ?? []) {
      const { value: expected, sigFigs } = readPrinted(ref.rows[v.row].printed);
      const r = impl.compute(v.inputs);
      const actual = r.outputs.value;
      // Agreement to every figure printed: within half a unit in the last printed place.
      const tolerance = 0.5 * 10 ** (Math.floor(Math.log10(Math.abs(expected))) - sigFigs + 1);
      if (!(Math.abs(actual - expected) <= tolerance)) failures.push(`${manifest.id} reference ${v.id} (${ref.source.split(',')[0]}): expected ${expected}, got ${actual}, tolerance ±${tolerance}`);
    }
  }
  return failures;
}
