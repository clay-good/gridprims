// Run every repository gate against the working tree (docs/decisions-day-one.md §5).
// Exits non-zero and prints each failure when any gate fails.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkDependencies } from './gates/dependency.mjs';
import { checkPlatformApis } from './gates/platform-apis.mjs';
import { checkOwnImplementations } from './gates/own-implementations.mjs';
import { checkFileCount } from './gates/file-count.mjs';
import { checkManifests } from './gates/manifests.mjs';
import { checkStyle } from './gates/style.mjs';
import { checkCopy } from './gates/copy.mjs';
import { checkVersions } from './gates/versions.mjs';
import { checkClaims } from './gates/claims.mjs';
import { checkSentences } from './gates/sentences.mjs';
import { checkRegistry } from './gates/registry.mjs';
import { checkWorkflows } from './gates/workflows.mjs';
import { checkRepoSize } from './gates/repo-size.mjs';
import { checkSecrets } from './gates/secrets.mjs';
import { checkSiteUrls } from './gates/urls.mjs';
import { checkCurated } from './gates/curated.mjs';
import { checkGlossary } from './gates/glossary.mjs';
import { checkCeii } from './gates/ceii.mjs';
import { checkIndexSize } from './gates/index-size.mjs';
import { checkProgramLinks } from './gates/program-links.mjs';
import { checkDataGuides } from './gates/data-guides.mjs';
import { checkExplainers } from './gates/explainers.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const gates = [
  ['dependency', () => checkDependencies(root)],
  ['platform APIs', () => checkPlatformApis(root)],
  ['own implementations', () => checkOwnImplementations(root)],
  ['deployable file count', () => checkFileCount(join(root, 'dist'))],
  ['manifests and worked examples', () => checkManifests(root)],
  ['no CEII fields in the queue JSON', () => checkCeii(join(root, 'dist'))],
  ['command index within its size budget', () => checkIndexSize(join(root, 'dist'))],
  ['program links carry their facts, no tracking, and every handoff', () => checkProgramLinks(root)],
  ['data guides carry a level, date, and source, no personal data, and fixtures for every format', () => checkDataGuides(root)],
  ['explainers: short summaries, short sections, and every number generated or cited', () => checkExplainers(root)],
  ['style tokens and contrast', () => checkStyle(root)],
  ['no literal copy in templates', () => checkCopy(root)],
  ['result versions and changelog', () => checkVersions(root, { record: Boolean(process.env.GRIDPRIMS_RECORD) })],
  ['no unproven claims', () => checkClaims(root)],
  ['result sentences at grade 8 or below', () => checkSentences(root)],
  ['dataset registry and snapshots', () => checkRegistry(root)],
  ['CI uses only our scripts and pinned first-party actions', () => checkWorkflows(root)],
  ['repository size', () => checkRepoSize(root)],
  ['no secrets in outputs or tracked files', () => checkSecrets(root)],
  ['curated facts have primary, archived sources', () => checkCurated(root)],
  ['glossary entries are cited, short, and readable, and cover every tool', () => checkGlossary(root)],
  ['published URLs resolve or redirect', () => checkSiteUrls(root, { record: Boolean(process.env.GRIDPRIMS_RECORD) })],
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
