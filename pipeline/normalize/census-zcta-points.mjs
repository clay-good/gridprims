// The Census 2020 Gazetteer ZCTA file (tab-delimited, a padded last column):
// each ZCTA's internal point and land area.

export const SCHEMA = [
  { name: 'zcta', type: 'str' },
  { name: 'lat', type: 'f64', unit: 'degrees north, internal point' }, { name: 'lon', type: 'f64', unit: 'degrees east, internal point' },
  { name: 'land_m2', type: 'f64', unit: 'm²' },
];
const EXPECTED = ['GEOID', 'ALAND', 'AWATER', 'ALAND_SQMI', 'AWATER_SQMI', 'INTPTLAT', 'INTPTLONG'];

export async function normalize(rows) {
  const head = (rows[0] ?? []).map((h) => String(h).trim());
  if (EXPECTED.some((h, i) => head[i] !== h)) return { rows: [], problems: [`header is ${JSON.stringify(head.join(','))}, not ${EXPECTED.join(',')}`] };
  const out = rows.slice(1).filter((r) => r.length >= 7).map((r) => ({ zcta: String(r[0]).trim(), lat: Number(r[5]), lon: Number(String(r[6]).trim()), land_m2: Number(r[1]) }));
  const bad = out.filter((r) => !/^\d{5}$/.test(r.zcta) || !Number.isFinite(r.lat) || !Number.isFinite(r.lon));
  return { rows: out, problems: bad.length ? [`${bad.length} rows without a five-digit ZCTA or a point`] : [] };
}
