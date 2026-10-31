// Normalize EPA Power Profiler's "Zip-subregion" sheet: each five-digit ZIP
// and the one to three eGRID subregions it falls in, as EPA lists them.
// ZIPs stay text, so leading zeros survive.

export const EXPECTED_HEADER = ['zip', 'Subregion 1', 'Subregion 2', 'Subregion 3'];
export const SCHEMA = [
  { name: 'zip', type: 'str' }, { name: 'subregion_1', type: 'str' }, { name: 'subregion_2', type: 'str' }, { name: 'subregion_3', type: 'str' },
  { name: 'subregions', type: 'f64', unit: 'count' },
];

const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' ? null : String(v).trim(); };

/** @param {any[][]} rows @param {number} headerRows */
export function normalize(rows, headerRows) {
  const header = rows[headerRows - 1].map((c) => text(c) ?? '');
  const problems = [];
  EXPECTED_HEADER.forEach((h, i) => { if (header[i] !== h) problems.push(`column ${i + 1} is "${header[i]}", expected "${h}"`); });
  const out = [];
  for (const r of rows.slice(headerRows)) {
    const raw = value(r[0]);
    if (raw === null) continue; // EPA's trailing blank rows
    // A ZIP stored as a number loses its leading zeros; put them back.
    const zip = typeof raw === 'number' ? String(raw).padStart(5, '0') : String(raw).trim();
    if (!/^\d{5}$/.test(zip)) { problems.push(`row with ZIP "${raw}" is not five digits`); continue; }
    const subs = [text(r[1]), text(r[2]), text(r[3])];
    out.push({ zip, subregion_1: subs[0], subregion_2: subs[1], subregion_3: subs[2], subregions: subs.filter(Boolean).length });
  }
  return { rows: out, problems };
}
