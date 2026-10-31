# Computes PUDL's 2025 figures for verify/reference/pudl-v2026.10.0-2025.json
# with pyarrow, independent of gridprims code, so the pipeline's snapshots are
# compared with PUDL (add-public-grid-data task 1.1). Dev-time only:
#   python3 -m venv venv && venv/bin/pip install pyarrow
#   venv/bin/python -I verify/tools/pudl-2025.py <folder of PUDL v2026.10.0 .parquet files> > verify/reference/pudl-v2026.10.0-2025.json
import hashlib, json, sys, pyarrow.parquet as pq, pyarrow.compute as pc
d = sys.argv[1]
FILES = ['core_eia860__scd_plants', 'core_eia860__scd_generators', 'core_eia861__yearly_reliability', 'core_eia861__yearly_sales', 'core_eia923__monthly_generation_fuel', 'core_eia923__monthly_generation_fuel_nuclear']
def y2025(name):
    t = pq.read_table(f'{d}/{name}.parquet')
    return t.filter(pc.equal(pc.year(t.column('report_date')), 2025)).to_pylist()
plants = y2025('core_eia860__scd_plants')
gens = [g for g in y2025('core_eia860__scd_generators') if g['operational_status'] == 'existing']
rel = y2025('core_eia861__yearly_reliability')
sales = y2025('core_eia861__yearly_sales')
gen = y2025('core_eia923__monthly_generation_fuel') + y2025('core_eia923__monthly_generation_fuel_nuclear')
# A set compares as the SHA-256 of its sorted JSON, so the reference stays small.
digest = lambda ids: hashlib.sha256(json.dumps(ids, separators=(',', ':')).encode()).hexdigest()
plant_ids = sorted({p['plant_id_eia'] for p in plants})
out = {
    'source': 'PUDL v2026.10.0 (Catalyst Cooperative, released 2026-10-14), https://s3.us-west-2.amazonaws.com/pudl.catalyst.coop/v2026.10.0/, report year 2025; computed with pyarrow by verify/tools/pudl-2025.py',
    'license': 'CC-BY-4.0',
    'files': {f: hashlib.sha256(open(f'{d}/{f}.parquet', 'rb').read()).hexdigest() for f in FILES},
    'plants': {'count': len(plant_ids), 'idsSha256': digest(plant_ids)},
    'existingGenerators': {'count': len(gens), 'summerMW': round(sum(g['summer_capacity_mw'] or 0 for g in gens), 3),
                           'idsSha256': digest(sorted([g['plant_id_eia'], g['generator_id']] for g in gens))},
    'reliability': {'rows': len(rel), 'utilityStatePairs': len({(r['utility_id_eia'], r['state']) for r in rel})},
    'sales': {'mwhAllParts': round(sum(r['sales_mwh'] or 0 for r in sales), 3),
              'withheldTexasBundledMWh': round(sum(r['sales_mwh'] or 0 for r in sales if r['utility_id_eia'] == 88888 and r['state'] == 'TX' and r['service_type'] == 'bundled'), 3)},
    'netGenerationMWh': round(sum(r['net_generation_mwh'] or 0 for r in gen), 3),
    'stateFuelIncrementRows': sum(1 for r in gen if r['plant_id_eia'] == 99999),
}
json.dump(out, sys.stdout, separators=(',', ':'))
print()
