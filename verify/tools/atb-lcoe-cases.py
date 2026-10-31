# Published LCOE cases from NLR's Annual Technology Baseline 2025, as PUDL
# v2026.10.0 carries it, with each case's own inputs, for the LCOE tool's
# cross-check (add-grid-calculators task 2.3). Read with pyarrow 26 from
# PUDL's core_nrelatb__yearly_projected_cost_performance and
# core_nrelatb__yearly_projected_financial_cases_by_scenario. Dev-time only:
#   python verify/tools/atb-lcoe-cases.py <dir with the two parquet files> > verify/reference/atb-2025-lcoe-cases.json
import hashlib, json, sys
import pyarrow.parquet as pq

d = sys.argv[1]
names = ['core_nrelatb__yearly_projected_cost_performance', 'core_nrelatb__yearly_projected_financial_cases_by_scenario']
cp = pq.read_table(f'{d}/{names[0]}.parquet').to_pylist()
fc = pq.read_table(f'{d}/{names[1]}.parquet').to_pylist()
key = lambda r: (r['model_case_nrelatb'], r['model_tax_credit_case_nrelatb'], r['projection_year'], r['technology_description'], r['scenario_atb'], r['cost_recovery_period_years'])
fcr = {key(r): r['fixed_charge_rate'] for r in fc if r['report_year'] == 2025}
cases = []
for tech in ['UtilityPV', 'CommPV', 'ResPV', 'LandbasedWind', 'OffShoreWind', 'Geothermal', 'Hydropower', 'Nuclear', 'Biopower', 'CSP']:
    rows = [r for r in cp if r['report_year'] == 2025 and r['projection_year'] == 2025 and r['technology_description'] == tech and r['scenario_atb'] == 'Moderate'
            and r['model_case_nrelatb'] == 'R&D' and r['model_tax_credit_case_nrelatb'] is None and r['cost_recovery_period_years'] == 30
            and r['levelized_cost_of_energy_per_mwh'] and r['capacity_factor'] and fcr.get(key(r))]
    rows.sort(key=lambda r: (str(r['technology_description_detail_1']), str(r['technology_description_detail_2'])))
    if not rows: continue
    r = rows[0]
    cases.append({'technology': tech, 'detail': [r['technology_description_detail_1'], r['technology_description_detail_2']], 'fcr': fcr[key(r)], 'capexPerKw': r['capex_per_kw'], 'fomPerKwYear': r['opex_fixed_per_kw'] or 0,
                  'capacityFactor': r['capacity_factor'], 'vomPerMwh': r['opex_variable_per_mwh'] or 0, 'fuelPerMwh': r['fuel_cost_per_mwh'] or 0, 'publishedLcoe': r['levelized_cost_of_energy_per_mwh']})
print(json.dumps({
    'source': 'NLR Annual Technology Baseline 2025 (CC BY 4.0), as published in PUDL v2026.10.0 by Catalyst Cooperative (CC BY 4.0); report year 2025, projection year 2025, Moderate scenario, R&D financial case, no tax credits, 30-year cost recovery',
    'files': {n: hashlib.sha256(open(f'{d}/{n}.parquet', 'rb').read()).hexdigest() for n in names},
    'cases': cases,
}, indent=1))
