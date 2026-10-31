// Normalize LBNL's Queued Up data file ("03. Complete Queue Data": a link row,
// then the codebook's field names) into one row per queue request, as LBNL
// lists them. Excel date serials become ISO dates and county FIPS codes keep
// their leading zero. A queue id that repeats within one entity (135 pairs in
// the 2026 edition, mostly one project listed per county) keeps every row,
// numbered by `seq` in file order, because LBNL's own totals count every row.
// Point-of-interconnection names (substations) are left in LBNL's file.

/** The fields of the 2026 edition's codebook, in order. A change fails the schema check. */
export const EXPECTED_HEADER = ['q_id', 'q_status', 'q_date', 'prop_date', 'on_date', 'wd_date', 'ia_date', 'IA_phase_raw', 'IA_phase_clean', 'county', 'state', 'fips_code', 'poi_name',
  'region', 'project_name', 'utility', 'entity', 'developer', 'cluster', 'service', 'project_type', 'type_1', 'type_2', 'type_3', 'type_clean', 'mw_1', 'mw_2', 'mw_3', 'q_year', 'prop_year'];
const DATES = ['q_date', 'prop_date', 'on_date', 'wd_date', 'ia_date'];
const NUMBERS = [['mw_1', 'MW'], ['mw_2', 'MW'], ['mw_3', 'MW'], ['q_year'], ['prop_year']];
const TEXT = ['q_status', 'ia_phase_raw', 'ia_phase', 'county', 'state', 'region', 'project_name', 'utility', 'entity', 'developer', 'cluster', 'service', 'project_type', 'type_1', 'type_2', 'type_3', 'type_clean'];
const FROM = { ia_phase_raw: 'IA_phase_raw', ia_phase: 'IA_phase_clean' };

export const SCHEMA = [
  { name: 'q_id', type: 'str' }, { name: 'entity', type: 'str' }, { name: 'seq', type: 'f64' },
  ...TEXT.filter((t) => t !== 'entity').map((name) => ({ name, type: 'str' })),
  { name: 'fips_code', type: 'str' },
  ...DATES.map((name) => ({ name, type: 'str' })),
  ...NUMBERS.map(([name, unit]) => ({ name, type: 'f64', ...(unit ? { unit } : {}) })),
];

const value = (c) => (c === null || c === undefined ? null : c.value);
const text = (c) => { const v = value(c); return v === null || String(v).trim() === '' ? null : String(v).trim(); };
const number = (c) => { const v = value(c); return typeof v === 'number' ? v : null; };
/** Excel's 1900 date system counts the phantom 1900-02-29 as day 60, so from serial 61 (1900-03-01) on, day n is 1899-12-30 plus n. */
export const excelDate = (n) => (typeof n === 'number' && n > 0 ? new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86_400_000).toISOString().slice(0, 10) : null);

/** @param {any[][]} rows @param {number} headerRows */
export function normalize(rows, headerRows) {
  const header = rows[headerRows - 1].map((c) => text(c) ?? '');
  const problems = [];
  EXPECTED_HEADER.forEach((h, i) => { if (header[i] !== h) problems.push(`column ${i + 1} is "${header[i]}", expected "${h}"`); });
  if (problems.length) return { rows: [], problems };
  const at = Object.fromEntries(EXPECTED_HEADER.map((h, i) => [h, i]));
  const seen = new Map();
  const out = [];
  for (const r of rows.slice(headerRows)) {
    const id = text(r[at.q_id]);
    if (id === null) continue;
    const entity = text(r[at.entity]);
    const k = `${id}|${entity}`;
    const seq = seen.get(k) ?? 0;
    seen.set(k, seq + 1);
    const fips = value(r[at.fips_code]);
    out.push({
      q_id: id, entity, seq,
      ...Object.fromEntries(TEXT.filter((t) => t !== 'entity').map((t) => [t, text(r[at[FROM[t] ?? t]])])),
      fips_code: fips === null || fips === '' ? null : String(fips).padStart(5, '0'),
      ...Object.fromEntries(DATES.map((d) => [d, excelDate(value(r[at[d]]))])),
      ...Object.fromEntries(NUMBERS.map(([n]) => [n, number(r[at[n]])])),
    });
  }
  return { rows: out, problems };
}
