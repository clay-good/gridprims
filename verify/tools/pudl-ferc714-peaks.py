# Computes ten sampled FERC Form 714 annual peaks from PUDL's hourly table with
# pyarrow, independent of gridprims code (add-public-grid-data task 1.3: "10
# sampled Form 714 peaks match PUDL"). The rule is the registry's: the highest
# reported hour PUDL did not flag. Dev-time only:
#   venv/bin/python -I verify/tools/pudl-ferc714-peaks.py <out_ferc714__hourly_planning_area_demand.parquet> > verify/reference/pudl-v2026.10.0-ferc714-peaks.json
import hashlib, json, sys, pyarrow.parquet as pq, pyarrow.compute as pc
path = sys.argv[1]
SAMPLE = [(2, 2025), (146, 2025), (91, 2025), (1, 2006), (64, 2012), (90, 2016), (125, 2019), (156, 2021), (19, 2010), (91, 2023)]
t = pq.read_table(path, columns=['respondent_id_ferc714', 'report_date', 'datetime_utc', 'demand_reported_mwh', 'demand_imputed_pudl_mwh_imputation_code'])
out = []
for rid, year in SAMPLE:
    s = t.filter(pc.and_(pc.equal(t.column('respondent_id_ferc714'), rid), pc.equal(pc.year(t.column('report_date')), year)))
    ok = s.filter(pc.and_(pc.is_null(s.column('demand_imputed_pudl_mwh_imputation_code')), pc.is_valid(s.column('demand_reported_mwh'))))
    if ok.num_rows == 0:
        out.append({'respondent_id_ferc714': rid, 'year': year, 'peak_mw': None}); continue
    i = pc.index(ok.column('demand_reported_mwh'), pc.max(ok.column('demand_reported_mwh'))).as_py()
    row = ok.slice(i, 1).to_pylist()[0]
    out.append({'respondent_id_ferc714': rid, 'year': year, 'peak_mw': row['demand_reported_mwh'], 'peak_hour_utc': row['datetime_utc'].strftime('%Y-%m-%dT%H:%M:%SZ'), 'hours_reported': pc.sum(pc.is_valid(s.column('demand_reported_mwh'))).as_py()})
json.dump({'source': 'PUDL v2026.10.0 out_ferc714__hourly_planning_area_demand, computed with pyarrow by verify/tools/pudl-ferc714-peaks.py', 'sha256': hashlib.sha256(open(path, 'rb').read()).hexdigest(), 'peaks': out}, sys.stdout, indent=1)
print()
