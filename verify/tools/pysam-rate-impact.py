# The proposed-rate impact cross-check (add-ratepayer-tools task 1.2): three
# URDB rates as the current tariff, each with a stated proposal (fixed charge
# +$8 a month, every energy rate × 1.07, every demand rate × 1.10), priced by
# NREL PySAM 7.1.1 Utilityrate5 on three synthetic loads, current and
# proposed, so CI can check the bill engine's annual differences. Dev-time
# only, with PySAM 7.1.1 under Python 3.12:
#   python -I verify/tools/pysam-rate-impact.py data/urdb/2026-10/rates.csv.gz verify/fixtures/bill > verify/reference/pysam-rate-impact.json
import contextlib, copy, csv, gzip, hashlib, json, sys
import PySAM, PySAM.Utilityrate5 as ur
from PySAM.UtilityRateTools import URDBv8_to_ElectricityRates

rates_path, loads_dir = sys.argv[1:3]
rows = {}
for r in csv.DictReader(gzip.open(rates_path, 'rt', newline='')):
    rows.setdefault(r['label'], r)
# The tiered, time-of-use, and monthly-demand rates from the bill engine's own cross-check.
LABELS = {'tiered energy': '539f6a0aec4f024411ec8ac1', 'time-of-use energy': '539f6a23ec4f024411ec8be1', 'monthly demand': '539f6a0aec4f024411ec8ac9'}
LOADS = ['office-2018-hourly.csv', 'home-2018-hourly.csv', 'plant-2018-hourly.csv']
J = lambda s: json.loads(s) if s else None
N = lambda s: float(s) if s not in ('', None) else None
def tiers(strux, key): return [[{k: (float(v) if k in ('rate', 'adj', 'max', 'sell') else v) for k, v in t.items()} for t in p.get(key, [])] for p in strux or []]
def v8(r):
    d = {'dgrules': 'Net Metering'}
    d['energyratestructure'] = tiers(J(r['energy_rate_structure']), 'energyRateTiers')
    d['energyweekdayschedule'] = J(r['energy_weekday_schedule']); d['energyweekendschedule'] = J(r['energy_weekend_schedule']) or copy.deepcopy(d['energyweekdayschedule'])
    f = J(r['flat_demand_structure'])
    if f and any((t.get('rate') or 0) for p in tiers(f, 'flatDemandTiers') for t in p):
        d['flatdemandstructure'] = tiers(f, 'flatDemandTiers'); d['flatdemandmonths'] = J(r['flat_demand_months']) or [0] * 12
    if N(r['fixed_charge']) is not None: d['fixedchargefirstmeter'] = N(r['fixed_charge']); d['fixedchargeunits'] = r['fixed_charge_units'] or '$/month'
    if N(r['min_charge']): d['mincharge'] = N(r['min_charge']); d['minchargeunits'] = r['min_charge_units'] or '$/month'
    return d
def propose(d):
    p = copy.deepcopy(d)
    p['fixedchargefirstmeter'] = p.get('fixedchargefirstmeter', 0) + 8; p['fixedchargeunits'] = p.get('fixedchargeunits', '$/month')
    for period in p['energyratestructure']:
        for t in period:
            t['rate'] = (t.get('rate', 0) + t.pop('adj', 0)) * 1.07
    for period in p.get('flatdemandstructure', []):
        for t in period:
            t['rate'] = (t.get('rate', 0) + t.pop('adj', 0)) * 1.10
    return p
def annual(d, load):
    m = ur.new()
    with contextlib.redirect_stdout(sys.stderr):
        m.ElectricityRates.assign(URDBv8_to_ElectricityRates(copy.deepcopy(d)))
    m.ElectricityRates.rate_escalation = [0]; m.Lifetime.analysis_period = 1; m.Lifetime.system_use_lifetime_output = 0; m.Lifetime.inflation_rate = 0
    m.SystemOutput.gen = [0] * 8760; m.SystemOutput.degradation = [0]; m.Load.load = load; m.Load.load_escalation = [0]
    m.execute(0)
    return sum(m.Outputs.year1_monthly_utility_bill_w_sys)
cases = []
for why, label in LABELS.items():
    base = v8(rows[label])
    for f in LOADS:
        load = [float(r['kw']) for r in csv.DictReader(open(f'{loads_dir}/{f}', newline=''))]
        cur, prop = annual(base, load), annual(propose(base), load)
        cases.append({'rate': label, 'why': why, 'load': f, 'current': round(cur, 4), 'proposed': round(prop, 4), 'diff': round(prop - cur, 4)})
print(json.dumps({'engine': f'NREL PySAM {PySAM.__version__} Utilityrate5', 'proposal': 'fixed charge +$8 a month; energy rates × 1.07 (adjustments folded in); demand rates × 1.10',
                  'loads': {f: hashlib.sha256(open(f'{loads_dir}/{f}', 'rb').read()).hexdigest() for f in LOADS}, 'cases': cases}, indent=1))
