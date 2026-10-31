// Normalize EIA-861 Reliability ("Reliability_States" sheet): SAIDI, SAIFI,
// and CAIDI per utility and state, under the IEEE 1366 standard (with and
// without major event days, and with loss of supply removed) and under each
// utility's other standard. EIA's "." means not reported: null, never zero.

const IEEE = ['saidi', 'saifi', 'caidi'];
const UNITS = { saidi: 'minutes per year', saifi: 'interruptions per year', caidi: 'minutes per interruption' };

export const EXPECTED_HEADER = ['Data Year', 'Utility Number', 'Utility Name', 'State', 'Ownership',
  'SAIDI (minutes per year)', 'SAIFI (times per year)', 'CAIDI (minutes per interruption)',
  'SAIDI (minutes per year)', 'SAIFI (times per year)', 'CAIDI (minutes per interruption)',
  'SAIDI (minutes per year)', 'SAIFI (times per year)', 'CAIDI (minutes per interruption)',
  'Number of Customers', 'Highest Dist. Voltage', 'Outages Recorded Automatically',
  'SAIDI (minutes per year)', 'SAIFI (times per year)', 'CAIDI With MED',
  'SAIDI (minutes per year)', 'SAIFI (times per year)', 'CAIDI Without MED',
  'Number of Customers', 'Inactive Accounts Included', 'Momentary Interruptions', 'Highest Dist. Voltage', 'Outages Recorded Automatically'];

const group = (prefix) => IEEE.map((m) => ({ name: `${prefix}_${m}`, type: 'f64', unit: UNITS[m] }));
export const SCHEMA = [
  { name: 'data_year', type: 'f64' }, { name: 'utility_id', type: 'f64' }, { name: 'utility_name', type: 'str' },
  { name: 'state', type: 'str' }, { name: 'ownership', type: 'str' },
  ...group('ieee_with_med'), ...group('ieee_without_med'), ...group('ieee_with_med_minus_los'),
  { name: 'ieee_customers', type: 'f64', unit: 'count' }, { name: 'ieee_highest_voltage', type: 'f64', unit: 'kV' }, { name: 'ieee_recorded_automatically', type: 'str' },
  ...group('other_with_med'), ...group('other_without_med'),
  { name: 'other_customers', type: 'f64', unit: 'count' }, { name: 'other_inactive_accounts_included', type: 'str' },
  { name: 'other_momentary_definition', type: 'str' }, { name: 'other_highest_voltage', type: 'f64', unit: 'kV' }, { name: 'other_recorded_automatically', type: 'str' },
];

const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' || String(v).trim() === '.' ? null : String(v).trim(); };
const number = (c) => { const v = value(c); return typeof v === 'number' ? v : null; };

/** @param {any[][]} rows @param {number} headerRows */
export function normalize(rows, headerRows) {
  const problems = [];
  const header = rows[headerRows - 1].map((c) => text(c) ?? '');
  EXPECTED_HEADER.forEach((h, i) => { if (header[i] !== h) problems.push(`column ${i + 1} is "${header[i]}", expected "${h}"`); });
  const out = [];
  for (const r of rows.slice(headerRows)) {
    if (!Number.isInteger(value(r[0]))) continue;
    const row = { data_year: number(r[0]), utility_id: number(r[1]), utility_name: text(r[2]), state: text(r[3]), ownership: text(r[4]) };
    const metrics = (start) => IEEE.map((m, k) => number(r[start + k]));
    [['ieee_with_med', 5], ['ieee_without_med', 8], ['ieee_with_med_minus_los', 11], ['other_with_med', 17], ['other_without_med', 20]].forEach(([p, at]) => {
      metrics(at).forEach((v, k) => { row[`${p}_${IEEE[k]}`] = v; });
    });
    Object.assign(row, {
      ieee_customers: number(r[14]), ieee_highest_voltage: number(r[15]), ieee_recorded_automatically: text(r[16]),
      other_customers: number(r[23]), other_inactive_accounts_included: text(r[24]), other_momentary_definition: text(r[25]),
      other_highest_voltage: number(r[26]), other_recorded_automatically: text(r[27]),
    });
    out.push(row);
  }
  return { rows: out, problems };
}
