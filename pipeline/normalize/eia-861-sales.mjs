// Normalize EIA-861 Sales_Ult_Cust ("States" sheet) into one row per
// respondent, part, service type, state, and balancing authority. EIA's "."
// means not applicable or not reported: it becomes null, never zero.

const SECTORS = [['res', 'RESIDENTIAL'], ['com', 'COMMERCIAL'], ['ind', 'INDUSTRIAL'], ['trn', 'TRANSPORTATION'], ['tot', 'TOTAL']];

/** The header EIA has used in every vintage checked (2023, 2024, 2025). A change fails the schema check. */
export const EXPECTED_HEADER = ['Data Year', 'Utility Number', 'Utility Name', 'Part', 'Service Type', 'Data Type\r\nO = Observed\r\nI = Imputed', 'State', 'Ownership', 'BA Code',
  ...SECTORS.flatMap(() => ['Thousand Dollars', 'Megawatthours', 'Count'])];

export const SCHEMA = [
  { name: 'data_year', type: 'f64' }, { name: 'utility_id', type: 'f64' }, { name: 'utility_name', type: 'str' },
  { name: 'part', type: 'str' }, { name: 'service_type', type: 'str' }, { name: 'data_type', type: 'str' },
  { name: 'state', type: 'str' }, { name: 'ownership', type: 'str' }, { name: 'ba_code', type: 'str' },
  ...SECTORS.flatMap(([p]) => [
    { name: `${p}_revenue`, type: 'f64', unit: 'thousand USD' },
    { name: `${p}_sales`, type: 'f64', unit: 'MWh' },
    { name: `${p}_customers`, type: 'f64', unit: 'count' },
  ]),
  { name: 'seq', type: 'f64' },
];

const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' ? null : String(v).trim(); };
const number = (c) => { const v = value(c); return typeof v === 'number' ? v : null; }; // "." and blanks are missing

/**
 * @param {Array<Array<{value: any} | null>>} rows the sheet, header rows included
 * @param {number} headerRows
 * @returns {{rows: Array<Record<string, any>>, problems: string[]}}
 */
export function normalize(rows, headerRows) {
  const problems = [];
  const header = rows[headerRows - 1].map((c) => text(c) ?? '');
  EXPECTED_HEADER.forEach((h, i) => { if (header[i] !== h.trim()) problems.push(`column ${i + 1} is "${header[i]}", expected "${h.trim()}"`); });
  const out = [];
  const seen = new Map();
  for (const r of rows.slice(headerRows)) {
    if (!Number.isInteger(value(r[0]))) continue; // EIA's footnote rows
    const row = {
      data_year: number(r[0]), utility_id: number(r[1]), utility_name: text(r[2]), part: text(r[3]), service_type: text(r[4]),
      data_type: text(r[5]), state: text(r[6]), ownership: text(r[7]), ba_code: text(r[8]),
    };
    SECTORS.forEach(([p], k) => {
      row[`${p}_revenue`] = number(r[9 + k * 3]);
      row[`${p}_sales`] = number(r[10 + k * 3]);
      row[`${p}_customers`] = number(r[11 + k * 3]);
    });
    // Quirk "withheld-respondents": rows that share every key field are kept, numbered in file order.
    const key = [row.utility_id, row.part, row.service_type, row.state, row.ba_code].join('|');
    row.seq = seen.get(key) ?? 0;
    seen.set(key, row.seq + 1);
    out.push(row);
  }
  return { rows: out, problems };
}
