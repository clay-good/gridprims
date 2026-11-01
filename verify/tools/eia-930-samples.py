"""Five region-hours of EIA-930 read apart from gridprims' JavaScript
(add-hourly-carbon 1.1): the per-region workbook through openpyxl, and EIA's
separate six-month BALANCE CSV through Python's csv module, so both the hour
alignment (EIA labels hours by their UTC end) and every column we keep are
checked against what EIA published.

    python3 -m venv venv && venv/bin/pip install openpyxl
    venv/bin/python -I verify/tools/eia-930-samples.py <dir with {BA}.xlsx and EIA930_BALANCE_*.csv> > verify/reference/eia-930-samples.json
"""

import csv
import json
import sys
from datetime import datetime, timedelta

import openpyxl

# (region, UTC hour start, six-month file)
SAMPLES = [
    ('MISO', '2019-02-01T05:00', '2019_Jan_Jun'),
    ('PJM', '2021-01-20T12:00', '2021_Jan_Jun'),
    ('ERCO', '2023-08-10T22:00', '2023_Jul_Dec'),
    ('CISO', '2024-07-15T00:00', '2024_Jul_Dec'),
    ('BPAT', '2026-03-01T18:00', '2026_Jan_Jun'),
]
XLSX = {
    'demand': 'Adjusted demand', 'net_generation': 'Adjusted net generation', 'interchange': 'Adjusted total interchange',
    'gen_ng': 'Adjusted NG Gen', 'gen_wat': 'Adjusted WAT Gen', 'gen_sun': 'Adjusted SUN Gen', 'gen_wnd': 'Adjusted WND Gen',
    'co2_generated': 'CO2 Emissions Generated', 'co2_consumed': 'CO2 Emissions Consumed',
    'intensity_generated': 'CO2 Emissions Intensity for Generated Electricity', 'intensity_consumed': 'CO2 Emissions Intensity for Consumed Electricity',
}
CSV = {'demand': 'Demand (MW) (Adjusted)', 'net_generation': 'Net Generation (MW) (Adjusted)', 'interchange': 'Total Interchange (MW) (Adjusted)', 'gen_ng': 'Net Generation (MW) from Natural Gas (Adjusted)'}

src = sys.argv[1]


def number(v):
    if v is None or v == '':
        return None
    return float(str(v).replace(',', ''))


out = []
for ba, start, half in SAMPLES:
    end = datetime.fromisoformat(start) + timedelta(hours=1)
    wb = openpyxl.load_workbook(f'{src}/{ba}.xlsx', read_only=True, data_only=True)
    rows = wb['Published Hourly Data'].iter_rows(values_only=True)
    header = list(next(rows))
    at = {k: header.index(h) for k, h in XLSX.items()}
    utc = header.index('UTC time')
    found = None
    # The full year 2024 (UTC hour starts): how many hours carry a consumption-based intensity, and their sum in lb/MWh.
    year = {'hours': 0, 'sumLbPerMwh': 0.0}
    for r in rows:
        t = r[utc]
        if not isinstance(t, datetime):
            continue
        # openpyxl gives a datetime; round away sub-second serial noise.
        hour_start = (t + timedelta(seconds=30)).replace(second=0, microsecond=0) - timedelta(hours=1)
        if hour_start.year == 2024 and number(r[at['intensity_consumed']]) is not None:
            year['hours'] += 1
            year['sumLbPerMwh'] += number(r[at['intensity_consumed']]) * 1000
        if found is None and abs((t - end).total_seconds()) < 1:
            found = {k: number(r[i]) for k, i in at.items()}
    wb.close()
    stamp = end.strftime('%m/%d/%Y ') + str(int(end.strftime('%I'))) + end.strftime(':%M:%S %p')
    published = None
    with open(f'{src}/EIA930_BALANCE_{half}.csv', newline='', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            if r['Balancing Authority'] == ba and r['UTC Time at End of Hour'] == stamp:
                published = {k: number(r[h]) for k, h in CSV.items()}
                break
    out.append({'ba': ba, 'hourStart': start, 'workbook': found, 'sixMonthCsv': published, 'year2024': year})

json.dump({
    'source': 'EIA Hourly Electric Grid Monitor: per-region workbooks (eia.gov/electricity/gridmonitor/knownissues/xls/{BA}.xlsx, sheet "Published Hourly Data") and six-month BALANCE files (eia.gov/electricity/gridmonitor/sixMonthFiles/)',
    'retrieved': '2026-10-31',
    'method': 'openpyxl 3.1.5 for the workbook and the csv module for the six-month file; the row whose UTC end is the hour start plus one hour',
    'samples': out,
}, sys.stdout, indent=2)
print()
