// Every tool, as {manifest, impl}. Both surfaces import this one list; the
// manifests gate fails when a folder in core/tools/ is missing from it.

import energyUnitsConvert from './calc.energy-units.convert/manifest.mjs';
import * as energyUnitsConvertImpl from './calc.energy-units.convert/tool.mjs';
import energyUnitsEmissions from './calc.energy-units.emissions/manifest.mjs';
import * as energyUnitsEmissionsImpl from './calc.energy-units.emissions/tool.mjs';
import powerFactorCorrect from './calc.power-factor.correct/manifest.mjs';
import * as powerFactorCorrectImpl from './calc.power-factor.correct/tool.mjs';
import transformerSize from './calc.transformer.size/manifest.mjs';
import * as transformerSizeImpl from './calc.transformer.size/tool.mjs';
import storageBasics from './calc.storage.basics/manifest.mjs';
import * as storageBasicsImpl from './calc.storage.basics/tool.mjs';
import costLcoe from './calc.cost.lcoe/manifest.mjs';
import * as costLcoeImpl from './calc.cost.lcoe/tool.mjs';
import lineAmpacity from './calc.line-rating.ampacity/manifest.mjs';
import * as lineAmpacityImpl from './calc.line-rating.ampacity/tool.mjs';
import revenueRequirement from './ratepayer.revenue-requirement.explain/manifest.mjs';
import * as revenueRequirementImpl from './ratepayer.revenue-requirement.explain/tool.mjs';
import serviceHeadroom from './electrify.service-headroom.check/manifest.mjs';
import * as serviceHeadroomImpl from './electrify.service-headroom.check/tool.mjs';
import billTotalsCheck from './household.bill-totals.check/manifest.mjs';
import * as billTotalsCheckImpl from './household.bill-totals.check/tool.mjs';
import usageBenchmark from './household.usage-benchmark.compare/manifest.mjs';
import * as usageBenchmarkImpl from './household.usage-benchmark.compare/tool.mjs';

export const TOOLS = [
  { manifest: energyUnitsConvert, impl: energyUnitsConvertImpl },
  { manifest: energyUnitsEmissions, impl: energyUnitsEmissionsImpl },
  { manifest: powerFactorCorrect, impl: powerFactorCorrectImpl },
  { manifest: transformerSize, impl: transformerSizeImpl },
  { manifest: storageBasics, impl: storageBasicsImpl },
  { manifest: costLcoe, impl: costLcoeImpl },
  { manifest: lineAmpacity, impl: lineAmpacityImpl },
  { manifest: revenueRequirement, impl: revenueRequirementImpl },
  { manifest: serviceHeadroom, impl: serviceHeadroomImpl },
  { manifest: billTotalsCheck, impl: billTotalsCheckImpl },
  { manifest: usageBenchmark, impl: usageBenchmarkImpl },
];

/** @param {string} id */
export function getTool(id) {
  return TOOLS.find((t) => t.manifest.id === id);
}
