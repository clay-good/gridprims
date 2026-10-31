// Small workbooks shaped exactly like EIA-861's Sales_Ult_Cust "States" sheet
// (three title rows, "." placeholders, blank ownership, the Withheld 88888
// rows, a footnote), its Reliability_States and Counties_States sheets, zipped
// the way EIA ships them, for offline pipeline tests.

import { writeZip } from '../../../lib/zip-writer.mjs';
import { EXPECTED_HEADER } from '../../../../pipeline/normalize/eia-861-sales.mjs';
import { EXPECTED_HEADER as RELIABILITY_HEADER } from '../../../../pipeline/normalize/eia-861-reliability.mjs';
import { EXPECTED_HEADER as TERRITORY_HEADER } from '../../../../pipeline/normalize/eia-861-service-territory.mjs';

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
const col = (i) => (i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26));
const cell = (v, r, i) => (v === null ? '' : typeof v === 'number' ? `<c r="${col(i)}${r}"><v>${v}</v></c>` : `<c r="${col(i)}${r}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`);

/** The data rows: 3 states, a withheld group, "." values, a blank ownership. */
export function sampleRows(year = 2025, extra = 0) {
  const n = (k) => [k * 10, k * 100, k];
  const rows = [
    [year, 55, 'City of Aberdeen - (MS)', 'A', 'Bundled', 'O', 'MS', 'Municipal', 'TVA', ...n(1), ...n(2), ...n(3), 0, 0, 0, ...n(6)],
    [year, 84, 'A & N Electric Coop', 'A', 'Bundled', 'O', 'VA', 'Cooperative', 'PJM', ...n(4), ...n(5), '.', '.', '.', 0, 0, 0, ...n(9)],
    [year, 88888, 'Withheld', 'D', 'Bundled', 'O', 'TX', 'Retail Power Marketer', 'ERCO', '.', '.', '.', '.', '.', '.', 12045, 270571, 2, '.', '.', '.', 12045, 270571, 2],
    [year, 88888, 'Withheld', 'D', 'Bundled', 'O', 'TX', 'Retail Power Marketer', 'ERCO', '.', '.', '.', '.', '.', '.', 166950.5, 3453602, 11, '.', '.', '.', 166950.5, 3453602, 11],
    [year, 99, 'Unknown Owner LLC', 'B', 'Energy', 'I', 'TX', '', '', ...n(7), ...n(1), ...n(1), 0, 0, 0, ...n(9)],
  ];
  for (let i = 0; i < extra; i++) rows.push([year, 1000 + i, `Utility ${i}`, 'A', 'Bundled', 'O', 'TX', 'Cooperative', 'ERCO', ...n(1), ...n(1), ...n(1), 0, 0, 0, ...n(3)]);
  return rows;
}

/** Reliability rows: one IEEE reporter, one other-standard reporter with "." for IEEE, one in a second state. */
export function reliabilityRows(year = 2025) {
  const dots = Array(12).fill('.');
  return [
    [year, 55, 'City of Aberdeen - (MS)', 'MS', 'Municipal', 120.5, 1.2, 100.4, 90, 1, 90, 88, 0.9, 97.8, 3000, 13.2, 'Y', ...Array(11).fill('.')],
    [year, 44372, 'Oncor Electric Delivery Company LLC', 'TX', 'Investor Owned', ...dots.slice(0, 11), '', 232.05, 1.55, 149.70968, 66.57, 0.72, 92.458333, 4084817, 'N', 'F', 35, 'Y'],
    [year, 84, 'A & N Electric Coop', 'VA', 'Cooperative', 200, 2, 100, 150, 1.5, 100, 140, 1.4, 100, 35000, 25, 'N', ...Array(11).fill('.')],
  ];
}

/** Service territory rows: a utility in two counties of one state and one in another. */
export function territoryRows(year = 2025) {
  return [[year, 1015, 'Austin Energy', '', 'TX', 'Travis'], [year, 1015, 'Austin Energy', '', 'TX', 'Williamson'], [year, 84, 'A & N Electric Coop', 'Y', 'VA', 'Accomack']];
}

const workbook = (sheetName, all) => {
  const sheet = all.map((r, k) => `<row r="${k + 1}">${r.map((v, i) => cell(v, k + 1, i)).join('')}</row>`).join('');
  return writeZip([
    { name: 'xl/workbook.xml', data: `<workbook ${NS}><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/><sheet name="Territories" sheetId="2" r:id="rId2"/></sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', data: `<worksheet ${NS}><sheetData>${sheet}</sheetData></worksheet>` },
    { name: 'xl/worksheets/sheet2.xml', data: `<worksheet ${NS}><sheetData/></worksheet>` },
  ]);
};

/** @param {{year?: number, rows?: any[][], header?: string[], reliability?: any[][], territory?: any[][], territoryHeader?: string[], omit?: string[]}} [o] */
export function eia861Zip(o = {}) {
  const year = o.year ?? 2025;
  const titles = [['Utility Characteristics', ...Array(8).fill(null), 'RESIDENTIAL', null, null, 'COMMERCIAL', null, null, 'INDUSTRIAL', null, null, 'TRANSPORTATION', null, null, 'TOTAL', null, null],
    ['', ...Array(8).fill(null), ...Array(5).fill(['Revenues', 'Sales', 'Customers']).flat()]];
  const files = [
    { name: `Sales_Ult_Cust_${year}.xlsx`, data: workbook('States', [...titles, o.header ?? EXPECTED_HEADER, ...(o.rows ?? sampleRows(year)), ['To calculate a state or the US total, sum Parts (A,B,C & D) for Revenue.']]) },
    { name: `Reliability_${year}.xlsx`, data: workbook('Reliability_States', [['Utility Characteristics', ...Array(4).fill(null), 'IEEE Standard'], [null, ...Array(4).fill(null), 'With MED'], RELIABILITY_HEADER, ...(o.reliability ?? reliabilityRows(year)), ['MED = major event days']]) },
    { name: `Service_Territory_${year}.xlsx`, data: workbook('Counties_States', [o.territoryHeader ?? TERRITORY_HEADER, ...(o.territory ?? territoryRows(year))]) },
    { name: `Frame_${year}.xlsx`, data: 'x' },
  ];
  return writeZip(files.filter((f) => !(o.omit ?? []).some((p) => f.name.startsWith(p))));
}

/** The real table recipes with row bounds that suit these small workbooks. */
export const smallTables = (entry) => entry.tables.map((t) => ({ ...t, recipe: t.recipe.map((s) => (s.step === 'validate' ? { ...s, rows: { ...s.rows, min: 3, max: 100 } } : s)) }));
