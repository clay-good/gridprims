// Ten utility-workbook shapes for the .xlsx reader (foundation task 4.3), built
// from the part layouts Excel and other common generators write. Each entry
// lists its parts and the rows the reader must return.

import { writeZip } from '../../lib/zip-writer.mjs';

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>';

const workbook = (sheets, pr = '') => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook ${NS}>${pr}<sheets>${sheets.map((s, i) => `<sheet name="${s}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
const rels = (targets) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${targets.map((t, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${t}"/>`).join('')}</Relationships>`;
const sheet = (rows) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet ${NS}><sheetData>${rows}</sheetData></worksheet>`;
const sst = (strings) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst ${NS} count="${strings.length}" uniqueCount="${strings.length}">${strings.map((s) => (s.startsWith('<') ? `<si>${s}</si>` : `<si><t>${s}</t></si>`)).join('')}</sst>`;
const styles = (numFmts, xfs) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet ${NS}>${numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.map(([id, code]) => `<numFmt numFmtId="${id}" formatCode="${code}"/>`).join('')}</numFmts>` : ''}<cellStyleXfs count="1"><xf numFmtId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.map((id) => `<xf numFmtId="${id}" applyNumberFormat="1"/>`).join('')}</cellXfs></styleSheet>`;

const base = (parts, opts = {}) => writeZip([
  { name: '[Content_Types].xml', data: CT, ...opts },
  ...Object.entries(parts).map(([name, data]) => ({ name, data, ...opts })),
]);

const n = (v, d = false) => ({ value: v, type: 'n', date: d });
const s = (v) => ({ value: v, type: 's', date: false });

export const WORKBOOKS = [
  {
    id: 'interval-shared-strings',
    note: 'Typical utility interval export: shared-string header, date and time text, kWh numbers',
    bytes: () => base({
      'xl/workbook.xml': workbook(['Usage']),
      'xl/_rels/workbook.xml.rels': rels(['worksheets/sheet1.xml']),
      'xl/sharedStrings.xml': sst(['Date', 'Start Time', 'kWh', '2026-01-01', '00:00', '00:15']),
      'xl/worksheets/sheet1.xml': sheet('<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2" t="s"><v>4</v></c><c r="C2"><v>1.25</v></c></row><row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3" t="s"><v>5</v></c><c r="C3"><v>0.875</v></c></row>'),
    }),
    rows: [[s('Date'), s('Start Time'), s('kWh')], [s('2026-01-01'), s('00:00'), n(1.25)], [s('2026-01-01'), s('00:15'), n(0.875)]],
  },
  {
    id: 'inline-strings',
    note: 'Generators that write inline strings instead of a shared-string table',
    bytes: () => base({
      'xl/workbook.xml': workbook(['Sheet1']),
      'xl/_rels/workbook.xml.rels': rels(['worksheets/sheet1.xml']),
      'xl/worksheets/sheet1.xml': sheet('<row r="1"><c r="A1" t="inlineStr"><is><t>Meter</t></is></c><c r="B1" t="inlineStr"><is><t>kW</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>A-100</t></is></c><c r="B2"><v>42</v></c></row>'),
    }),
    rows: [[s('Meter'), s('kW')], [s('A-100'), n(42)]],
  },
  {
    id: 'builtin-datetime',
    note: 'One date-time column with built-in format 22 (m/d/yyyy h:mm)',
    bytes: () => base({
      'xl/workbook.xml': workbook(['Data']),
      'xl/_rels/workbook.xml.rels': rels(['worksheets/sheet1.xml']),
      'xl/styles.xml': styles([], [0, 22]),
      'xl/worksheets/sheet1.xml': sheet('<row r="1"><c r="A1" t="inlineStr"><is><t>Interval</t></is></c><c r="B1" t="inlineStr"><is><t>Usage</t></is></c></row><row r="2"><c r="A2" s="1"><v>46023.010416666664</v></c><c r="B2"><v>2.5</v></c></row>'),
    }),
    rows: [[s('Interval'), s('Usage')], [n(46023.010416666664, true), n(2.5)]],
  },
  {
    id: 'custom-date-format',
    note: 'A custom number format "yyyy-mm-dd hh:mm" with quoted text and a color, plus a non-date custom format',
    bytes: () => base({
      'xl/workbook.xml': workbook(['Data']),
      'xl/_rels/workbook.xml.rels': rels(['worksheets/sheet1.xml']),
      'xl/styles.xml': styles([[164, '[Blue]yyyy\\-mm\\-dd hh:mm'], [165, '0.00&quot; kWh&quot;']], [0, 164, 165]),
      'xl/worksheets/sheet1.xml': sheet('<row r="1"><c r="A1" s="1"><v>46023.5</v></c><c r="B1" s="2"><v>3.14</v></c></row>'),
    }),
    rows: [[n(46023.5, true), n(3.14)]],
  },
  {
    id: 'formulas-cached',
    note: 'Formulas: cached numbers and strings are read, a formula with no cached value reads as empty, nothing is evaluated',
    bytes: () => base({
      'xl/workbook.xml': workbook(['Bill']),
      'xl/_rels/workbook.xml.rels': rels(['worksheets/sheet1.xml']),
      'xl/worksheets/sheet1.xml': sheet('<row r="1"><c r="A1"><v>10</v></c><c r="B1"><v>20</v></c><c r="C1"><f>SUM(A1:B1)</f><v>30</v></c><c r="D1" t="str"><f>"total"</f><v>total</v></c><c r="E1"><f>WEBSERVICE("http://x.example")</f></c></row>'),
    }),
    rows: [[n(10), n(20), n(30), s('total'), null]],
  },
  {
    id: 'first-sheet-by-order',
    note: 'The first sheet in workbook order lives in sheet3.xml; the reader follows the relationship, not the file name',
    bytes: () => base({
      'xl/workbook.xml': workbook(['Summary', 'Intervals']),
      'xl/_rels/workbook.xml.rels': rels(['worksheets/sheet3.xml', 'worksheets/sheet1.xml']),
      'xl/worksheets/sheet3.xml': sheet('<row r="1"><c r="A1" t="inlineStr"><is><t>summary</t></is></c></row>'),
      'xl/worksheets/sheet1.xml': sheet('<row r="1"><c r="A1" t="inlineStr"><is><t>intervals</t></is></c></row>'),
    }),
    rows: [[s('summary')]],
    second: [[s('intervals')]],
  },
  {
    id: 'sparse-and-unreferenced',
    note: 'Skipped rows and columns, and a writer that omits cell references',
    bytes: () => base({
      'xl/workbook.xml': workbook(['S']),
      'xl/_rels/workbook.xml.rels': rels(['worksheets/sheet1.xml']),
      'xl/worksheets/sheet1.xml': sheet('<row r="1"><c r="A1"><v>1</v></c><c r="D1"><v>4</v></c></row><row r="3"><c r="B3"><v>2</v></c></row><row><c><v>7</v></c><c><v>8</v></c></row>'),
    }),
    rows: [[n(1), null, null, n(4)], [], [null, n(2)], [n(7), n(8)]],
  },
  {
    id: 'stored-with-descriptors',
    note: 'Uncompressed entries and entries whose sizes follow the data (data descriptors)',
    bytes: () => writeZip([
      { name: '[Content_Types].xml', data: CT, store: true },
      { name: 'xl/workbook.xml', data: workbook(['S']), store: true },
      { name: 'xl/_rels/workbook.xml.rels', data: rels(['worksheets/sheet1.xml']), descriptor: true },
      { name: 'xl/worksheets/sheet1.xml', data: sheet('<row r="1"><c r="A1"><v>5.5</v></c></row>'), descriptor: true },
    ]),
    rows: [[n(5.5)]],
  },
  {
    id: 'date1904',
    note: 'A workbook saved with the 1904 date system (older Mac Excel)',
    bytes: () => base({
      'xl/workbook.xml': workbook(['S'], '<workbookPr date1904="1"/>'),
      'xl/_rels/workbook.xml.rels': rels(['worksheets/sheet1.xml']),
      'xl/styles.xml': styles([], [0, 14]),
      'xl/worksheets/sheet1.xml': sheet('<row r="1"><c r="A1" s="1"><v>44561</v></c></row>'),
    }),
    rows: [[n(44561, true)]],
    date1904: true,
  },
  {
    id: 'booleans-errors-rich-text',
    note: 'Booleans, an error value, rich-text and phonetic shared strings, escaped control characters, and entities',
    bytes: () => base({
      'xl/workbook.xml': workbook(['S']),
      'xl/_rels/workbook.xml.rels': rels(['worksheets/sheet1.xml']),
      'xl/sharedStrings.xml': sst(['<r><t>Peak </t></r><r><rPr><b/></rPr><t xml:space="preserve">kW</t></r><rPh><t>x</t></rPh>', 'AT&amp;T line_x000D_two']),
      'xl/externalLinks/externalLink1.xml': '<externalLink><externalBook r:id="rId1"/></externalLink>',
      'xl/worksheets/sheet1.xml': sheet('<row r="1"><c r="A1" t="b"><v>1</v></c><c r="B1" t="b"><v>0</v></c><c r="C1" t="e"><v>#N/A</v></c><c r="D1" t="s"><v>0</v></c><c r="E1" t="s"><v>1</v></c></row>'),
    }),
    rows: [[{ value: true, type: 'b', date: false }, { value: false, type: 'b', date: false }, { value: '#N/A', type: 'e', date: false }, s('Peak kW'), s('AT&T line\rtwo')]],
  },
];
