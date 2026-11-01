// EIA-861 distributed generation that is not net metered, by utility, 2021 to
// 2025: generator counts and capacity, and capacity by technology and sector.
// The technology groups carry their unit ("Photovoltaic (MW)"); it moves to
// the measure so the technology keeps the survey's name.

import { SCHEMA, longRows, sectorOf } from './eia-861-dg-common.mjs';

export { SCHEMA };

export async function normalize(input) {
  const rows = [];
  const problems = [];
  for (const [year, sheet] of Object.entries(input)) {
    const r = longRows(sheet, (group, _measure, field) => {
      if (/^Number and Capacity/i.test(group)) return { technology: 'All', measure: field, sector: 'Total' };
      const unit = /\(MWh\)/i.test(group) ? 'Energy capacity MWh' : 'Capacity MW';
      return { technology: group.replace(/\s*\((MW|MWh)\)\s*$/i, '').trim(), measure: unit, sector: sectorOf(field) };
    });
    if (r.problem) { problems.push(`${year}: ${r.problem}`); continue; }
    for (const x of r.rows) rows.push(x);
  }
  return { rows, problems };
}
