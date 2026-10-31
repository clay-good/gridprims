// Repository size (platform/automation, "Repository size stays inside the
// host's guidance"): no committed file over 25 MiB, packed size under 1 GB.

import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';

export const MAX_FILE = 25 * 1024 * 1024;
export const MAX_PACKED = 1024 ** 3;

/** @param {string} root @param {{maxFile?: number, maxPacked?: number}} [o] */
export function checkRepoSize(root, o = {}) {
  const maxFile = o.maxFile ?? MAX_FILE;
  const maxPacked = o.maxPacked ?? MAX_PACKED;
  let files;
  try { files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean); } catch { return []; }
  const sizes = files.map((f) => { try { return [f, statSync(join(root, f)).size]; } catch { return [f, 0]; } });
  const errors = sizes.filter(([, n]) => n > maxFile).map(([f, n]) => `${f} is ${n.toLocaleString('en-US')} bytes, over ${maxFile.toLocaleString('en-US')}; publish it as a release asset instead`);
  const out = execFileSync('git', ['count-objects', '-v'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const kib = (k) => Number(new RegExp(`^${k}: (\\d+)`, 'm').exec(out)?.[1] ?? 0);
  const packed = (kib('size-pack') + kib('size')) * 1024;
  if (packed > maxPacked) {
    const largest = sizes.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, n]) => `${f} (${n.toLocaleString('en-US')} bytes)`).join(', ');
    errors.push(`the repository packs to ${packed.toLocaleString('en-US')} bytes, over ${maxPacked.toLocaleString('en-US')}; largest: ${largest}`);
  }
  return errors;
}
