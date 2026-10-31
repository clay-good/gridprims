// The secret scan (platform/automation, "Secret never lands in an artifact"):
// no credential-shaped string in the build output, committed data, the health
// record, or the repository's tracked files.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walk } from '../lib/walk.mjs';

/** Shapes of the credentials this project could hold. */
export const SECRET_PATTERNS = [
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ['private key', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['bearer header', /\bauthorization:\s*bearer\s+[A-Za-z0-9._-]{20,}/i],
  ['Cloudflare API token variable', /CLOUDFLARE_API_TOKEN\s*[=:]\s*["']?[A-Za-z0-9_-]{30,}/],
  ['AWS key', /\bAKIA[0-9A-Z]{16}\b/],
];

/** @param {string} text */
export function findSecrets(text) {
  return SECRET_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** @param {string} root */
export function checkSecrets(root) {
  const errors = [];
  let tracked = [];
  try { tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean); } catch { tracked = []; }
  const dist = existsSync(join(root, 'dist')) ? walk(join(root, 'dist')).map((f) => `dist/${f}`) : [];
  for (const f of [...new Set([...tracked, ...dist])]) {
    if (!/\.(mjs|js|json|html|md|yml|yaml|txt|csv|css|webmanifest|sql)$/.test(f) || f.startsWith('verify/tests/') || f === 'verify/gates/secrets.mjs') continue;
    let text;
    try { text = readFileSync(join(root, f), 'utf8'); } catch { continue; }
    for (const name of findSecrets(text)) errors.push(`${f}: contains something shaped like a ${name}`);
  }
  return errors;
}
