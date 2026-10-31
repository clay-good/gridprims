// Download dataset files from gridprims.com and verify each against the
// digests committed in this clone (agent/mcp-server, "Data commands are
// separate and verified"). The digest list is never fetched from the server,
// so a tampered site cannot substitute both a file and its checksum.
//   node pipeline/get-data.mjs [--origin https://gridprims.com] [--data data]

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { ROOT } from './run.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');

/**
 * @param {{origin?: string, dataDir?: string, fetch?: typeof fetch}} [o]
 * @returns {Promise<{fetched: string[], kept: string[], refused: string[]}>}
 */
export async function getData(o = {}) {
  const origin = o.origin ?? 'https://gridprims.com';
  const dataDir = o.dataDir ?? join(ROOT, 'data');
  const f = o.fetch ?? fetch;
  const out = { fetched: [], kept: [], refused: [] };
  for (const id of readdirSync(dataDir)) {
    const cur = join(dataDir, id, 'current.json');
    if (!existsSync(cur)) continue;
    const { version } = JSON.parse(readFileSync(cur, 'utf8'));
    const manifest = JSON.parse(readFileSync(join(dataDir, id, version, 'manifest.json'), 'utf8'));
    const files = manifest.tables.flatMap((t) => [...t.shards.map((s) => ({ path: s.path, sha256: s.sha256 })), { path: t.download.path, sha256: t.download.sha256 }]);
    for (const file of files) {
      const local = join(dataDir, id, version, file.path);
      const rel = `${id}/${version}/${file.path}`;
      if (existsSync(local) && sha(readFileSync(local)) === file.sha256) { out.kept.push(rel); continue; }
      const res = await f(`${origin}/data/${rel}`);
      const bytes = res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
      if (!bytes || sha(bytes) !== file.sha256) {
        rmSync(local, { force: true });
        out.refused.push(`${rel}: ${bytes ? `SHA-256 ${sha(bytes)} does not match the committed ${file.sha256}` : `HTTP ${res.status}`}`);
        continue;
      }
      mkdirSync(dirname(local), { recursive: true });
      writeFileSync(local, bytes);
      out.fetched.push(rel);
    }
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { values } = parseArgs({ options: { origin: { type: 'string' }, data: { type: 'string' } } });
  const r = await getData({ origin: values.origin, dataDir: values.data });
  console.log(`${r.fetched.length} downloaded and verified, ${r.kept.length} already present and verified`);
  for (const x of r.refused) console.error(`REFUSED ${x} (deleted)`);
  if (r.refused.length) process.exitCode = 1;
}
