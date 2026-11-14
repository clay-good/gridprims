# Recomputes three reliability cohorts' quartiles straight from the EIA-861
# reliability file we serve, with Python's standard library only, so the check
# shares no code with core/lib/reliability-peers.mjs (add-reliability-tools
# task 1.3). Cohorts: ownership group, customer-count class, Census division,
# by one method and basis. Quartiles by linear interpolation between ranks
# (statistics.quantiles, method="inclusive"). Run with any Python 3:
#   python verify/tools/reliability-cohorts.py data/eia-861/2026-10/reliability.csv.gz > verify/reference/reliability/cohorts-check.json
import csv, gzip, hashlib, json, statistics, sys

path = sys.argv[1]
DIV = {}
for d, sts in {'West North Central': 'IA KS MN MO NE ND SD', 'South Atlantic': 'DE DC FL GA MD NC SC VA WV', 'East North Central': 'IL IN MI OH WI'}.items():
    for s in sts.split():
        DIV[s] = d
GROUP = {'Investor Owned': 'investor-owned', 'Cooperative': 'cooperative', 'Municipal': 'public power', 'Political Subdivision': 'public power', 'State': 'public power', 'Federal': 'public power'}

def size(c):
    return 'under-10k' if c < 10000 else '10k-100k' if c < 100000 else '100k-1m' if c < 1000000 else '1m-plus'

COHORTS = [
    {'method': 'ieee', 'basis': 'with_med', 'ownership': 'cooperative', 'size': '10k-100k', 'division': 'West North Central'},
    {'method': 'ieee', 'basis': 'without_med', 'ownership': 'investor-owned', 'size': '100k-1m', 'division': None},
    {'method': 'ieee', 'basis': 'with_med', 'ownership': 'public power', 'size': '10k-100k', 'division': 'East North Central'},
]
rows = list(csv.DictReader(gzip.open(path, 'rt', newline='')))
out = []
for c in COHORTS:
    vals = []
    for r in rows:
        cust, saidi = r[f"{c['method']}_customers"], r[f"{c['method']}_{c['basis']}_saidi"]
        if not cust or not saidi or float(cust) <= 0:
            continue
        if GROUP.get(r['ownership']) != c['ownership'] or size(float(cust)) != c['size']:
            continue
        if c['division'] and DIV.get(r['state']) != c['division']:
            continue
        vals.append(float(saidi))
    q1, med, q3 = statistics.quantiles(vals, n=4, method='inclusive')
    out.append({**c, 'basis': c['basis'].replace('_', '-'), 'n': len(vals), 'q1': q1, 'median': med, 'q3': q3})
sha = hashlib.sha256(open(path, 'rb').read()).hexdigest()
print(json.dumps({'file': path, 'sha256': sha, 'cohorts': out}, indent=1))
