// The standards template (add-overhead-line-checks: design standards): one
// row per rule id the line checks read, in plain words, with the NESC rule or
// table number that sets it and the value left blank. gridprims ships no NESC
// value: IEEE owns and sells that standard, so only its rule and table
// numbers appear, and the numbers come from the user's own copy or their
// utility's standards. The CSV and the Excel workbook are written from this
// one list, so they cannot drift apart.

export const COLUMNS = ['rule_id', 'applies_to', 'value', 'unit', 'source_document', 'source_locator', 'note'];

/** Every supported rule: its id, what a filled value means, and where the NESC sets it. */
export const TEMPLATE_ROWS = [
  { id: 'sep.primary.comm', appliesTo: '0-8.7kV', note: 'Separation on the pole from a primary supply conductor down to the communication line below it. One row per voltage range; write the range in applies_to.', nesc: 'NESC Table 235-5' },
  { id: 'sep.neutral.comm', appliesTo: '', note: 'Separation on the pole from the neutral down to the communication line below it.', nesc: 'NESC Table 235-5' },
  { id: 'sep.secondary.comm', appliesTo: '', note: 'Separation on the pole from a secondary or service drop down to the communication line below it.', nesc: 'NESC Table 235-5' },
  { id: 'sep.streetlight.comm', appliesTo: '', note: 'Separation on the pole from a streetlight bracket or drip loop down to the communication line.', nesc: 'NESC Table 235-5' },
  { id: 'sep.transformer.comm', appliesTo: '', note: 'Separation on the pole from the lowest point of a transformer tank down to the communication line.', nesc: 'NESC Rule 238' },
  { id: 'sep.comm.comm', appliesTo: '', note: 'Separation between two communication lines on the pole.', nesc: 'NESC Table 235-5' },
  { id: 'sep.midspan.neutral.comm', appliesTo: '', note: 'Separation at midspan from the neutral to the communication line, where it differs from the pole value.', nesc: 'NESC Rule 235' },
  { id: 'sep.midspan.secondary.comm', appliesTo: '', note: 'Separation at midspan from a secondary to the communication line.', nesc: 'NESC Rule 235' },
  { id: 'sep.midspan.comm.comm', appliesTo: '', note: 'Separation at midspan between two communication lines.', nesc: 'NESC Rule 235' },
  { id: 'ground.pole.comm', appliesTo: '', note: 'Lowest height above the ground line at which a communication line may attach to the pole.', nesc: 'NESC Table 232-1' },
  { id: 'ground.road.comm', appliesTo: '', note: 'Clearance a communication line must keep above a road.', nesc: 'NESC Table 232-1' },
  { id: 'ground.driveway.comm', appliesTo: '', note: 'Clearance above a driveway or an area vehicles can cross.', nesc: 'NESC Table 232-1' },
  { id: 'ground.pedestrian.comm', appliesTo: '', note: 'Clearance above an area only people on foot can reach.', nesc: 'NESC Table 232-1' },
  { id: 'ground.rail.comm', appliesTo: '', note: 'Clearance above railroad tracks.', nesc: 'NESC Table 232-1' },
  { id: 'pole.length-step', appliesTo: '', note: 'The step between the pole lengths your standards stock, used to size a replacement.', nesc: 'not in the NESC; your own standard' },
  { id: 'pole.setting-depth.fraction', appliesTo: '', note: 'The share of a pole\'s length that goes in the ground, as 0.1 or 10%. Industry custom, with no public source.', nesc: 'not in the NESC; your own standard' },
  { id: 'pole.setting-depth.add', appliesTo: '', note: 'The length added to that share, such as 2 ft.', nesc: 'not in the NESC; your own standard' },
  { id: 'place.preference', appliesTo: '', note: 'Where a new line should go in the communication space: highest, lowest, or nearest-existing.', nesc: 'not in the NESC; your own standard' },
];

/** The rule ids the template carries, for the build to compare with the ids the checks read. */
export const TEMPLATE_IDS = TEMPLATE_ROWS.map((r) => r.id);

/** One row as the template's seven cells, with the value and unit blank for the user to fill. */
export const templateCells = (r) => [r.id, r.appliesTo, '', '', '', r.nesc, r.note];

const quote = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** The template as CSV. */
export const templateCsv = () => [COLUMNS.join(','), ...TEMPLATE_ROWS.map((r) => templateCells(r).map(quote).join(','))].join('\n') + '\n';

/** The template's rows as a sheet: the header, then one row per rule. */
export const templateSheet = () => [COLUMNS, ...TEMPLATE_ROWS.map(templateCells)];
