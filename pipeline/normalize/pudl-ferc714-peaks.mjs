// Annual peak demand per FERC Form 714 respondent, from PUDL's hourly
// planning-area demand, with PUDL's respondent-to-EIA crosswalk for each
// year (add-public-grid-data: utility pages, "Annual peak"). The peak is the
// highest reported hour PUDL did not flag as anomalous; the unfiltered
// maximum and the flagged-hour count are kept beside it, so a page can say
// when the two differ. A year whose every hour PUDL flags has no peak.

export const SCHEMA = [
  { name: 'year', type: 'f64' }, { name: 'respondent_id_ferc714', type: 'f64' }, { name: 'respondent_name', type: 'str' },
  { name: 'respondent_type', type: 'str' }, { name: 'utility_id_eia', type: 'f64' }, { name: 'balancing_authority_code_eia', type: 'str' },
  { name: 'eia_code', type: 'f64' },
  { name: 'peak_mw', type: 'f64', unit: 'MW' }, { name: 'peak_hour_utc', type: 'str' }, { name: 'timezone', type: 'str' },
  { name: 'reported_max_mw', type: 'f64', unit: 'MW' }, { name: 'hours_reported', type: 'f64', unit: 'hours' }, { name: 'hours_flagged', type: 'f64', unit: 'hours' },
  { name: 'demand_annual_mwh', type: 'f64', unit: 'MWh' },
];

const HOURLY = ['respondent_id_ferc714', 'report_date', 'datetime_utc', 'timezone', 'demand_reported_mwh', 'demand_imputed_pudl_mwh_imputation_code'];
const SUMMARY = ['report_date', 'respondent_id_ferc714', 'respondent_name_ferc714', 'respondent_type', 'utility_id_eia', 'balancing_authority_code_eia', 'eia_code', 'demand_annual_mwh'];

/** @param {{hourly: ReturnType<typeof import('../../parsers/parquet.mjs').readParquet>, respondents: any}} files */
export function normalize({ hourly, respondents }) {
  const problems = [];
  for (const [file, want] of [['hourly', HOURLY], ['respondents', SUMMARY]]) {
    const have = ({ hourly, respondents })[file].columns.map((c) => c.name);
    for (const c of want) if (!have.includes(c)) problems.push(`${file} has no column ${c}`);
  }
  if (problems.length) return { rows: [], problems };

  /** respondent|year -> running peak. Hourly demand in MWh over one hour is the hour's average MW. */
  const peaks = new Map();
  for (let g = 0; g < hourly.rowGroups; g++) {
    const [id, day, at, zone, mwh, flag] = HOURLY.map((c) => hourly.column(c, { rowGroup: g, raw: true }));
    for (let i = 0; i < id.length; i++) {
      const year = new Date(day[i] * 86_400_000).getUTCFullYear();
      const key = `${id[i]}|${year}`;
      let p = peaks.get(key);
      if (!p) peaks.set(key, (p = { id: id[i], year, zone: zone[i], max: null, peak: null, peakAt: null, reported: 0, flagged: 0 }));
      if (mwh[i] === null) continue;
      p.reported++;
      if (p.max === null || mwh[i] > p.max) p.max = mwh[i];
      if (flag[i] !== null) { p.flagged++; continue; }
      if (p.peak === null || mwh[i] > p.peak) { p.peak = mwh[i]; p.peakAt = at[i]; }
    }
  }
  const who = new Map(respondents.rows(SUMMARY).map((r) => [`${r.respondent_id_ferc714}|${r.report_date.slice(0, 4)}`, r]));
  const rows = [...peaks.values()].sort((a, b) => a.year - b.year || a.id - b.id).map((p) => {
    const r = who.get(`${p.id}|${p.year}`);
    if (!r) problems.push(`respondent ${p.id} has ${p.year} hours but no crosswalk row`);
    return {
      year: p.year, respondent_id_ferc714: p.id, respondent_name: r?.respondent_name_ferc714 ?? null, respondent_type: r?.respondent_type ?? null,
      utility_id_eia: r?.utility_id_eia ?? null, balancing_authority_code_eia: r?.balancing_authority_code_eia ?? null, eia_code: r?.eia_code ?? null,
      peak_mw: p.peak, peak_hour_utc: p.peakAt === null ? null : new Date(p.peakAt / 1000).toISOString().slice(0, 19) + 'Z', timezone: p.zone,
      reported_max_mw: p.max, hours_reported: p.reported, hours_flagged: p.flagged, demand_annual_mwh: r?.demand_annual_mwh ?? null,
    };
  });
  const years = rows.map((r) => r.year);
  return { rows, problems, dataPeriod: `${Math.min(...years)}-${Math.max(...years)}` };
}
