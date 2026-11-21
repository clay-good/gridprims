# Typical residential hourly shapes by state (add-household-bill-check 1.1, state fallback): for each state, the
# single-family detached aggregate of the NLR End-Use Load Profiles (ResStock AMY2018 release 1 of 2025, upgrade 0,
# timeseries_aggregates/by_state), CC BY 4.0, turned into an average hour-of-day profile of total electricity for
# weekdays and for weekends in each month, normalized so each month of 2018 sums to 1.0. The release publishes no
# county aggregates since 2022, so the shape is the state's, and says so. Interval-ending timestamps are read as
# the hour the interval falls in. Dev-time only, Python 3 standard library; downloads about 31 MB a state, keeping
# only the derived shape and each file's SHA-256:
#   python3 -I verify/tools/state-load-shapes.py > data/curated/load-shapes/residential-sfd-by-state.json
import csv, datetime, hashlib, io, json, sys, urllib.request

BASE = 'https://oedi-data-lake.s3.amazonaws.com/nrel-pds-building-stock/end-use-load-profiles-for-us-building-stock/2025/resstock_amy2018_release_1/timeseries_aggregates/by_state/upgrade=0/state={st}/up00-{lo}-single-family_detached.csv'
STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split()
COL = 'out.electricity.total.energy_consumption..kwh'

out = {
    'source': {
        'title': 'End-Use Load Profiles for the U.S. Building Stock, ResStock AMY2018 release 1 (2025), timeseries aggregates by state, upgrade 0, single-family detached',
        'publisher': 'National Laboratory of the Rockies (formerly NREL), via the Open Energy Data Initiative (submission 4520)',
        'license': 'CC BY 4.0',
        'citation': 'Wilson, E., et al. End-Use Load Profiles for the U.S. Building Stock. DOI 10.25984/1876417.',
        'retrieved': '2026-11-21',
        'derived': 'Average total electricity by hour of day for weekdays and weekends in each month, normalized so each month of 2018 sums to 1.0; derived by gridprims, not a ResStock product.',
    },
    'files': {},
    'states': {},
}
for st in STATES:
    url = BASE.format(st=st, lo=st.lower())
    raw = urllib.request.urlopen(url, timeout=300).read()
    out['files'][st] = {'url': url, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    sums = {}; counts = {}; monthly = [0.0] * 12
    for row in csv.DictReader(io.StringIO(raw.decode('utf-8'))):
        end = datetime.datetime.strptime(row['timestamp'], '%Y-%m-%d %H:%M:%S')
        t = end - datetime.timedelta(minutes=15)
        if t.year != 2018:
            continue
        v = float(row[COL])
        key = (t.month - 1, 1 if t.weekday() >= 5 else 0, t.hour)
        sums[key] = sums.get(key, 0.0) + v
        monthly[t.month - 1] += v
    # Each (month, day type, hour) as the mean kWh of that hour, then scaled so the month's days sum to 1.
    days = {}
    d = datetime.date(2018, 1, 1)
    while d.year == 2018:
        k = (d.month - 1, 1 if d.weekday() >= 5 else 0)
        days[k] = days.get(k, 0) + 1
        d += datetime.timedelta(days=1)
    months = []
    for m in range(12):
        mean = [[sums[(m, dt, h)] / days[(m, dt)] for h in range(24)] for dt in (0, 1)]
        total = sum(mean[dt][h] * days[(m, dt)] for dt in (0, 1) for h in range(24))
        months.append([[round(x / total, 9) for x in mean[dt]] for dt in (0, 1)])
    out['states'][st] = months
    print(st, file=sys.stderr)
json.dump(out, sys.stdout, separators=(',', ':'))
sys.stdout.write('\n')
