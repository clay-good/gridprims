// Normalize EIA-861 Service Territory ("Counties_States" sheet): the counties
// each utility serves in each state.

export const EXPECTED_HEADER = ['Data Year', 'Utility Number', 'Utility Name', 'Short Form', 'State', 'County'];
export const SCHEMA = [
  { name: 'data_year', type: 'f64' }, { name: 'utility_id', type: 'f64' }, { name: 'utility_name', type: 'str' },
  { name: 'short_form', type: 'str' }, { name: 'state', type: 'str' }, { name: 'county', type: 'str' },
];
const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' ? null : String(v).trim(); };

/** @param {any[][]} rows @param {number} headerRows */
export function normalize(rows, headerRows) {
  const header = rows[headerRows - 1].map((c) => text(c) ?? '');
  const problems = [];
  EXPECTED_HEADER.forEach((h, i) => { if (header[i] !== h) problems.push(`column ${i + 1} is "${header[i]}", expected "${h}"`); });
  const out = rows.slice(headerRows).filter((r) => Number.isInteger(value(r[0]))).map((r) => ({
    data_year: value(r[0]), utility_id: value(r[1]), utility_name: text(r[2]), short_form: text(r[3]) === 'Y' ? 'Y' : null, state: text(r[4]), county: text(r[5]),
  }));
  return { rows: out, problems };
}
