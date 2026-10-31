// Public data for the MCP server, read from the clone's data/ folder in the
// same shard format the website uses (agent/mcp-server, design D4). Nothing
// is ever downloaded here.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readShard } from '../core/lib/shard.mjs';

export const DATA_DIR = fileURLToPath(new URL('../data', import.meta.url));

/** Every dataset's served version, from data/<id>/current.json. */
export function catalog(dir = DATA_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'current.json')))
    .map((d) => {
      const { version } = JSON.parse(readFileSync(join(dir, d.name, 'current.json'), 'utf8'));
      const m = JSON.parse(readFileSync(join(dir, d.name, version, 'manifest.json'), 'utf8'));
      return {
        id: m.dataset, version: m.version, title: m.title, publisher: m.publisher, asOf: m.asOf, retrieved: m.retrieved,
        posture: m.posture, license: m.license, attribution: m.attribution, sourceUrl: m.sourceUrl,
        tables: m.tables.map((t) => ({ name: t.name, dataPeriod: t.dataPeriod, rows: t.rows, partition: t.partition, columns: t.columns.map(({ name, type, unit }) => ({ name, type, ...(unit ? { unit } : {}) })) })),
      };
    });
}

/**
 * Rows of a dataset table matching exact column values. A filter on the
 * partition column reads only that shard.
 * @param {{dataset: string, table?: string, filter?: Record<string, any>, limit?: number}} q
 */
export function query({ dataset, table, filter = {}, limit = 100 }, dir = DATA_DIR) {
  const cur = join(dir, dataset, 'current.json');
  if (!existsSync(cur)) return null;
  const { version } = JSON.parse(readFileSync(cur, 'utf8'));
  const m = JSON.parse(readFileSync(join(dir, dataset, version, 'manifest.json'), 'utf8'));
  const t = table ? m.tables.find((x) => x.name === table) : m.tables[0];
  if (!t) return { manifest: m, error: `No table ${table}. Tables: ${m.tables.map((x) => x.name).join(', ')}.` };
  const unknown = Object.keys(filter).filter((k) => !t.columns.some((c) => c.name === k));
  if (unknown.length) return { manifest: m, error: `No column ${unknown.join(', ')}. Columns: ${t.columns.map((c) => c.name).join(', ')}.` };
  const shards = filter[t.partition] !== undefined ? t.shards.filter((s) => s.state === filter[t.partition]) : t.shards;
  const rows = [];
  let matched = 0;
  for (const s of shards) {
    for (const r of readShard(readFileSync(join(dir, dataset, version, s.path))).rows()) {
      if (Object.entries(filter).every(([k, v]) => r[k] === v)) {
        matched++;
        if (rows.length < limit) rows.push(r);
      }
    }
  }
  return { manifest: m, table: t, rows, matched };
}
