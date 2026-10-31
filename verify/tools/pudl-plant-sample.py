# Computes 2025 net generation and operable nameplate capacity for 20 sampled
# plants from PUDL v2026.10.0's copies of EIA-923 and EIA-860, with pyarrow,
# independent of gridprims code (add-public-grid-data, plant pages:
# "Verification against published aggregates"). Dev-time only:
#   venv/bin/python -I verify/tools/pudl-plant-sample.py <folder of PUDL .parquet files> > verify/reference/pudl-v2026.10.0-plant-sample.json
import hashlib, json, sys, pyarrow.parquet as pq, pyarrow.compute as pc
d = sys.argv[1]
# A spread of fuels, sizes, and states: coal, gas, nuclear, hydro, pumped storage, wind, solar, storage, CHP.
SAMPLE = [3470, 6115, 2780, 3797, 7805, 6167, 55391, 6101, 628, 6013, 56127, 65400, 58696, 2442, 3251, 8023, 60747, 63798, 1, 57053]
def y2025(name, cols):
    t = pq.read_table(f'{d}/{name}.parquet', columns=cols)
    return t.filter(pc.equal(pc.year(t.column('report_date')), 2025))
gen = [y2025(n, ['report_date', 'plant_id_eia', 'net_generation_mwh']) for n in ['core_eia923__monthly_generation_fuel', 'core_eia923__monthly_generation_fuel_nuclear']]
gens = y2025('core_eia860__scd_generators', ['report_date', 'plant_id_eia', 'generator_id', 'operational_status', 'capacity_mw'])
out = []
for pid in SAMPLE:
    net = sum(pc.sum(g.filter(pc.equal(g.column('plant_id_eia'), pid)).column('net_generation_mwh')).as_py() or 0 for g in gen)
    has = sum(g.filter(pc.equal(g.column('plant_id_eia'), pid)).num_rows for g in gen)
    ex = gens.filter(pc.and_(pc.equal(gens.column('plant_id_eia'), pid), pc.equal(gens.column('operational_status'), 'existing')))
    out.append({'plant_id': pid, 'net_generation_mwh': round(net, 3) if has else None, 'nameplate_mw': round(pc.sum(ex.column('capacity_mw')).as_py() or 0, 3)})
json.dump({'source': 'PUDL v2026.10.0 copies of EIA-923 (generation_fuel and generation_fuel_nuclear) and EIA-860 (scd_generators, existing), report year 2025, computed with pyarrow by verify/tools/pudl-plant-sample.py',
           'files': {f: hashlib.sha256(open(f'{d}/{f}.parquet', 'rb').read()).hexdigest() for f in ['core_eia923__monthly_generation_fuel', 'core_eia923__monthly_generation_fuel_nuclear', 'core_eia860__scd_generators']},
           'plants': out}, sys.stdout, indent=1)
print()
