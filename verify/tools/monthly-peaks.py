# Monthly peaks and energy for an interval file, computed with Python's
# standard library only (no gridprims code), for interval insights'
# "Independent peak" check (add-load-and-bill-analyzer task 2.1). Months and
# local times are in the zone given, through zoneinfo. Dev-time only:
#   python3 -I verify/tools/monthly-peaks.py verify/fixtures/load/office-2025-15min.csv America/Chicago 15 > verify/reference/office-2025-monthly-peaks.json
import csv, hashlib, json, sys
from datetime import datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

path, zone, minutes = sys.argv[1], ZoneInfo(sys.argv[2]), int(sys.argv[3])
months, total = {}, Decimal(0)
for r in csv.DictReader(open(path, newline='')):
    t = datetime.strptime(r['interval_start_utc'], '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    kwh = Decimal(r['kwh'])
    kw = kwh * 60 / minutes
    local = t.astimezone(zone)
    key = local.strftime('%Y-%m')
    m = months.setdefault(key, {'month': key, 'kwh': Decimal(0), 'peakKw': None, 'peakLocal': None, 'peakUtc': None})
    m['kwh'] += kwh
    total += kwh
    if m['peakKw'] is None or kw > m['peakKw']:
        m.update(peakKw=kw, peakLocal=local.strftime('%Y-%m-%d %H:%M'), peakUtc=r['interval_start_utc'])
print(json.dumps({
    'source': path, 'sha256': hashlib.sha256(open(path, 'rb').read()).hexdigest(), 'zone': sys.argv[2], 'intervalMinutes': minutes,
    'totalKwh': str(total),
    'months': [{**m, 'kwh': str(m['kwh']), 'peakKw': str(m['peakKw'])} for m in sorted(months.values(), key=lambda m: m['month'])],
}, indent=1))
