// Run every repository gate against the working tree (docs/decisions-day-one.md §5).
// Exits non-zero and prints each failure when any gate fails.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkDependencies } from './gates/dependency.mjs';
import { checkPlatformApis } from './gates/platform-apis.mjs';
import { checkOwnImplementations } from './gates/own-implementations.mjs';
import { checkFileCount } from './gates/file-count.mjs';
import { checkManifests } from './gates/manifests.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const gates = [
  ['dependency', () => checkDependencies(root)],
  ['platform APIs', () => checkPlatformApis(root)],
  ['own implementations', () => checkOwnImplementations(root)],
  ['deployable file count', () => checkFileCount(join(root, 'dist'))],
  ['manifests and worked examples', () => checkManifests(root)],
];

let failed = 0;
for (const [name, run] of gates) {
  const errors = await run();
  if (errors.length) {
    failed++;
    console.error(`FAIL ${name}`);
    for (const e of errors) console.error(`  ${e}`);
  } else console.log(`ok   ${name}`);
}
process.exitCode = failed ? 1 : 0;
