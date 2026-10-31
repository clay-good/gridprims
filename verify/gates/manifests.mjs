// The manifests gate (platform/tool-contract): every folder in core/tools/ is a
// registered tool whose manifest validates, whose claimed validation level its
// committed evidence supports, and whose worked examples pass.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateManifest } from '../../core/contract/manifest.mjs';
import { runExamples } from '../lib/examples.mjs';

/**
 * @param {string} root
 * @returns {Promise<string[]>} errors
 */
export async function checkManifests(root) {
  const errors = [];
  const toolsDir = join(root, 'core/tools');
  const { TOOLS } = await import(pathToFileURL(join(toolsDir, 'index.mjs')).href);
  const ids = new Set(TOOLS.map((t) => t.manifest?.id));
  for (const ent of readdirSync(toolsDir, { withFileTypes: true })) {
    if (ent.isDirectory() && !ids.has(ent.name)) errors.push(`core/tools/${ent.name}: folder is not registered in core/tools/index.mjs, or its id differs from the folder name`);
  }
  const fileExists = (p) => existsSync(join(root, p));
  for (const tool of TOOLS) {
    const found = validateManifest(tool.manifest, { fileExists });
    errors.push(...found);
    if (found.length === 0) errors.push(...runExamples(tool));
  }
  return errors;
}
