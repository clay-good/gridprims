// Every tool, as {manifest, impl}. Both surfaces import this one list; the
// manifests gate fails when a folder in core/tools/ is missing from it.

import energyUnitsConvert from './calc.energy-units.convert/manifest.mjs';
import * as energyUnitsConvertImpl from './calc.energy-units.convert/tool.mjs';
import billTotalsCheck from './household.bill-totals.check/manifest.mjs';
import * as billTotalsCheckImpl from './household.bill-totals.check/tool.mjs';
import usageBenchmark from './household.usage-benchmark.compare/manifest.mjs';
import * as usageBenchmarkImpl from './household.usage-benchmark.compare/tool.mjs';

export const TOOLS = [
  { manifest: energyUnitsConvert, impl: energyUnitsConvertImpl },
  { manifest: billTotalsCheck, impl: billTotalsCheckImpl },
  { manifest: usageBenchmark, impl: usageBenchmarkImpl },
];

/** @param {string} id */
export function getTool(id) {
  return TOOLS.find((t) => t.manifest.id === id);
}
