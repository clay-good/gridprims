// The launch allowlist (agent/mcp-server, "File access limited by a launch
// allowlist"; design D2): a path is readable only when, after resolving
// symlinks, it is an allowed folder or inside one. Nothing is read here.

import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, resolve, sep } from 'node:path';

export const MAX_FILE_BYTES = 200_000_000;

/**
 * Resolve each --allow-dir to its real path once, at launch.
 * @param {string[]} dirs
 */
export function realAllowDirs(dirs) {
  return dirs.map((d) => {
    const real = realpathSync(resolve(d));
    if (!statSync(real).isDirectory()) throw new Error(`--allow-dir is not a folder: ${d}`);
    return real;
  });
}

/** @param {string} child @param {string} dir */
const inside = (child, dir) => child === dir || child.startsWith(dir.endsWith(sep) ? dir : dir + sep);

/**
 * Check a requested path against the allowlist.
 * @param {string} requested
 * @param {string[]} allowed real paths of the allowed folders
 * @returns {{ok: true, path: string, size: number} | {ok: false, message: string}}
 */
export function checkPath(requested, allowed) {
  const where = allowed.length ? `Allowed folders: ${allowed.join(', ')}.` : '';
  if (!allowed.length) {
    return { ok: false, message: 'No folder is allowed. Restart the server with --allow-dir <folder> (repeatable) in your client configuration to let it read files there.' };
  }
  if (typeof requested !== 'string' || requested === '' || requested.includes('\0')) return { ok: false, message: `Give a file path. ${where}` };
  const candidates = isAbsolute(requested) ? [requested] : allowed.map((d) => resolve(d, requested));
  for (const c of candidates) {
    let real;
    try { real = realpathSync(c); } catch { continue; }
    if (!allowed.some((d) => inside(real, d))) {
      return { ok: false, message: `That path is outside the allowed folders, so nothing was read. ${where}` };
    }
    const st = statSync(real);
    if (!st.isFile()) return { ok: false, message: `That path is not a regular file (folders and device files are refused). ${where}` };
    if (st.size > MAX_FILE_BYTES) return { ok: false, message: `That file is ${st.size.toLocaleString('en-US')} bytes; the limit is ${MAX_FILE_BYTES.toLocaleString('en-US')}.` };
    return { ok: true, path: real, size: st.size };
  }
  return { ok: false, message: `No such file in the allowed folders. ${where}` };
}
