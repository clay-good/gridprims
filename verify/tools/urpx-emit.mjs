// Writes each case in verify/fixtures/urpx/cases.mjs as URPX JSON-LD, one file per case, for
// verify/tools/urpx-shacl.py to check. The bytes are the ones verify/tests/core/urpx.test.mjs hashes.
//   node verify/tools/urpx-emit.mjs /tmp/urpx-out
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toUrpx } from '../../core/lib/urpx.mjs';
import { URPX_CASES } from '../fixtures/urpx/cases.mjs';

/** The bytes a case is written as. */
export const caseBytes = ({ tariff, meta, opts }) => JSON.stringify(toUrpx(tariff, meta, opts).document, null, 2) + '\n';

if (process.argv[2]) {
  mkdirSync(process.argv[2], { recursive: true });
  for (const [name, c] of Object.entries(URPX_CASES)) writeFileSync(join(process.argv[2], `${name}.jsonld`), caseBytes(c));
}
