// Reading EIA-930's six-month CSVs a line at a time (no quoted fields in the
// data rows), and the summary statistics every residual table shares.

/** The rows of a six-month file by header name. @param {() => AsyncIterable<string>} lines @param {(row: Record<string, string>) => void} each */
export async function eachRow(lines, each) {
  let head = null;
  for await (const line of lines()) {
    if (!line) continue;
    const cells = line.split(',');
    if (!head) { head = cells.map((c) => c.replace(/^"|"$/g, '')); continue; }
    each(Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ''])));
  }
  return head;
}

/** A reported MW value, or null when the cell is empty. */
export const mw = (s) => (s === '' || s === undefined ? null : Number(s));

/** Median, 90th percentile, and maximum of magnitudes (nearest rank). */
export function stats(values) {
  const v = values.map(Math.abs).sort((a, b) => a - b);
  const rank = (q) => (v.length ? v[Math.min(v.length - 1, Math.ceil(q * v.length) - 1)] : null);
  return { median: rank(0.5), p90: rank(0.9), max: v.length ? v.at(-1) : null };
}
