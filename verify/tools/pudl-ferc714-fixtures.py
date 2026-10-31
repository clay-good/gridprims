# Writes two small Parquet files shaped like PUDL's FERC Form 714 tables, for
# the offline pipeline test (verify/tests/pipeline/pudl-ferc714.test.mjs).
# Dev-time only:
#   venv/bin/python -I verify/tools/pudl-ferc714-fixtures.py verify/fixtures/data/pudl-ferc714
import datetime, sys, pyarrow as pa, pyarrow.parquet as pq
out = sys.argv[1]
rows = []
def hours(rid, year, zone, values, flags=None):
    for h, v in enumerate(values):
        rows.append({'respondent_id_ferc714': rid, 'report_date': datetime.date(year, 1, 1), 'datetime_utc': datetime.datetime(year, 7, 1) + datetime.timedelta(hours=h),
                     'timezone': zone, 'demand_reported_mwh': v, 'demand_imputed_pudl_mwh_imputation_code': (flags or {}).get(h)})
hours(2, 2024, 'America/Chicago', [100.0, 140.5, 120.0])
hours(2, 2025, 'America/Chicago', [110.0, 900.0, 150.25, None], {1: 'global_outlier'})  # the spike is flagged; 150.25 is the peak
hours(55, 2025, 'America/New_York', [549.0, 300.0], {0: 'bad_year', 1: 'bad_year'})       # every hour flagged: no peak
hours(146, 2025, 'America/Chicago', [59000.0, 60662.09, 59048.93], {1: 'local_outlier_high', 0: None})
hourly = pa.table({
    'respondent_id_ferc714': pa.array([r['respondent_id_ferc714'] for r in rows], pa.int64()),
    'respondent_id_ferc714_csv': pa.array([None] * len(rows), pa.int64()),
    'respondent_id_ferc714_xbrl': pa.array([None] * len(rows), pa.string()),
    'report_date': pa.array([r['report_date'] for r in rows], pa.date32()),
    'datetime_utc': pa.array([r['datetime_utc'] for r in rows], pa.timestamp('us')),
    'timezone': pa.array([r['timezone'] for r in rows], pa.string()).dictionary_encode(),
    'demand_reported_mwh': pa.array([r['demand_reported_mwh'] for r in rows], pa.float64()),
    'demand_imputed_pudl_mwh': pa.array([r['demand_reported_mwh'] for r in rows], pa.float64()),
    'demand_imputed_pudl_mwh_imputation_code': pa.array([r['demand_imputed_pudl_mwh_imputation_code'] for r in rows], pa.string()).dictionary_encode(),
})
pq.write_table(hourly, f'{out}/hourly.parquet', compression='zstd', row_group_size=5)  # several row groups, as PUDL's file has
who = [(2024, 2, 'Alabama Power Company', 'utility', 195, None, 195, 1000.0), (2025, 2, 'Alabama Power Company', 'utility', 195, None, 195, 1100.0),
       (2025, 55, 'Electric Power Board of Chattanooga', 'utility', 3408, None, 3408, None), (2025, 146, 'Southwest Power Pool', 'balancing_authority', None, 'SWPP', 59504, 320413535.9),
       (2025, 999, 'Filed nothing hourly', 'utility', 1, None, 1, None)]
def respondents(who, name):
  pq.write_table(pa.table({
    'report_date': pa.array([datetime.date(y, 1, 1) for y, *_ in who], pa.date32()),
    'respondent_id_ferc714': pa.array([w[1] for w in who], pa.int64()),
    'demand_annual_mwh': pa.array([w[7] for w in who], pa.float64()),
    'eia_code': pa.array([w[6] for w in who], pa.int64()),
    'respondent_type': pa.array([w[3] for w in who], pa.string()),
    'respondent_name_ferc714': pa.array([w[2] for w in who], pa.string()),
    'balancing_authority_code_eia': pa.array([w[5] for w in who], pa.string()),
    'utility_id_eia': pa.array([w[4] for w in who], pa.int64()),
  }), f'{out}/{name}.parquet', compression='snappy')
respondents(who, 'respondents')
respondents([w for w in who if w[1] != 146], 'respondents-without-146')  # a crosswalk missing one respondent
print('ok', len(rows))
