// The datasets the continuity ledger tracks: every registry entry with a
// served version, and gridprims' own derived datasets, dated by the served
// version of the dataset each is computed from.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ours from '../../data/curated/our-datasets.mjs';

/** @param {string} root the repository @returns {Promise<any[]>} */
export async function ledgerDatasets(root) {
  const out = [];
  const manifests = new Map();
  for (const f of readdirSync(join(root, 'pipeline/registry')).filter((n) => n.endsWith('.mjs')).sort()) {
    const e = (await import(pathToFileURL(join(root, 'pipeline/registry', f)).href)).default;
    const cur = join(root, 'data', e.id, 'current.json');
    if (!existsSync(cur)) continue;
    const { version } = JSON.parse(readFileSync(cur, 'utf8'));
    const m = JSON.parse(readFileSync(join(root, 'data', e.id, version, 'manifest.json'), 'utf8'));
    manifests.set(e.id, m);
    out.push({
      id: e.id, title: e.shortTitle ?? e.title, publisher: e.publisher, sourceUrl: e.sourceUrl, cadence: e.cadence, asOf: m.asOf,
      vintage: m.release ?? m.tables[0]?.dataPeriod ?? m.version, archive: m.raw?.find((r) => r.release)?.release ?? null,
      diff: m.previousVersion ? `/data/${e.id}/${m.version}/diff/` : null,
      ...(e.discontinued ? { discontinued: e.discontinued } : {}), ...(e.moved ? { moved: e.moved } : {}),
    });
  }
  for (const o of ours) {
    if (o.curated) { out.push({ ...o, publisher: 'gridprims', ours: true }); continue; }
    const src = manifests.get(o.from);
    if (!src) continue;
    // Our own figures are as old as the build that made them from their source's served version.
    out.push({ ...o, publisher: 'gridprims', ours: true, asOf: src.retrieved, vintage: `from ${o.from} ${src.version}` });
  }
  return out;
}
