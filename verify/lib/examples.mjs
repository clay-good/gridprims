// The golden-vector runner (platform/citations-and-verification): run every
// worked example in a manifest and compare each output within its tolerance.

import { checkInputs, runTool } from '../../core/contract/run.mjs';

/**
 * @param {{manifest: any, impl: any}} tool
 * @returns {string[]} failures naming the tool, example, expected, actual, and tolerance
 */
export function runExamples({ manifest, impl }) {
  const failures = [];
  for (const ex of manifest.examples) {
    const r = runTool(manifest, impl, ex.inputs);
    if (r.status !== 'ok') {
      failures.push(`${manifest.id} example ${ex.id}: returned ${r.status} (${JSON.stringify(r.errors ?? r.reason)})`);
      continue;
    }
    // Tolerances apply to the unrounded value; the display is checked separately.
    const unrounded = impl.compute(checkInputs(manifest, ex.inputs).values).outputs;
    for (const [name, want] of Object.entries(ex.expect)) {
      const got = r.outputs[name];
      const raw = unrounded[name];
      const tol = want.tolerance.abs ?? Math.abs(want.value) * want.tolerance.rel;
      const tolText = want.tolerance.abs !== undefined ? `±${want.tolerance.abs}` : `±${want.tolerance.rel * 100}%`;
      if (!(Math.abs(raw - want.value) <= tol)) {
        failures.push(`${manifest.id} example ${ex.id}: ${name} expected ${want.value}, got ${raw}, tolerance ${tolText}`);
      }
      if (want.display !== undefined && got?.display !== want.display) {
        failures.push(`${manifest.id} example ${ex.id}: ${name} displays "${got?.display}", expected "${want.display}"`);
      }
    }
  }
  return failures;
}
