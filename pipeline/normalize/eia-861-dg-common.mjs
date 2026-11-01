// EIA-861's distributed generation workbooks (Net_Metering_YYYY.xlsx and
// Non_Net_Metering_Distributed_YYYY.xlsx), read from their stacked header
// rows into one row per utility, technology, measure, and sector, keeping the
// survey's own category names. The layout changes between years (2023 split
// "Battery" out of "Photovoltaic"), so columns are found by their headers.

const IDENTITY = { Year: 'data_year', State: 'state', 'Utility Number': 'utility_id', 'Utility Name': 'utility_name', 'BA Code': 'ba_code', BA_CODE: 'ba_code', Type: 'type' };
const SECTORS = new Set(['Residential', 'Commercial', 'Industrial', 'Transportation', 'Direct Connected', 'Total']);
const text = (c) => (c === null || c === undefined ? '' : String(c.value ?? '').replace(/\s+/g, ' ').trim());

export const SCHEMA = [
  { name: 'data_year', type: 'f64' }, { name: 'state', type: 'str' }, { name: 'utility_id', type: 'f64' }, { name: 'utility_name', type: 'str' },
  { name: 'ba_code', type: 'str' }, { name: 'type', type: 'str', unit: 'EIA\'s ownership type of the reporting utility' },
  { name: 'technology', type: 'str', unit: 'the survey\'s technology group' }, { name: 'measure', type: 'str', unit: 'the survey\'s measure' },
  { name: 'sector', type: 'str' }, { name: 'value', type: 'f64', unit: 'in the measure\'s unit' },
];

/**
 * @param {Array<Array<any>>} rows one sheet
 * @param {(group: string, measure: string, field: string) => {technology: string, measure: string, sector: string}} label
 */
export function longRows(rows, label) {
  const fieldRow = rows.findIndex((r) => text(r?.[0]) === 'Year');
  if (fieldRow < 1) return { rows: [], problem: 'no header row starting with Year' };
  const carry = (r) => { let last = ''; return (r ?? []).map((c) => (text(c) ? (last = text(c)) : last)); };
  const groups = carry(rows[0]);
  const measures = fieldRow >= 2 ? carry(rows[1]) : [];
  const fields = (rows[fieldRow] ?? []).map(text);
  const identity = new Map(fields.map((f, i) => [i, IDENTITY[f]]).filter(([, k]) => k));
  if (!['data_year', 'state', 'utility_id'].every((k) => [...identity.values()].includes(k))) return { rows: [], problem: `the header lacks Year, State, or Utility Number: ${fields.slice(0, 8).join(', ')}` };
  const out = [];
  for (const r of rows.slice(fieldRow + 1)) {
    if (!r || typeof r[0]?.value !== 'number') continue;
    const id = {};
    for (const [i, k] of identity) id[k] = k === 'data_year' || k === 'utility_id' ? Number(r[i]?.value) : text(r[i]) || null;
    fields.forEach((f, i) => {
      if (identity.has(i) || !f) return;
      const v = r[i]?.value;
      // EIA writes "." for no value; a zero adds no row, so a utility that reported none has none.
      if (typeof v !== 'number' || v === 0) return;
      out.push({ ...id, ...label(groups[i], measures[i] ?? '', f), value: v });
    });
  }
  return { rows: out };
}

/** The sector a field names, or "Total" for a field that is a measure of its own. */
export const sectorOf = (field) => (SECTORS.has(field) ? field : 'Total');
