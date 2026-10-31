"""Independent outage events for three counties from EAGLE-I's raw files
(add-electrification-tools 1.5, "Verification and handoff"), written apart
from gridprims' JavaScript with Python's csv module: a run of 15-minute
records with at least 1% of the county's modeled customers out (MCC.csv),
bridging missing records of up to an hour; a record under 1% ends the run.

    python3 -I verify/tools/eaglei-events-check.py <dir with eaglei_outages_YYYY.csv and MCC.csv> > verify/reference/eaglei-events-3-counties.json
"""

import csv
import json
import sys
from datetime import datetime, timedelta, timezone

COUNTIES = {'48453': 'Travis County, TX', '12086': 'Miami-Dade County, FL', '22071': 'Orleans Parish, LA'}
STEP = timedelta(minutes=15)
BRIDGE = timedelta(hours=1)

src = sys.argv[1]
with open(f'{src}/MCC.csv', encoding='utf-8-sig') as f:
    mcc = {r['County_FIPS'].zfill(5): int(r['Customers']) for r in csv.DictReader(f)}

events = {k: [] for k in COUNTIES}
open_runs = {}


def close(fips):
    run = open_runs.pop(fips, None)
    if run:
        start, last = run
        events[fips].append({'start': start.strftime('%Y-%m-%dT%H:%M'), 'hours': (last - start + STEP) / timedelta(hours=1)})


for year in range(2014, 2026):
    with open(f'{src}/eaglei_outages_{year}.csv', newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            fips = row['fips_code'].zfill(5)
            if fips not in COUNTIES:
                continue
            t = datetime.strptime(row['run_start_time'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
            # 2023 names the column "sum"; 2024 adds total_customers, which this check, like gridprims, does not use.
            out = row['customers_out'] if 'customers_out' in row else row['sum']
            if float(out or 0) / mcc[fips] < 0.01:
                close(fips)
                continue
            run = open_runs.get(fips)
            if run and t - run[1] <= STEP + BRIDGE:
                open_runs[fips] = (run[0], t)
                continue
            close(fips)
            open_runs[fips] = (t, t)
for fips in list(open_runs):
    close(fips)

json.dump({
    'about': 'Outage events computed independently of gridprims from EAGLE-I version 4 (ORNL, CC BY 4.0) with Python csv; the rule is the spec\'s: at least 1% of MCC.csv customers out, missing records up to an hour bridged.',
    'counties': {f: {'name': n, 'customers': mcc[f], 'count': len(events[f]), 'events': events[f]} for f, n in COUNTIES.items()},
}, sys.stdout, indent=1)
sys.stdout.write('\n')
