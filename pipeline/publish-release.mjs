// Publish the release files for a tag as GitHub release assets.
//   node pipeline/publish-release.mjs <tag> <dir>

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { github } from './lib/github.mjs';

const [tag, dir] = process.argv.slice(2);
const host = github();
for (const name of readdirSync(dir)) {
  const type = name.endsWith('.zip') ? 'application/zip' : name.endsWith('.json') ? 'application/json' : 'text/plain';
  const url = await host.publishRawAsset({ tag, name, bytes: readFileSync(join(dir, name)), contentType: type });
  console.log(`${name} → ${url}`);
}
