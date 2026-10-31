// Every tool, as {manifest, impl}. Both surfaces import this one list; the
// manifests gate fails when a folder in core/tools/ is missing from it.

import energyUnitsConvert from './calc.energy-units.convert/manifest.mjs';
import * as energyUnitsConvertImpl from './calc.energy-units.convert/tool.mjs';

export const TOOLS = [
  { manifest: energyUnitsConvert, impl: energyUnitsConvertImpl },
];

/** @param {string} id */
export function getTool(id) {
  return TOOLS.find((t) => t.manifest.id === id);
}
