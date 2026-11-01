"""EIA's own daily values for five regions over September 2026
(add-public-grid-data 4.1, "Rollups checked against EIA"), read from the
"Published Daily Data" sheet of each region's workbook with openpyxl,
independent of gridprims code. EIA's daily demand is the local day's total in
the zone the region reports in.

    python3 -m venv venv && venv/bin/pip install openpyxl
    venv/bin/python -I verify/tools/eia-930-daily.py <dir with {BA}.xlsx> > verify/reference/eia-930-daily-2026-09.json
"""

import json
import sys
from datetime import datetime

import openpyxl

REGIONS = ['PJM', 'MISO', 'ERCO', 'CISO', 'ISNE']
src = sys.argv[1]
out = {'source': 'EIA Hourly Electric Grid Monitor per-region workbooks, sheet "Published Daily Data", retrieved 2026-10-31', 'unit': 'MWh', 'regions': {}}
for ba in REGIONS:
    wb = openpyxl.load_workbook(f'{src}/{ba}.xlsx', read_only=True, data_only=True)
    rows = wb['Published Daily Data'].iter_rows(values_only=True)
    header = list(next(rows))
    d, dem, zone = header.index('Local date'), header.index('Demand'), header.index('Time zone')
    days = {}
    for r in rows:
        if isinstance(r[d], datetime) and r[d].year == 2026 and r[d].month == 9 and r[dem] is not None:
            days[r[d].strftime('%Y-%m-%d')] = {'demand': r[dem], 'zone': r[zone]}
    wb.close()
    out['regions'][ba] = days
json.dump(out, sys.stdout, indent=1)
print()
