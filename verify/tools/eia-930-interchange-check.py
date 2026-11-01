"""Independent rerun of the EIA-930 interchange checks for 2025
(add-data-continuity-ledger 3.5), with Python's csv module, apart from
gridprims' JavaScript: three neighbor pairs (hours both reported, hours one
did, and the residual as a share of throughput) and three balancing
authorities' totals against the sum of their pairs.

    python3 -I verify/tools/eia-930-interchange-check.py <dir with the 2025 BALANCE and INTERCHANGE files> > verify/reference/eia-930-interchange-2025.json
"""

import csv
import json
import sys

PAIRS = [('CISO', 'TIDC'), ('MISO', 'PJM'), ('BPAT', 'PACW')]
BAS = ['PJM', 'BPAT', 'ERCO']
src = sys.argv[1]


def num(s):
    return None if s in ('', None) else float(s)


flows = {}
sums = {}
for half in ('Jan_Jun', 'Jul_Dec'):
    with open(f'{src}/EIA930_INTERCHANGE_2025_{half}.csv', newline='') as f:
        for r in csv.DictReader(f):
            v = num(r['Interchange (MW)'])
            if v is None:
                continue
            a, b, t = r['Balancing Authority'], r['Directly Interconnected Balancing Authority'], r['UTC Time at End of Hour']
            flows[(a, b, t)] = v
            sums[(a, t)] = sums.get((a, t), 0) + v
out = {'year': 2025, 'pairs': {}, 'totals': {}}
for lo, hi in PAIRS:
    hours = {t for (a, b, t) in flows if (a, b) in ((lo, hi), (hi, lo))}
    tested = unavailable = 0
    thru = res = 0.0
    for t in hours:
        x, y = flows.get((lo, hi, t)), flows.get((hi, lo, t))
        if x is None or y is None:
            unavailable += 1
            continue
        tested += 1
        thru += max(abs(x), abs(y))
        res += abs(x + y)
    out['pairs'][f'{lo}|{hi}'] = {'tested': tested, 'unavailable': unavailable, 'residualPct': round(res / thru * 100, 4) if thru else None}
totals = {}
for half in ('Jan_Jun', 'Jul_Dec'):
    with open(f'{src}/EIA930_BALANCE_2025_{half}.csv', newline='') as f:
        for r in csv.DictReader(f):
            if r['Balancing Authority'] in BAS:
                totals[(r['Balancing Authority'], r['UTC Time at End of Hour'])] = num(r['Total Interchange (MW)'])
for ba in BAS:
    thru = res = 0.0
    tested = 0
    for (b, t), tot in totals.items():
        if b != ba or tot is None or (ba, t) not in sums:
            continue
        s = sums[(ba, t)]
        tested += 1
        thru += max(abs(tot), abs(s))
        res += abs(tot - s)
    out['totals'][ba] = {'tested': tested, 'reportedResidualPct': round(res / thru * 100, 4) if thru else None}
json.dump(out, sys.stdout, indent=1)
print()
