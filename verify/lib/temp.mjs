// Temporary folders for tests, removed when the test process exits. A built
// site is about 300 MB, and CI runs dozens of builds; left behind, they fill
// the runner's disk.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const made = [];
process.on('exit', () => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

/** @param {string} prefix such as "gridprims-dist-" */
export function tempDir(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix));
  made.push(d);
  return d;
}
