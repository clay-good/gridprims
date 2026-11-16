// The sample standards file and sample pole list for the lines tools
// (add-overhead-line-checks: design standards, "Sample files"), for a fictional
// Example Electric Co-op. Every sample rule is an example value copied from one
// captured public utility document, Clark Public Utilities' Construction
// Standards Section 1910, with the passage that gives it; the pole heights are
// made up and say so. No row gives the lowest attachment height on the pole:
// no public joint-use standard we found states one.

import { COLUMNS } from './standards-template.mjs';

export const SAMPLE_SOURCE = 'Sample: Example Electric Co-op';
export const SAMPLE_DOCUMENT = { name: 'Clark Public Utilities Construction Standards Section 1910', url: 'https://www.clarkpublicutilities.com/wp-content/uploads/2018/02/1910-Joint-Use.pdf', capture: 'data/curated/captures/lines/clark-1910-joint-use.txt', sha256: 'e951ed8f1ae6d24bf99d53f5bb27c1148761aed51324719a5b3088b0b2f107b9' };

/** Each sample rule, where the document gives it, and the words that give it (found in the capture). */
export const SAMPLE_RULES = [
  { id: 'sep.neutral.comm', value: '40', unit: 'in', locator: 'JU2 §4.1 (PDF p. 6)', quote: 'A minimum clearance of 40 inches must be maintained between the bottom of the supply space and the top of the communication space.' },
  { id: 'sep.secondary.comm', value: '40', unit: 'in', locator: 'JU2 §4.1 (PDF p. 6)', quote: 'neutral and secondary clevises, bare and insulated secondary wires' },
  { id: 'sep.comm.comm', value: '12', unit: 'in', locator: 'JU1 typical pole details (PDF p. 2)', quote: 'CPU FIBER; 12"; MISC. COMMUNICATIONS/FIBER; 12"; CATV; 12"; TELEPHONE' },
  { id: 'ground.road.comm', value: '18', unit: 'ft', locator: 'JU1 typical pole details (PDF p. 2)', quote: '18\' Min. to Street Surface' },
  { id: 'sep.midspan.neutral.comm', value: '30', unit: 'in', locator: 'JU2 §4.2 (PDF p. 7)', quote: 'cannot be less than 30 inches from effectively grounded neutral conductors' },
];

/** The sample standards file: the template's columns, a sample label on every value, and the document it cites. */
export function sampleStandardsCsv() {
  const rows = SAMPLE_RULES.map((r) => [r.id, '', r.value, r.unit, `${SAMPLE_SOURCE} (example value from ${SAMPLE_DOCUMENT.name})`, r.locator, `Example value. Cited: ${SAMPLE_DOCUMENT.url}`]);
  return [COLUMNS.join(','), ...rows.map((r) => r.join(',')), 'note: no public source gives the lowest attachment height on the pole (ground.pole.comm); add a row from your own standards'].join('\n') + '\n';
}

/** The sample pole list: three made-up poles, each row marked as example values. */
export function samplePolesCsv() {
  const note = 'Example values: a made-up pole';
  return [
    'pole_id,owner,kind,height,note,pole_length',
    `EX-1,Example Electric Co-op,neutral,30 ft 2 in,${note},40 ft`,
    `EX-1,Example Cable,catv,24 ft 0 in,${note},`,
    `EX-1,Example Phone,telephone,23 ft 0 in,${note},`,
    `EX-2,Example Electric Co-op,neutral,26 ft 0 in,${note},35 ft`,
    `EX-2,Example Phone,telephone,20 ft 4 in,${note},`,
    `EX-3,Example Electric Co-op,secondary,22 ft 6 in,${note},35 ft`,
    `EX-3,Example Cable,catv,19 ft 0 in,${note},`,
  ].join('\n') + '\n';
}
