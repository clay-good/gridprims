// The machine-readable limits record (site/limitations, "Machine-readable"):
// every tool's stability, validation level, evidence, and known limits, from
// the manifests. The website's limits page and the MCP resource both use it.

import { VALIDATION_LEVELS } from './manifest.mjs';

/**
 * @param {Array<{manifest: any}>} tools
 */
export function limitsRecord(tools) {
  return {
    levels: VALIDATION_LEVELS,
    tools: tools.map(({ manifest: m }) => ({
      id: m.id,
      title: m.title,
      version: m.version,
      stability: m.stability,
      validationLevel: m.validation.level,
      validationName: VALIDATION_LEVELS[m.validation.level].name,
      evidence: m.validation.evidence.map(({ kind, summary }) => ({ kind, summary })),
      limitations: m.limitations,
    })),
    cannotDo: [],
  };
}
