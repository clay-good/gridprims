// What changed between two versions of a dataset (add-data-continuity-ledger:
// snapshot diffs): files added, removed, and changed by checksum; columns
// added, removed, renamed, or changed in unit; row counts; keyed row changes
// and the largest ones, as the pipeline recorded them; and how far revised
// values moved. Neutral by construction: it reports changes, never errors.

/** @param {any} m a manifest @returns {Map<string, string>} path to SHA-256 */
const files = (m) => new Map(m.tables.flatMap((t) => [...t.shards.map((s) => [s.path, s.sha256]), ...(t.download ? [[t.download.path, t.download.sha256]] : [])]));

/**
 * Columns between two versions of a table: added, removed, renamed (one removed and one added at the same
 * place with the same type and unit), and unit changes.
 */
export function columnChanges(before, after) {
  const was = new Map(before.map((c, i) => [c.name, { ...c, i }]));
  const now = new Map(after.map((c, i) => [c.name, { ...c, i }]));
  let removed = before.filter((c) => !now.has(c.name));
  let added = after.filter((c) => !was.has(c.name));
  const renamed = [];
  for (const r of [...removed]) {
    const a = added.find((x) => x.type === r.type && (x.unit ?? null) === (r.unit ?? null) && after.indexOf(x) === before.indexOf(r));
    if (a) { renamed.push({ from: r.name, to: a.name }); removed = removed.filter((x) => x !== r); added = added.filter((x) => x !== a); }
  }
  const unit = after.filter((c) => was.has(c.name) && (was.get(c.name).unit ?? null) !== (c.unit ?? null)).map((c) => ({ name: c.name, from: was.get(c.name).unit ?? null, to: c.unit ?? null }));
  return { added: added.map((c) => c.name), removed: removed.map((c) => c.name), renamed, unit };
}

/**
 * The diff from one version's manifest to the next.
 * @param {any} prev @param {any} next
 */
export function diffManifests(prev, next) {
  const a = files(prev);
  const b = files(next);
  const tables = next.tables.map((t) => {
    const before = prev.tables.find((x) => x.name === t.name);
    return {
      name: t.name,
      rows: { before: before?.rows ?? null, after: t.rows, delta: before ? t.rows - before.rows : null },
      columns: before ? columnChanges(before.columns, t.columns) : { added: t.columns.map((c) => c.name), removed: [], renamed: [], unit: [] },
      changes: t.changes ?? null,
    };
  });
  const gone = prev.tables.filter((t) => !next.tables.some((x) => x.name === t.name)).map((t) => t.name);
  return {
    dataset: next.dataset, license: 'CC BY 4.0',
    from: { version: prev.version, asOf: prev.asOf, retrieved: prev.retrieved },
    to: { version: next.version, asOf: next.asOf, retrieved: next.retrieved },
    files: {
      added: [...b.keys()].filter((p) => !a.has(p)).map((p) => ({ path: p, sha256: b.get(p) })),
      removed: [...a.keys()].filter((p) => !b.has(p)).map((p) => ({ path: p, sha256: a.get(p) })),
      changed: [...b.keys()].filter((p) => a.has(p) && a.get(p) !== b.get(p)).map((p) => ({ path: p, from: a.get(p), to: b.get(p) })),
      unchanged: [...b.keys()].filter((p) => a.get(p) === b.get(p)).length,
    },
    tables, tablesRemoved: gone,
  };
}

/**
 * Columns a diff removed, renamed, or changed in unit that something depends on: the change that pins a
 * dataset to its previous version.
 * @param {ReturnType<typeof diffManifests>} diff @param {Record<string, string[]>} uses table name to the columns pages and tools read
 */
export function breakingChanges(diff, uses = {}) {
  const out = [];
  for (const t of diff.tables) {
    const need = new Set(uses[t.name] ?? []);
    for (const c of t.columns.removed) if (need.has(c)) out.push({ table: t.name, column: c, change: 'removed' });
    for (const r of t.columns.renamed) if (need.has(r.from)) out.push({ table: t.name, column: r.from, change: `renamed to ${r.to}` });
    for (const u of t.columns.unit) if (need.has(u.name)) out.push({ table: t.name, column: u.name, change: `unit changed from ${u.from} to ${u.to}` });
  }
  for (const name of diff.tablesRemoved) if (uses[name]?.length) out.push({ table: name, column: null, change: 'table removed' });
  return out;
}

/** Median, 90th percentile, and maximum of revision magnitudes (nearest rank), with how many there were. */
export function magnitudes(values) {
  const v = values.map(Math.abs).sort((x, y) => x - y);
  if (!v.length) return null;
  const rank = (q) => v[Math.min(v.length - 1, Math.ceil(q * v.length) - 1)];
  return { count: v.length, median: rank(0.5), p90: rank(0.9), max: v.at(-1) };
}
