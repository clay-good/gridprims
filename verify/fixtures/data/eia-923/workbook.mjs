// A small workbook shaped exactly like EIA-923's "Page 1 Generation and Fuel
// Data" sheet (five title rows, the header, "." placeholders, a state-fuel
// increment row, a plant whose CHP status changed, and the blank frame row),
// zipped the way EIA ships it, for offline pipeline tests.

import { readFileSync } from 'node:fs';
import { writeXlsx, writeZip } from '../../../lib/zip-writer.mjs';
import { EXPECTED_HEADER } from '../../../../pipeline/normalize/eia-923-generation.mjs';

const blank = JSON.parse(readFileSync(new URL('./blank-frame-row.json', import.meta.url), 'utf8')).cells;

/** A row: 19 descriptive cells, five monthly quantity groups, 12 monthly MWh, then annual totals and the year. */
const row = (desc, mwh, year) => [...desc, ...Array(60).fill(10), ...mwh, 120, 120, 600, 600, mwh.reduce((a, b) => a + b, 0), year];
const month = (v) => Array(12).fill(v);

export function sampleRows(year = 2025) {
  return [
    row([1, 'N', '.', 'Sand Point', 'Sand Point Generating, LLC', 63560, 'AK', 'PACN', '', '', 22, 1, 'Electric Utility', 'IC', 'DFO', 'DFO', '', 'A', 'barrels'], month(25), year),
    row([1167, 'Y', '.', 'Muscatine Plant #1', 'Board of Water Electric & Communications', 13143, 'IA', 'WNC', 'MRO', '', 22, 1, 'Electric Utility', 'ST', 'NG', 'NG', 'MISO', 'M', 'mcf'], month(10), year),
    row([1167, 'N', '.', 'Muscatine Plant #1', 'Board of Water Electric & Communications', 13143, 'IA', 'WNC', 'MRO', '', 22, 1, 'Electric Utility', 'ST', 'NG', 'NG', 'MISO', 'M', 'mcf'], month(60), year),
    row([3251, 'N', 2, 'H B Robinson', 'Duke Energy Progress - (NC)', 3046, 'SC', 'SAT', 'SERC', '', 22, 1, 'Electric Utility', 'ST', 'NUC', 'NUC', 'CPLE', 'M', 'mmbtu'], month(500000), year),
    row([2780, 'N', '.', 'Hiwassee Dam', 'Tennessee Valley Authority', 18642, 'NC', 'SAT', 'SERC', '', 22, 1, 'Electric Utility', 'PS', 'WAT', 'HPS', 'TVA', 'M', ''], month(-10000), year),
    row([99999, 'N', '.', 'State-Fuel Level Increment', 'State-Fuel Level Increment', 99999, 'NC', 'SAT', '', '', 99999, 2, 'NAICS-22 Non-Cogen', 'CA', 'DFO', 'DFO', 'State-Fuel Level Increment', '', 'barrels'], month(0), year),
    row([99999, 'N', '.', 'State-Fuel Level Increment', 'State-Fuel Level Increment', 99999, 'NC', 'SAT', '', '', 99999, 1, 'Electric Utility', 'CA', 'DFO', 'DFO', 'State-Fuel Level Increment', '', 'barrels'], month(0), year),
    blank,
  ];
}

/** @param {{year?: number, rows?: any[][], final?: boolean}} [o] final: false names the workbook the way the year-to-date file does */
export function eia923Zip(o = {}) {
  const year = o.year ?? 2025;
  const titles = [['U.S. Department of Energy, The Energy Information Administration (EIA)'], [`EIA-923 Monthly Generation and Fuel Consumption Time Series File,  ${year} Final Data`], ['Sources: EIA-923 and EIA-860 Reports'], [], ['']];
  const name = o.final === false ? `EIA923_Schedules_2_3_4_5_M_08_${year}_21OCT${year}.xlsx` : `EIA923_Schedules_2_3_4_5_M_12_${year}_Final_Revision.xlsx`;
  return writeZip([
    { name, data: writeXlsx({ 'Page 1 Generation and Fuel Data': [...titles, EXPECTED_HEADER, ...(o.rows ?? sampleRows(year))], 'Page 1 Puerto Rico': [] }) },
    { name: `EIA923_Schedule_8_Annual_Envir_Infor_${year}_Final.xlsx`, data: 'x' },
  ]);
}

/** The real table recipes with row bounds that suit this small workbook. */
export const smallTables = (entry) => entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) }));
