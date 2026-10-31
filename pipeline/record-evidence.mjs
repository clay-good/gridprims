// After the gates pass, record when each tool's evidence last passed in CI,
// so the limits page can date it and flag evidence older than 90 days.
//   node pipeline/record-evidence.mjs

import { writeFileSync } from 'node:fs';
import { TOOLS } from '../core/tools/index.mjs';
import { healthPath, readHealth } from './lib/health.mjs';
import { ROOT } from './run.mjs';

const h = readHealth(ROOT);
const now = new Date().toISOString();
h.tools = TOOLS.map(({ manifest }) => ({ id: manifest.id, version: manifest.version, evidencePassed: now }));
writeFileSync(healthPath(ROOT), JSON.stringify(h, null, 2) + '\n');
console.log(`recorded evidence passing for ${h.tools.length} tools at ${now}`);
