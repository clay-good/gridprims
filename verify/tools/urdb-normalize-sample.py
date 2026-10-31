# Builds the stored expectations for 50 sampled URDB rates (add-load-and-bill-
# analyzer task 3.1): each rate's charges, units, and unmodeled items as the
# tariff record should hold them, decided here from the published CSV with
# Python's standard library only (no gridprims code). The sample covers every
# unit and charge type URDB uses, then plain rates to make 50. Dev-time only:
#   python3 -I verify/tools/urdb-normalize-sample.py data/urdb/2026-10/rates.csv.gz > verify/reference/urdb-normalize-sample.json
import csv, gzip, hashlib, json, sys

path = sys.argv[1]
raw = open(path, 'rb').read()
rows = {}
for r in csv.DictReader(gzip.open(path, 'rt', newline='')):
    rows.setdefault(r['label'], r)
J = lambda s: json.loads(s) if s else None
N = lambda s: float(s) if s not in ('', None) else None

def rate(t): return float(t.get('rate', 0) or 0) + float(t.get('adj', 0) or 0)
def nonzero(strux): return any(rate(t) != 0 for p in (strux or []) for tiers in p.values() for t in tiers)

def expect(r):
    un = []
    out = {'fixed': None, 'minimum': None, 'energy': None, 'demand': None, 'flatDemand': None}
    fc, fu = N(r['fixed_charge']), r['fixed_charge_units'] or '$/month'
    if fc:
        per = {'$/month': 'month', '$/day': 'day'}.get(fu)
        if per: out['fixed'] = [fc, per]
        else: un.append('fixed charge in ' + fu)
    mc, mu = N(r['min_charge']), r['min_charge_units'] or '$/month'
    if mc:
        per = {'$/month': 'month', '$/day': 'day', '$/year': 'year'}.get(mu)
        if per: out['minimum'] = [mc, per]
        else: un.append('minimum charge in ' + mu)
    e = J(r['energy_rate_structure'])
    if e:
        units = sorted({t.get('unit') or 'kWh' for p in e for t in p.get('energyRateTiers', [])})
        bad = [u for u in units if u not in ('kWh', 'kWh daily', 'kWh/kW')]
        if bad: un += ['energy tiers in ' + u for u in bad]
        else: out['energy'] = {'periods': len(e), 'tiers': [len(p.get('energyRateTiers', [])) for p in e], 'units': units}
        if any(t.get('sell') for p in e for t in p.get('energyRateTiers', [])): un.append('export (sell) rates')
    units = {'kW': ['kW', False], 'kVA': ['kVA', False], 'kW daily': ['kW', True], 'kVA daily': ['kVA', True]}
    d = J(r['demand_rate_structure'])
    if d and nonzero(d):
        u = units.get(r['demand_rate_units'] or 'kW')
        if u: out['demand'] = u + [len(d)]
        else: un.append('time-of-use demand charge in ' + r['demand_rate_units'])
    f = J(r['flat_demand_structure'])
    if f and nonzero(f):
        u = units.get(r['flat_demand_units'] or 'kW')
        if u: out['flatDemand'] = u + [len(f)]
        else: un.append('monthly demand charge in ' + r['flat_demand_units'])
    if nonzero(J(r['coincident_rate_structure'])): un.append('coincident demand charge')
    ratchet = J(r['demand_ratchet_percentage'])
    out['ratchet'] = bool(any(x > 0 for x in (ratchet or [])) or (N(r['lookback_percent']) or 0) > 0)
    w = N(r['demand_window'])
    out['window'] = [w, True] if w else [15, False]
    out['kvar'] = N(r['reactive_power_charge'])
    fa = J(r['fuel_adjustments_monthly'])
    if fa and any(fa): un.append('monthly fuel adjustments')
    out['unmodeled'] = sorted(un)
    return out

def has_tier_unit(r, u): return any(t.get('unit') == u for p in (J(r['energy_rate_structure']) or []) for t in p.get('energyRateTiers', []))
CATEGORIES = [
    ('fixed $/day', 5, lambda r: r['fixed_charge'] and r['fixed_charge_units'] == '$/day'),
    ('minimum $/year', 3, lambda r: r['min_charge'] and r['min_charge_units'] == '$/year'),
    ('minimum $/day', 2, lambda r: r['min_charge'] and r['min_charge_units'] == '$/day'),
    ('time-of-use demand in kVA', 3, lambda r: r['demand_rate_structure'] and r['demand_rate_units'] == 'kVA'),
    ('daily demand', 3, lambda r: (r['demand_rate_structure'] and r['demand_rate_units'] == 'kW daily') or (r['flat_demand_structure'] and r['flat_demand_units'] in ('kW daily', 'kVA daily'))),
    ('demand in horsepower', 3, lambda r: r['flat_demand_units'] == 'hp' or r['demand_rate_units'] == 'hp'),
    ('tiers in kWh per kW', 3, lambda r: has_tier_unit(r, 'kWh/kW')),
    ('tiers in kWh per day', 2, lambda r: has_tier_unit(r, 'kWh daily')),
    ('tiers in kWh per kVA or hp', 3, lambda r: has_tier_unit(r, 'kWh/kVA') or has_tier_unit(r, 'kWh/hp')),
    ('coincident demand', 3, lambda r: nonzero(J(r['coincident_rate_structure']))),
    ('ratchet', 4, lambda r: any(x > 0 for x in (J(r['demand_ratchet_percentage']) or []))),
    ('demand window stated', 3, lambda r: N(r['demand_window']) in (30.0, 60.0)),
    ('reactive power charge', 3, lambda r: N(r['reactive_power_charge'])),
    ('sell rates', 2, lambda r: any(t.get('sell') for p in (J(r['energy_rate_structure']) or []) for t in p.get('energyRateTiers', []))),
    ('fuel adjustments', 1, lambda r: (J(r['fuel_adjustments_monthly']) or [0]) != [0] and any(J(r['fuel_adjustments_monthly']))),
    ('units not stated', 2, lambda r: r['flat_demand_structure'] and not r['flat_demand_units']),
]
picked, why = [], {}
labels = sorted(rows)
for name, k, pred in CATEGORIES:
    n = 0
    for l in labels:
        if n == k: break
        if l in why: continue
        if pred(rows[l]):
            picked.append(l); why[l] = name; n += 1
for l in labels[::max(1, len(labels) // 50)]:
    if len(picked) == 50: break
    if l not in why: picked.append(l); why[l] = 'plain'
print(json.dumps({
    'source': 'data/urdb/2026-10/rates.csv.gz, the published URDB snapshot', 'sha256': hashlib.sha256(raw).hexdigest(),
    'rates': [{'label': l, 'why': why[l], 'name': rows[l]['rate_name'], 'expect': expect(rows[l])} for l in picked],
}, indent=1))
