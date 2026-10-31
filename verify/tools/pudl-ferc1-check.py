# Form 1 revenue-requirement inputs for three utilities in 2025, computed with
# pyarrow from PUDL v2026.10.0's files, independent of gridprims code, so the
# pudl-ferc1 snapshot can be checked against PUDL (add-ratepayer-tools task
# 1.3). Dev-time only:
#   venv/bin/python -I verify/tools/pudl-ferc1-check.py <folder of the four .parquet files> > verify/reference/pudl-v2026.10.0-ferc1.json
import hashlib, json, sys
import pyarrow.parquet as pq
d = sys.argv[1]
inc = [r for r in pq.read_table(f'{d}/core_ferc1__yearly_income_statements_sched114.parquet').to_pylist() if r['report_year'] == 2025 and r['utility_type'] == 'electric']
rb = [r for r in pq.read_table(f'{d}/out_ferc1__yearly_rate_base.parquet').to_pylist() if r['report_year'] == 2025 and r['utility_type'] == 'electric']
out = {}
for uid, name in [(295, 'Georgia Power Company'), (170, 'Duke Energy Carolinas, LLC'), (92, 'American Transmission Company LLC')]:
    s = lambda t: sum(r['dollar_value'] or 0 for r in inc if r['utility_id_ferc1'] == uid and r['income_type'] == t)
    out[str(uid)] = {
        'name': name,
        'operation_expense': s('operation_expense'), 'maintenance_expense': s('maintenance_expense'), 'depreciation_expense': s('depreciation_expense'),
        'taxes_other_than_income': s('taxes_other_than_income_taxes_utility_operating_income'),
        'rate_base': sum(r['ending_balance'] or 0 for r in rb if r['utility_id_ferc1'] == uid),
    }
files = ['core_ferc1__yearly_income_statements_sched114', 'out_ferc1__yearly_rate_base']
print(json.dumps({'source': 'PUDL v2026.10.0 (Catalyst Cooperative, CC BY 4.0), FERC Form 1, report year 2025, electric rows, computed with pyarrow', 'files': {f: hashlib.sha256(open(f'{d}/{f}.parquet', 'rb').read()).hexdigest() for f in files}, 'utilities': out}, indent=1))
