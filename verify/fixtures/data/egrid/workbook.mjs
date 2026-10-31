// Small workbooks shaped like eGRID's data file (PLNT23 and SRL23: a row of
// long names, then a row of codes, "--" for not available, coordinates) and
// Power Profiler's Zip-subregion sheet (a ZIP stored as a number, trailing
// blank rows), for offline pipeline tests.

import { writeXlsx } from '../../../lib/zip-writer.mjs';
import { COLUMNS as PLANT } from '../../../../pipeline/normalize/egrid-plants.mjs';
import { COLUMNS as SUB } from '../../../../pipeline/normalize/egrid-subregions.mjs';

/** A sheet whose code row holds the codes we read plus the coordinates and an unread column, in EPA's mixed order. */
const sheet = (columns, rows) => {
  const codes = ['SEQ', ...columns.map(([, c]) => c), 'LAT', 'LON', 'UNREAD'];
  return [codes.map((c) => `Long name of ${c}`), codes, ...rows.map((r, i) => codes.map((c) => (c === 'SEQ' ? i + 1 : c in r ? r[c] : c === 'LAT' ? 31.7569 : c === 'LON' ? -106.375 : null)))];
};
export const plants = () => [
  { ORISPL: 57053, PNAME: 'Alakanuk', PSTATABB: 'AK', CNTYNAME: 'Kusilvak', FIPSST: '02', YEAR: 2023, SUBRGN: 'AKMS', SRNAME: 'ASCC Miscellaneous', BACODE: 'NA - AK', PLPRMFL: 'DFO', PLFUELCT: 'OIL', NAMEPCAP: 0.8, CAPFAC: 0, PLNGENAN: 0, PLCO2AN: null, PLCO2RTA: '--' },
  { ORISPL: 3470, PNAME: 'W A Parish', PSTATABB: 'TX', CNTYNAME: 'Fort Bend', FIPSST: '48', FIPSCNTY: '157', YEAR: 2023, SUBRGN: 'ERCT', SRNAME: 'ERCOT All', BACODE: 'ERCO', NERC: 'TRE', PLPRMFL: 'SUB', PLFUELCT: 'COAL', NAMEPCAP: 3969.4, CAPFAC: 0.45, PLNGENAN: 15000000, PLCO2AN: 14000000.5, PLCO2EQA: 14100000, PLCO2RTA: 1866.67 },
  { ORISPL: 6101, PNAME: 'Wyodak', PSTATABB: 'WY', CNTYNAME: 'Campbell', FIPSST: '56', FIPSCNTY: '005', YEAR: 2023, SUBRGN: 'NWPP', SRNAME: 'WECC Northwest', PLPRMFL: 'SUB', NAMEPCAP: 362.1, PLNGENAN: 2000000, PLCO2AN: 2300000, PLCO2RTA: 2300 },
];
export const subregions = () => [
  { SUBRGN: 'AKGD', SRNAME: 'ASCC Alaska Grid', YEAR: 2023, SRNAMEPCAP: 2194, SRCO2RTA: 899.633, SRNBCO2: 1077.571, SRCO2EQA: 2306612.447 },
  { SUBRGN: 'ERCT', SRNAME: 'ERCOT All', YEAR: 2023, SRNAMEPCAP: 145507.7, SRCO2RTA: 733.862, SRC2ERTA: 736.629, SRNBCO2: 1242.733, SRNBC2E: 1247.524 },
  { SUBRGN: 'HIMS', SRNAME: 'HICC Miscellaneous', YEAR: 2023, SRCO2RTA: 1155.5, SRNBCO2: '--' },
];
export const zipRows = () => [['00001', 'AKMS', null, null], ['00002', 'AKMS', '', ''], [501, 'NYLI', null, null], ['30525', 'SRTV', 'SRSO', 'SRVC'], ['78701', 'ERCT', null, null], ['82716', 'NWPP', 'RMPA', null]];

/** @param {{plants?: object[], subregions?: object[], zips?: any[][], zipHeader?: string[]}} [o] */
export function egridFiles(o = {}) {
  return {
    data: writeXlsx({ Contents: [['eGRID2023']], PLNT23: sheet(PLANT, o.plants ?? plants()), SRL23: sheet(SUB, o.subregions ?? subregions()) }),
    zips: writeXlsx({ Introduction: [['Power Profiler']], 'Zip-subregion': [[...(o.zipHeader ?? ['zip', 'Subregion 1', 'Subregion 2', 'Subregion 3']), null, null], ...(o.zips ?? zipRows()), [null, null, null, null]] }),
  };
}
