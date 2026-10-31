# Runs NREL PySAM's Utilityrate5 on the synthetic office load for 12 URDB rates
# chosen across the charge types both engines support (add-load-and-bill-
# analyzer task 3.5), and writes each rate's monthly bills for CI to compare
# with gridprims' bill engine. Rates come from the published CSV, converted to
# URDB's API v8 shape and then to PySAM inputs with PySAM's own
# UtilityRateTools. Dev-time only, with PySAM 7.1.1 under Python 3.12:
#   python -I verify/tools/pysam-utilityrate5.py data/urdb/2026-10/rates.csv.gz verify/fixtures/bill/office-2018-hourly.csv > verify/reference/pysam-utilityrate5-office.json
import contextlib, copy, csv, gzip, hashlib, io, json, sys
import PySAM
import PySAM.Utilityrate5 as ur
from PySAM.UtilityRateTools import URDBv8_to_ElectricityRates

rates_path, load_path = sys.argv[1:3]
rows = {}
for r in csv.DictReader(gzip.open(rates_path, 'rt', newline='')):
    rows.setdefault(r['label'], r)
load = [float(r['kw']) for r in csv.DictReader(open(load_path, newline=''))]
assert len(load) == 8760
J = lambda s: json.loads(s) if s else None
N = lambda s: float(s) if s not in ('', None) else None

def tiers(strux, key):
    out = []
    for p in strux or []:
        period = []
        for t in p.get(key, []):
            t = {k: (float(v) if k in ('rate', 'adj', 'max', 'sell') else v) for k, v in t.items()}
            period.append(t)
        out.append(period)
    return out
def nonzero(strux, key): return any((t.get('rate', 0) or 0) + (t.get('adj', 0) or 0) for p in tiers(strux, key) for t in p)
def units(strux, key, default='kWh'): return {(t.get('unit') or default) for p in tiers(strux, key) for t in p}

def v8(r):
    d = {'dgrules': 'Net Metering'}
    e = J(r['energy_rate_structure'])
    if e:
        d['energyratestructure'] = tiers(e, 'energyRateTiers')
        d['energyweekdayschedule'] = J(r['energy_weekday_schedule'])
        d['energyweekendschedule'] = J(r['energy_weekend_schedule']) or copy.deepcopy(d['energyweekdayschedule'])
    if nonzero(J(r['demand_rate_structure']), 'demandRateTiers'):
        d['demandratestructure'] = tiers(J(r['demand_rate_structure']), 'demandRateTiers')
        d['demandweekdayschedule'] = J(r['demand_weekday_schedule'])
        d['demandweekendschedule'] = J(r['demand_weekend_schedule']) or copy.deepcopy(d['demandweekdayschedule'])
    if nonzero(J(r['flat_demand_structure']), 'flatDemandTiers'):
        d['flatdemandstructure'] = tiers(J(r['flat_demand_structure']), 'flatDemandTiers')
        d['flatdemandmonths'] = J(r['flat_demand_months']) or [0] * 12
    if N(r['fixed_charge']):
        d['fixedchargefirstmeter'] = N(r['fixed_charge']); d['fixedchargeunits'] = r['fixed_charge_units'] or '$/month'
    if N(r['min_charge']):
        d['mincharge'] = N(r['min_charge']); d['minchargeunits'] = r['min_charge_units'] or '$/month'
    if N(r['lookback_percent']):
        d['lookbackpercent'] = N(r['lookback_percent'])
        d['lookbackrange'] = int(N(r['lookback_range']) or 11)
        if J(r['lookback_months']): d['lookbackmonths'] = J(r['lookback_months'])
    return d

def supported(r):
    e = J(r['energy_rate_structure'])
    if not e or not units(e, 'energyRateTiers') <= {'kWh', 'kWh/kW', 'kWh daily'}: return False
    if any(t.get('sell') for p in tiers(e, 'energyRateTiers') for t in p): return False
    for key, col, unit in (('demandRateTiers', 'demand_rate_structure', 'demand_rate_units'), ('flatDemandTiers', 'flat_demand_structure', 'flat_demand_units')):
        s = J(r[col])
        if nonzero(s, key) and ((r[unit] or 'kW') != 'kW' or not units(s, key, 'kW') <= {'kW'}): return False
    if nonzero(J(r['coincident_rate_structure']), 'coincidentRateTiers'): return False
    if (J(r['fuel_adjustments_monthly']) or [0]) != [0] and any(J(r['fuel_adjustments_monthly'])): return False
    if (r['fixed_charge'] and (r['fixed_charge_units'] or '$/month') not in ('$/month', '$/day')) or (r['min_charge'] and (r['min_charge_units'] or '$/month') not in ('$/month',)): return False
    return True

