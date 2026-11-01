"""An independent merit-order rerun for the scenario model's reference
(add-grid-scenario-model 2.5).

Reads EIA's own six-month BALANCE files (the Adjusted series, as the hourly
snapshot does) and the fleet the site publishes, dispatches each hour in
ascending variable cost in plain Python, and writes the coal, gas, and oil
totals and each hour's marginal unit. It shares no code with core/lib.

    python3 -I verify/tools/merit-order-check.py OUT.json FLEET_DIR BALANCE.csv [BALANCE.csv ...] -- BA [BA ...]

FLEET_DIR holds <ba>/fleet.json from a built site (dist/scenario).
"""

import csv
import json
import sys
from datetime import datetime, timedelta, timezone

RECORDED = ['Nuclear', 'Hydropower Excluding Pumped Storage', 'Pumped Storage', 'Solar without Integrated Battery Storage',
            'Solar with Integrated Battery Storage', 'Wind without Integrated Battery Storage', 'Wind with Integrated Battery Storage',
            'Battery Storage', 'Other Energy Storage', 'Unknown Energy Storage', 'Geothermal', 'Other Fuel Sources', 'Unknown Fuel Sources']
DISPATCHED = {'coal': 'Coal', 'gas': 'Natural Gas', 'oil': 'All Petroleum Products'}


def num(v):
    v = (v or '').replace(',', '').strip()
    return float(v) if v else None


def adjusted(header, row, label):
    """A fuel's Adjusted value, found by its words, since EIA's own headers carry typos and double spaces."""
    want = ' '.join(f'Net Generation (MW) from {label} (Adjusted)'.split())
    for i, h in enumerate(header):
        if ' '.join(h.split()) == want:
            return num(row[i])
    # 2025's header misspells one solar column ("witho"); match it by position after the plain solar one.
    if label == 'Solar with Integrated Battery Storage':
        i = [k for k, h in enumerate(header) if 'Solar witho Integrated' in h]
        return num(row[i[0]]) if i else None
    return None


def hours(paths, bas):
    out = {ba: {} for ba in bas}
    for p in paths:
        with open(p, newline='') as f:
            r = csv.reader(f)
            header = next(r)
            col = {h: i for i, h in enumerate(header)}
            for row in r:
                ba = row[0]
                if ba not in out:
                    continue
                end = datetime.strptime(row[col['UTC Time at End of Hour']], '%m/%d/%Y %I:%M:%S %p').replace(tzinfo=timezone.utc)
                start = end - timedelta(hours=1)
                if start.year != 2025:
                    continue
                demand = num(row[col['Demand (MW) (Adjusted)']])
                interchange = num(row[col['Total Interchange (MW) (Adjusted)']]) or 0.0
                recorded = sum(adjusted(header, row, label) or 0.0 for label in RECORDED)
                actual = {k: adjusted(header, row, v) or 0.0 for k, v in DISPATCHED.items()}
                out[ba][int(start.timestamp() // 3600)] = (demand, interchange, recorded, actual, start.month - 1)
    return out


def dispatch(units, rows):
    order = []
    for m in range(12):
        on = [u for u in units if u['from_month'] <= m <= u['to_month'] and u['cost'][m] is not None and u['capacity_mw'] > 0]
        on.sort(key=lambda u: (u['cost'][m][0], u['id']))
        order.append(on)
    totals = {k: 0.0 for k in DISPATCHED}
    marginal = {}
    for h in sorted(rows):
        demand, interchange, recorded, _, m = rows[h]
        if demand is None:
            continue
        need = demand + interchange - recorded
        if need <= 0:
            marginal[h] = None
            continue
        left = need
        marginal[h] = None
        for u in order[m]:
            take = min(u['capacity_mw'], left)
            totals[u['class']] += take
            left -= take
            if left <= 0:
                marginal[h] = u['id']
                break
    return totals, marginal


def main():
    out, fleet_dir = sys.argv[1], sys.argv[2]
    rest = sys.argv[3:]
    paths, bas = rest[:rest.index('--')], rest[rest.index('--') + 1:]
    data = hours(paths, bas)
    result = {'note': 'Independent merit-order rerun in plain Python from EIA\'s BALANCE files (Adjusted series) and the published fleet; see verify/tools/merit-order-check.py.', 'files': [p.split('/')[-1] for p in paths], 'regions': {}}
    for ba in bas:
        with open(f'{fleet_dir}/{ba.lower()}/fleet.json') as f:
            fleet = json.load(f)
        totals, marginal = dispatch(fleet['units'], data[ba])
        hs = sorted(marginal)
        ids = sorted({u['id'] for u in fleet['units']})
        index = {u: i for i, u in enumerate(ids)}
        result['regions'][ba] = {
            'versions': fleet['versions'], 'hours': len(hs), 'totals_mwh': {k: round(v, 1) for k, v in totals.items()},
            'first_hour': hs[0], 'ids': ids,
            # Each hour from first_hour on: the marginal unit's place in ids, -1 for none, -2 for an hour not reported.
            'marginal': [index[marginal[h]] if marginal.get(h) is not None else (-1 if h in marginal else -2) for h in range(hs[0], hs[-1] + 1)],
        }
    with open(out, 'w') as f:
        json.dump(result, f, separators=(',', ':'))


main()
