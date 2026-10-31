// Record a successful run of a workflow that does nothing else the record
// tracks (the canary), so its row shows when it last passed.
//   node pipeline/record-run.mjs canary

import { recordRun } from './lib/health.mjs';
import { ROOT } from './run.mjs';

const now = new Date().toISOString();
recordRun(ROOT, { workflow: process.argv[2], started: now, finished: now, ok: true });
console.log(`recorded ${process.argv[2]} at ${now}`);
