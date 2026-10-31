// Builds the site once for `npm test` and prints its folder, which the test
// script passes to the tests as GRIDPRIMS_DIST (verify/lib/shared-site.mjs).
// The folder is fixed and rebuilt from empty each run, so at most one copy is
// left in the temp directory between runs.

import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../site/build.mjs';

const out = join(tmpdir(), 'gridprims-test-dist');
rmSync(out, { recursive: true, force: true });
await build({ outDir: out });
console.log(out);
