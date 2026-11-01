// A two-column normalizer for the snapshot-diff tests: id and mw, or, when the
// fixture marks the publisher's rename, id and capacity.

export let SCHEMA = [{ name: 'id', type: 'str' }, { name: 'year', type: 'f64' }, { name: 'mw', type: 'f64', unit: 'MW' }];

export async function normalize(rows) {
  const renamed = rows.some((r) => r.rename);
  SCHEMA = renamed ? [{ name: 'id', type: 'str' }, { name: 'year', type: 'f64' }, { name: 'capacity', type: 'f64', unit: 'MW' }] : [{ name: 'id', type: 'str' }, { name: 'year', type: 'f64' }, { name: 'mw', type: 'f64', unit: 'MW' }];
  return { rows: rows.map(({ rename, ...r }) => r), problems: [] };
}
