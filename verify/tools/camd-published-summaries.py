"""EPA's own published daily summaries, summed to months apart from gridprims'
JavaScript (add-measured-plant-emissions 1.5): ten monitored units across three
states and two years, read from EPA's daily bulk files with Python's csv module.

The daily files are EPA's own aggregation of the same hourly records our
pipeline reads, so a month that matches is a check of our reading of the hourly
files against EPA's reading of them.

    for s in al de pa; do for y in 2024 2025; do
      curl -sO "https://api.epa.gov/easey/bulk-files/emissions/daily/state/emissions-daily-$y-$s.csv"; done; done
    python3 -I verify/tools/camd-published-summaries.py <dir with the daily files> > verify/reference/camd-published-summaries.json
"""

import csv
import json
import os
import sys
from collections import defaultdict

STATES = ['AL', 'DE', 'PA']
YEARS = [2024, 2025]
SHORT_TON_TO_TONNE = 0.90718474  # the factor EPA states
PER_STATE = 4 if len(STATES) * 4 >= 10 else 10  # ten units or more, evenly across the states

NUM = lambda s: float(s) if s not in ('', None) else 0.0


def read(path):
    """Daily rows: (plant id, unit id, year, month) -> EPA's daily totals."""
    out = defaultdict(lambda: defaultdict(float))
    with open(path, newline='', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            date = row['Date']
            key = (int(row['Facility ID']), row['Unit ID'], int(date[:4]), int(date[5:7]))
            out[key]['co2_short_tons'] += NUM(row['CO2 Mass (short tons)'])
            out[key]['so2_short_tons'] += NUM(row['SO2 Mass (short tons)'])
            out[key]['nox_short_tons'] += NUM(row['NOx Mass (short tons)'])
            out[key]['heat_input_mmbtu'] += NUM(row['Heat Input (mmBtu)'])
            out[key]['gross_load_mwh'] += NUM(row['Gross Load (MWh)'])
            out[key]['operating_hours'] += NUM(row['Sum of the Operating Time'])
    return out


def main(directory):
    months = {}
    for state in STATES:
        totals = defaultdict(lambda: defaultdict(float))
        for year in YEARS:
            path = os.path.join(directory, f'emissions-daily-{year}-{state.lower()}.csv')
            for key, value in read(path).items():
                for name, n in value.items():
                    totals[key][name] += n
        # The state's largest emitters in the first year, by unit, so the choice does not move with the data.
        annual = defaultdict(float)
        for (plant, unit, year, _month), value in totals.items():
            if year == YEARS[0]:
                annual[(plant, unit)] += value['co2_short_tons']
        chosen = sorted(annual, key=lambda k: (-annual[k], k[0], k[1]))[:PER_STATE]
        for plant, unit in chosen:
            for year in YEARS:
                for month in range(1, 13):
                    value = totals.get((plant, unit, year, month))
                    if not value:
                        continue
                    months[f'{plant}|{unit}|{year}|{month}'] = {
                        'state': state, 'plant_id': plant, 'unit_id': unit, 'year': year, 'month': month,
                        'co2_tonnes': round(value['co2_short_tons'] * SHORT_TON_TO_TONNE, 6),
                        'so2_lbs': round(value['so2_short_tons'] * 2000, 6),
                        'nox_lbs': round(value['nox_short_tons'] * 2000, 6),
                        'heat_input_mmbtu': round(value['heat_input_mmbtu'], 6),
                        'gross_load_mwh': round(value['gross_load_mwh'], 6),
                        'operating_hours': round(value['operating_hours'], 6),
                    }
    units = sorted({(v['state'], v['plant_id'], v['unit_id']) for v in months.values()})
    json.dump({
        'source': 'EPA CAMPD daily bulk files (emissions/daily/state), read with Python csv',
        'conversion': {'co2': 'short tons x 0.90718474 = metric tons', 'so2_nox': 'short tons x 2000 = lb'},
        'states': STATES, 'years': YEARS,
        'units': [{'state': s, 'plant_id': p, 'unit_id': u} for s, p, u in units],
        'months': months,
    }, sys.stdout, indent=2, sort_keys=True)
    print()


if __name__ == '__main__':
    main(sys.argv[1])
