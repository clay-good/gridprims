// Normalize the Census 2020 ZCTA-to-county relationship file
// (tab20_zcta520_county20_natl.txt, pipe-delimited) into one row per ZCTA and
// county that share land (add-public-grid-data: utility lookup). Rows with a
// blank ZCTA (county parts outside every ZCTA) and rows that share only water
// are dropped, as the lookup spec says. Each row carries its share of the
// ZCTA's land, so a ZIP that spans counties can list them in order.

export const EXPECTED_HEADER = ['OID_ZCTA5_20', 'GEOID_ZCTA5_20', 'NAMELSAD_ZCTA5_20', 'AREALAND_ZCTA5_20', 'AREAWATER_ZCTA5_20', 'MTFCC_ZCTA5_20', 'CLASSFP_ZCTA5_20', 'FUNCSTAT_ZCTA5_20',
  'OID_COUNTY_20', 'GEOID_COUNTY_20', 'NAMELSAD_COUNTY_20', 'AREALAND_COUNTY_20', 'AREAWATER_COUNTY_20', 'MTFCC_COUNTY_20', 'CLASSFP_COUNTY_20', 'FUNCSTAT_COUNTY_20', 'AREALAND_PART', 'AREAWATER_PART'];

export const SCHEMA = [
  { name: 'zcta', type: 'str' }, { name: 'county_fips', type: 'str' }, { name: 'county_name', type: 'str' }, { name: 'state', type: 'str' }, { name: 'state_fips', type: 'str' },
  { name: 'land_part_m2', type: 'f64', unit: 'square meters' }, { name: 'zcta_land_m2', type: 'f64', unit: 'square meters' },
  { name: 'share_of_zcta_land', type: 'f64', unit: 'fraction' },
];

/** USPS codes by state FIPS code, the 50 states, DC, and the territories the file covers. */
const STATES = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR', '78': 'VI',
};

/** @param {string[][]} rows the file's rows, its header first */
export function normalize(rows) {
  const problems = [];
  const header = rows[0] ?? [];
  EXPECTED_HEADER.forEach((h, i) => { if (header[i] !== h) problems.push(`column ${i + 1} is "${header[i]}", expected "${h}"`); });
  if (problems.length) return { rows: [], problems };
  const out = [];
  for (const r of rows.slice(1)) {
    if (r.length === 1 && r[0] === '') continue; // the blank last line
    const [, zcta, , zctaLand, , , , , , county, countyName, , , , , , landPart] = r;
    if (!zcta || Number(landPart) === 0) continue;
    const st = STATES[county.slice(0, 2)];
    if (!/^\d{5}$/.test(zcta) || !/^\d{5}$/.test(county) || !st) { problems.push(`ZCTA "${zcta}", county "${county}" is not a five-digit pair in a known state`); continue; }
    out.push({
      zcta, county_fips: county, county_name: countyName, state: st, state_fips: county.slice(0, 2),
      land_part_m2: Number(landPart), zcta_land_m2: Number(zctaLand), share_of_zcta_land: Number((Number(landPart) / Number(zctaLand)).toFixed(6)),
    });
  }
  return { rows: out, problems };
}
