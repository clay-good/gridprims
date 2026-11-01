// California General Order 95's clearances the lines tools use, as curated
// facts (add-overhead-line-checks D3): Table 1 (Rule 37, ground clearances)
// Cases 1, 3, 4, and 5 in Columns B and E, and Table 2 (Rule 38, wire-to-wire
// clearances) Case 8 in Columns C to E. GO 95 is law the CPUC wrote, so its
// values may be shown in full. One legal issuer sets each value, so fields
// are not disputable; each carries the footnote letters on its cell, shown on
// every result that uses it as exceptions not checked.

const T1 = { type: 'regulator', publisher: 'California Public Utilities Commission', url: 'https://ia.cpuc.ca.gov/gos/go95/go_95_table_1.html', retrieved: '2026-11-01', capture: 'data/curated/captures/go95/table-1.txt', sha256: 'd1d88d2f493a9dbea3f5d5457c18d4c7a8a0c68ab17298d1087aff571b17dcec' };
const T2 = { type: 'regulator', publisher: 'California Public Utilities Commission', url: 'https://ia.cpuc.ca.gov/gos/go95/go_95_table_2.html', retrieved: '2026-11-01', capture: 'data/curated/captures/go95/table-2.txt', sha256: 'fdc18e7b768107137c50ae29109c0f3dd8ac03099064dcf20bf9724c43fe6b20' };

/** A cell: its value in feet, the footnote letters on it, and where it is. */
const cell = (table, cs, col, ft, footnotes, what) => ({ value: { ft, footnotes }, disputable: false, label: `Table ${table}, Case ${cs}, Column ${col}`, what, sources: [{ ...(table === 1 ? T1 : T2), locator: `Table ${table}, Case ${cs}, Column ${col}` }] });

export default {
  id: 'go95-clearances', kind: 'go95', lastChecked: '2026-11-01',
  contributor: { name: 'gridprims', conflict: 'none' },
  lastRevised: { table1: 'D.17-12-024', table2: 'D.09-08-029' },
  fields: {
    'ground.rail.comm': cell(1, 1, 'B', 25, ['a', 'b', 'c', 'd'], 'communication conductors crossing above railroad tracks without overhead contact wires'),
    'ground.road.comm': cell(1, 3, 'B', 18, ['c', 'd', 'j', 'l', 'm', 'ii', 'kkk'], 'communication conductors crossing or along thoroughfares in urban districts, or crossing thoroughfares in rural districts'),
    'ground.driveway.comm': cell(1, 4, 'B', 15, ['m', 'n', 'p'], 'communication conductors along rural thoroughfares or across other areas vehicles can cross'),
    'ground.pedestrian.comm': cell(1, 5, 'B', 10, ['m', 'q'], 'communication conductors above areas accessible to pedestrians only'),
    'ground.road.primary': cell(1, 3, 'E', 25, ['c', 'd', 'o', 'ii'], 'supply conductors of 750 to 22,500 volts crossing or along thoroughfares'),
    'ground.driveway.primary': cell(1, 4, 'E', 25, ['o'], 'supply conductors of 750 to 22,500 volts above areas vehicles can cross'),
    'ground.pedestrian.primary': cell(1, 5, 'E', 17, [], 'supply conductors of 750 to 22,500 volts above areas accessible to pedestrians only'),
    'sep.comm.comm': cell(2, 8, 'C', 1, ['j', 'rr'], 'communication conductors above or below communication conductors, on the same pole and in adjoining midspans'),
    'sep.secondary.comm': cell(2, 8, 'D', 4, ['k', 'l', 'm', 'n', 'pp'], 'communication conductors and supply conductors of 0 to 750 volts, on the same pole and in adjoining midspans'),
    'sep.primary.comm': cell(2, 8, 'E', 4, ['k'], 'communication conductors and supply conductors of 750 to 7,500 volts, on the same pole and in adjoining midspans'),
  },
};
