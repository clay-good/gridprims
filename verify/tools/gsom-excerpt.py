# Keeps the monthly heating and cooling degree days NOAA publishes for five first-order stations in its Global
# Summary of the Month (GSOM), for the check of our on-device degree days (add-weather-normalization 1.3).
# GSOM's HTDD and CLDD are base 65 °F (18.3 °C) degree days summed from each day's mean of the maximum and
# minimum, published in Celsius degree days to 0.1. Only the 24 months checked are kept, as published, with
# each file's SHA-256. Dev-time only, Python 3 standard library:
#   curl -o /tmp/gsom/<station>.csv https://www.ncei.noaa.gov/data/global-summary-of-the-month/access/<station>.csv
#   python3 -I verify/tools/gsom-excerpt.py /tmp/gsom 2024-09 2026-08 > verify/reference/weather/gsom-5-stations.json
import csv, hashlib, json, os, sys

folder, first, last = sys.argv[1], sys.argv[2], sys.argv[3]
out = {'source': 'https://www.ncei.noaa.gov/data/global-summary-of-the-month/access/', 'retrieved': '2026-11-21', 'units': 'degree days Celsius, base 18.3 C (65 F)', 'stations': {}}
for name in sorted(os.listdir(folder)):
    if not name.endswith('.csv'):
        continue
    path = os.path.join(folder, name)
    rows = [r for r in csv.DictReader(open(path, newline='')) if first <= r['DATE'] <= last]
    out['stations'][name[:-4]] = {
        'sha256': hashlib.sha256(open(path, 'rb').read()).hexdigest(),
        'months': {r['DATE']: {'htdd': r['HTDD'], 'cldd': r['CLDD']} for r in rows},
    }
json.dump(out, sys.stdout, indent=1)
sys.stdout.write('\n')
