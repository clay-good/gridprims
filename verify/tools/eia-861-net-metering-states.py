"""EIA's own state totals of net metering for five states in 2023 and 2025
(add-program-fact-pages 2.4), read from the "States- State Level" sheet of
each year's Net_Metering workbook with openpyxl, independent of gridprims
code: total capacity (MW) and installations, photovoltaic and all
technologies, all sectors.

    venv/bin/python -I verify/tools/eia-861-net-metering-states.py <dir with Net_Metering_2023.xlsx and Net_Metering_2025.xlsx> > verify/reference/eia-861-net-metering-states.json
"""

import json
import sys

import openpyxl

STATES = ['CA', 'TX', 'NY', 'AZ', 'MA']
out = {'source': 'EIA-861 Net_Metering workbooks, sheet "States- State Level", 2023 and 2025 files', 'states': STATES, 'years': {}}
for year in (2023, 2025):
    wb = openpyxl.load_workbook(f'{sys.argv[1]}/Net_Metering_{year}.xlsx', read_only=True, data_only=True)
    rows = list(wb['States- State Level'].iter_rows(values_only=True))
    groups, measures, fields = rows[0], rows[1], rows[2]
    def carry(r):
        last, outr = None, []
        for v in r:
            last = v if v not in (None, '') else last
            outr.append(last)
        return outr
    g, m = carry(groups), carry(measures)
    col = lambda tech, meas: next(i for i, f in enumerate(fields) if f == 'Total' and g[i] == tech and m[i] == meas)
    state_at = list(fields).index('State')
    picks = {k: col(t, me) for k, (t, me) in {'pvCapacityMw': ('Photovoltaic', 'Capacity MW'), 'pvInstallations': ('Photovoltaic', 'Installations'), 'allCapacityMw': ('All Technologies', 'Capacity MW'), 'allInstallations': ('All Technologies', 'Installations')}.items()}
    out['years'][year] = {}
    for r in rows[3:]:
        if r and r[state_at] in STATES:
            out['years'][year][r[state_at]] = {k: r[i] for k, i in picks.items()}
    wb.close()
json.dump(out, sys.stdout, indent=1)
print()
