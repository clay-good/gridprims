// The result-sentence gate (platform/tool-contract, "Results are plain
// sentences with units"): every worked example's sentence reads at grade 8
// or below on our own Flesch-Kincaid check.

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runTool } from '../../core/contract/run.mjs';
import { fleschKincaid } from '../../core/lib/readability.mjs';

export const MAX_GRADE = 8;

/** @param {string} root */
export async function checkSentences(root) {
  const { TOOLS } = await import(pathToFileURL(join(root, 'core/tools/index.mjs')).href);
  const errors = [];
  for (const { manifest, impl } of TOOLS) {
    for (const ex of manifest.examples) {
      const r = runTool(manifest, impl, ex.inputs);
      if (r.status !== 'ok') continue;
      const g = fleschKincaid(r.sentence).grade;
      if (g > MAX_GRADE) errors.push(`${manifest.id} example ${ex.id}: "${r.sentence}" reads at grade ${g.toFixed(1)}, above ${MAX_GRADE}`);
    }
  }
  return errors;
}
