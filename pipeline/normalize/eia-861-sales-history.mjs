// EIA-861 sales over several years (add-public-grid-data: utility pages,
// "Trends and comparisons"): the sales or delivery sheet of each year's zip,
// normalized exactly as the current year's (eia-861-sales), stacked, with the
// data year in the key. The header must be the same every year.

import { SCHEMA, normalize as normalizeYear } from './eia-861-sales.mjs';

export { SCHEMA };

/** @param {Record<string, any[][]>} byYear rows of one sheet, by year @param {number} headerRows */
export function normalize(byYear, headerRows) {
  const rows = [];
  const problems = [];
  for (const [year, sheet] of Object.entries(byYear).sort()) {
    const r = normalizeYear(sheet, headerRows);
    problems.push(...r.problems.map((p) => `${year}: ${p}`));
    const wrong = r.rows.filter((x) => String(x.data_year) !== year).length;
    if (wrong) problems.push(`${year}: ${wrong} rows say another data year`);
    rows.push(...r.rows);
  }
  const years = Object.keys(byYear).sort();
  return { rows, problems, dataPeriod: `${years[0]}-${years.at(-1)}` };
}
