// EIA-861 net metering by utility, 2021 to 2025: capacity, installations,
// energy sold back, virtual and battery figures by technology and sector.

import { SCHEMA, longRows, sectorOf } from './eia-861-dg-common.mjs';

export { SCHEMA };

export async function normalize(input) {
  const rows = [];
  const problems = [];
  for (const [year, sheet] of Object.entries(input)) {
    const r = longRows(sheet, (group, measure, field) => ({ technology: group, measure: measure || field, sector: sectorOf(field) }));
    if (r.problem) { problems.push(`${year}: ${r.problem}`); continue; }
    for (const x of r.rows) rows.push(x);
  }
  return { rows, problems };
}
