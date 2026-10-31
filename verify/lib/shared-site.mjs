// One built site shared by every test that only reads it. `npm test` builds it
// once (verify/prebuild.mjs) and passes its folder in GRIDPRIMS_DIST; a test
// file run on its own builds its own. Tests that write into the built site, or
// build with other options, keep their own build.

import { build } from '../../site/build.mjs';
import { tempDir } from './temp.mjs';

/** @returns {Promise<string>} the folder of a site built with the default options */
export async function sharedSite() {
  if (process.env.GRIDPRIMS_DIST) return process.env.GRIDPRIMS_DIST;
  const out = tempDir('gridprims-dist-');
  await build({ outDir: out });
  return out;
}