def within_day(r):
    wd, we = J(r['energy_weekday_schedule']) or [], J(r['energy_weekend_schedule']) or []
    return any(len(set(m)) > 1 for m in wd) or any(set(a) != set(b) for a, b in zip(wd, we))
E = lambda r: tiers(J(r['energy_rate_structure']), 'energyRateTiers')
no_demand = lambda r: not nonzero(J(r['demand_rate_structure']), 'demandRateTiers') and not nonzero(J(r['flat_demand_structure']), 'flatDemandTiers')
CATEGORIES = [
    ('flat energy and a monthly fixed charge', lambda r: no_demand(r) and len(E(r)) == 1 and len(E(r)[0]) == 1 and (r['fixed_charge_units'] or '$/month') == '$/month' and N(r['fixed_charge'])),
    ('tiered energy', lambda r: no_demand(r) and len(E(r)) == 1 and len(E(r)[0]) >= 2 and units(J(r['energy_rate_structure']), 'energyRateTiers') == {'kWh'}),
    ('seasonal energy', lambda r: no_demand(r) and len(E(r)) >= 2 and not within_day(r) and all(len(p) == 1 for p in E(r))),
    ('time-of-use energy', lambda r: no_demand(r) and within_day(r) and all(len(p) == 1 for p in E(r))),
    ('time-of-use energy with tiers', lambda r: no_demand(r) and within_day(r) and any(len(p) >= 2 for p in E(r)) and units(J(r['energy_rate_structure']), 'energyRateTiers') == {'kWh'}),
    ('monthly demand', lambda r: nonzero(J(r['flat_demand_structure']), 'flatDemandTiers') and not nonzero(J(r['demand_rate_structure']), 'demandRateTiers') and all(len(p) == 1 for p in tiers(J(r['flat_demand_structure']), 'flatDemandTiers')) and not N(r['lookback_percent'])),
    ('tiered monthly demand', lambda r: any(len(p) >= 2 for p in tiers(J(r['flat_demand_structure']), 'flatDemandTiers')) and nonzero(J(r['flat_demand_structure']), 'flatDemandTiers') and not N(r['lookback_percent'])),
    ('time-of-use demand', lambda r: nonzero(J(r['demand_rate_structure']), 'demandRateTiers') and not N(r['lookback_percent'])),
    ('a daily fixed charge', lambda r: r['fixed_charge_units'] == '$/day' and N(r['fixed_charge'])),
    ('a minimum charge', lambda r: N(r['min_charge']) and (r['min_charge_units'] or '$/month') == '$/month'),
    ('energy tiers per kW of demand', lambda r: 'kWh/kW' in units(J(r['energy_rate_structure']), 'energyRateTiers')),
    ('a demand ratchet', lambda r: N(r['lookback_percent']) and nonzero(J(r['flat_demand_structure']), 'flatDemandTiers')),
]
picked = []
for name, pred in CATEGORIES:
    for l in sorted(rows):
        r = rows[l]
        if l in [p[0] for p in picked] or r['sector'] == 'Lighting' or not supported(r): continue
        try:
            if pred(r): picked.append((l, name)); break
        except Exception:
            continue

results = []
for label, why in picked:
    m = ur.new()
    # The converter prints a notice for ratchets; keep stdout for the JSON.
    with contextlib.redirect_stdout(sys.stderr):
        rates = URDBv8_to_ElectricityRates(v8(rows[label]))
    m.ElectricityRates.assign(rates)
    if rates.get('ur_enable_billing_demand'):
        # No billing demand before the file, as gridprims assumes when no prior months are entered.
        m.ElectricityRates.ur_yearzero_usage_peaks = [0] * 12
    m.ElectricityRates.rate_escalation = [0]
    m.Lifetime.analysis_period = 1
    m.Lifetime.system_use_lifetime_output = 0
    m.Lifetime.inflation_rate = 0
    m.SystemOutput.gen = [0] * 8760
    m.SystemOutput.degradation = [0]
    m.Load.load = load
    m.Load.load_escalation = [0]
    m.execute(0)
    monthly = [round(x, 4) for x in m.Outputs.year1_monthly_utility_bill_w_sys]
    results.append({'label': label, 'why': why, 'name': rows[label]['rate_name'], 'utility': rows[label]['utility_name'], 'monthly': monthly, 'annual': round(sum(monthly), 4)})

print(json.dumps({
    'engine': f'NREL PySAM {PySAM.__version__} Utilityrate5, with PySAM.UtilityRateTools.URDBv8_to_ElectricityRates',
    'load': {'path': load_path, 'sha256': hashlib.sha256(open(load_path, 'rb').read()).hexdigest(), 'year': 2018},
    'rates': {'path': rates_path, 'sha256': hashlib.sha256(open(rates_path, 'rb').read()).hexdigest()},
    'results': results,
}, indent=1))
