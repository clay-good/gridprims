// Assert the runtime meets the Node floor before any work (platform/automation,
// "The runner is pinned and the runtime is asserted"; foundation design D2).
import { readFileSync } from 'node:fs';

const floor = readFileSync(new URL('../.node-version', import.meta.url), 'utf8').trim();
const [a, b, c] = process.versions.node.split('.').map(Number);
const [x, y, z] = floor.split('.').map(Number);
if (a < x || (a === x && (b < y || (b === y && c < z)))) {
  console.error(`Node ${process.versions.node} is below the project floor ${floor}. The runner image may have changed.`);
  process.exit(1);
}
console.log(`Node ${process.versions.node} meets the floor ${floor}.`);
