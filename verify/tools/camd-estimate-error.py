"""The estimated-against-measured difference, recomputed apart from gridprims'
JavaScript (add-measured-plant-emissions 3.5 and 3.6).

Three regions and two years, from the publishers' own files: EPA's hourly bulk
files for the measurement, EIA's per-region workbook for the estimate, and
eGRID's plant sheet for the region each monitored plant sits in. The per-fuel
emission factors are refitted here by ordinary least squares in plain Python,
the hours are moved to UTC here from this file's own table of state offsets, and
the gates (coverage floor, fit bar, regional agreement) are applied here too, so
nothing in the result comes from the code it checks.

    python3 -m venv venv && venv/bin/pip install openpyxl
    venv/bin/python -I verify/tools/camd-estimate-error.py \\
        --epa <dir with emissions-hourly-YYYY-ss.csv> \\
        --eia <dir with {BA}.xlsx> --egrid <egrid2023_data_rev2.xlsx> \\
        --regions ISNE,NYIS,SOCO --years 2024,2025 > verify/reference/camd-estimate-error.json
"""

import argparse
import csv
import hashlib
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import openpyxl

SHORT_TON_TO_TONNE = 0.90718474
COVERAGE_FLOOR = 0.4
MIN_FIT_R2 = 0.99
GROSS_ALLOWANCE = 1.25
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)

# Standard-time offsets from UTC, in hours, for the states EPA reports; a split state takes its majority zone.
OFFSETS = {
    'AL': -6, 'AK': -9, 'AZ': -7, 'AR': -6, 'CA': -8, 'CO': -7, 'CT': -5, 'DE': -5, 'DC': -5, 'FL': -5,
    'GA': -5, 'HI': -10, 'ID': -8, 'IL': -6, 'IN': -5, 'IA': -6, 'KS': -6, 'KY': -5, 'LA': -6, 'ME': -5,
    'MD': -5, 'MA': -5, 'MI': -5, 'MN': -6, 'MS': -6, 'MO': -6, 'MT': -7, 'NE': -6, 'NV': -8, 'NH': -5,
    'NJ': -5, 'NM': -7, 'NY': -5, 'NC': -5, 'ND': -6, 'OH': -5, 'OK': -6, 'OR': -8, 'PA': -5, 'RI': -5,
    'SC': -5, 'SD': -6, 'TN': -6, 'TX': -6, 'UT': -7, 'VT': -5, 'VA': -5, 'WA': -8, 'WV': -5, 'WI': -6,
    'WY': -7, 'PR': -4,
}
FUEL_COLUMNS = ['COL', 'NG', 'OIL', 'OTH']
CLEAN_COLUMNS = ['NUC', 'WAT', 'PS', 'SUN', 'SNB', 'WND', 'WNB', 'GEO', 'BAT', 'OES', 'UES', 'UNK']


def fuel_category(name):
    first = (name or '').split(',')[0].strip().lower()
    if first in ('coal', 'coal refuse'):
        return 'COL'
    if first in ('pipeline natural gas', 'natural gas'):
        return 'NG'
    if first.endswith('oil'):
        return 'OIL'
    return 'OTH'


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def plant_regions(egrid_path):
    """ORISPL -> (balancing-authority code, state), from eGRID's plant sheet."""
    book = openpyxl.load_workbook(egrid_path, read_only=True, data_only=True)
    sheet = next(s for s in book.sheetnames if s.upper().startswith('PLNT'))
    rows = book[sheet].iter_rows(values_only=True)
    header = None
    out = {}
    for row in rows:
        values = [str(c).strip() if c is not None else '' for c in row]
        if header is None:
            if 'ORISPL' in values and 'BACODE' in values and 'PSTATABB' in values:
                header = {name: i for i, name in enumerate(values)}
            continue
        try:
            plant = int(float(values[header['ORISPL']]))
        except (ValueError, TypeError):
            continue
        ba = values[header['BACODE']]
        state = values[header['PSTATABB']]
        if ba and ba.isalnum():
            out[plant] = (ba, state)
    book.close()
    return out


def measured_hours(epa_dir, states, year, regions_of_plant, region):
    """UTC hour -> measured tonnes and gross load by fuel, for one region's monitored units."""
    hours = defaultdict(lambda: {'co2': 0.0, 'load': defaultdict(float)})
    files = []
    for state in sorted(states):
        path = os.path.join(epa_dir, f'emissions-hourly-{year}-{state.lower()}.csv')
        if not os.path.exists(path):
            continue
        files.append(path)
        offset = OFFSETS[state]
        with open(path, newline='', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                try:
                    plant = int(row['Facility ID'])
                except (TypeError, ValueError):
                    continue
                if (regions_of_plant.get(plant) or (None, None))[0] != region:
                    continue
                date = row['Date']
                if not date:
                    continue
                day = datetime(int(date[:4]), int(date[5:7]), int(date[8:10]), tzinfo=timezone.utc)
                hour = round((day - EPOCH).total_seconds() / 3600) + int(row['Hour']) - offset
                load = float(row['Gross Load (MW)'] or 0) * float(row['Operating Time'] or 0)
                bucket = hours[hour]
                bucket['co2'] += float(row['CO2 Mass (short tons)'] or 0) * SHORT_TON_TO_TONNE
                bucket['load'][fuel_category(row['Primary Fuel Type'])] += load
    return hours, files


def grid_hours(eia_dir, region):
    """UTC hour start -> EIA's published carbon dioxide, net generation, and generation by fuel."""
    path = os.path.join(eia_dir, f'{region}.xlsx')
    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = book['Published Hourly Data']
    header = None
    out = {}
    for row in sheet.iter_rows(values_only=True):
        if header is None:
            if row and 'UTC time' in [str(c).strip() if c is not None else '' for c in row]:
                header = {str(c).strip(): i for i, c in enumerate(row) if c is not None}
            continue
        when = row[header['UTC time']]
        if not isinstance(when, datetime):
            continue
        # EIA labels each hour by its end; the hour start is one hour earlier.
        hour = round((when.replace(tzinfo=timezone.utc) - EPOCH - timedelta(hours=1)).total_seconds() / 3600)
        number = lambda name: (row[header[name]] if name in header and isinstance(row[header[name]], (int, float)) else None)
        out[hour] = {
            'co2': number('CO2 Emissions Generated'),
            'net': number('Adjusted net generation') or 0.0,
            'gen': {f: (number(f'Adjusted {f} Gen') or 0.0) for f in FUEL_COLUMNS + CLEAN_COLUMNS},
        }
    book.close()
    return out, path


def least_squares(x, y):
    """Ordinary least squares by the normal equations; a column with no variation is dropped."""
    width = len(x[0]) if x else 0
    used = [any(row[j] != 0 for row in x) for j in range(width)]
    cols = [j for j in range(width) if used[j]]
    k = len(cols)
    a = [[0.0] * (k + 1) for _ in range(k)]
    for row, value in zip(x, y):
        for p in range(k):
            xp = row[cols[p]]
            if xp == 0:
                continue
            for q in range(k):
                a[p][q] += xp * row[cols[q]]
            a[p][k] += xp * value
    for p in range(k):
        pivot = max(range(p, k), key=lambda r: abs(a[r][p]))
        if abs(a[pivot][p]) < 1e-9:
            return [None] * width, float('nan')
        a[p], a[pivot] = a[pivot], a[p]
        for r in range(k):
            if r == p:
                continue
            factor = a[r][p] / a[p][p]
            if factor == 0:
                continue
            for q in range(p, k + 1):
                a[r][q] -= factor * a[p][q]
    solved = [a[p][k] / a[p][p] for p in range(k)]
    beta = [None] * width
    for p, j in enumerate(cols):
        beta[j] = solved[p]
    mean = sum(y) / len(y)
    sse = sum((value - sum(row[j] * solved[p] for p, j in enumerate(cols))) ** 2 for row, value in zip(x, y))
    sst = sum((value - mean) ** 2 for value in y)
    return beta, (float('nan') if sst == 0 else 1 - sse / sst)


def compare(region, year, epa_dir, eia_dir, regions_of_plant):
    grid, grid_file = grid_hours(eia_dir, region)
    # Only the states eGRID says this region has plants in, so a region does not read the whole country.
    states = sorted({state for ba, state in regions_of_plant.values() if ba == region and state in OFFSETS})
    measured, epa_files = measured_hours(epa_dir, states, year, regions_of_plant, region)
    columns = FUEL_COLUMNS + CLEAN_COLUMNS
    # The year's own hours: EIA's factors are annual averages and move from year to year.
    in_year = {hour: h for hour, h in grid.items() if datetime.fromtimestamp(hour * 3600, timezone.utc).year == year}
    fit_rows = [[h['gen'][c] for c in columns] for h in in_year.values() if isinstance(h['co2'], (int, float))]
    fit_y = [h['co2'] for h in in_year.values() if isinstance(h['co2'], (int, float))]
    beta, r2 = least_squares(fit_rows, fit_y)
    factors = {c: (0.0 if beta[j] is not None and beta[j] < 0 else beta[j]) for j, c in enumerate(columns)}
    measured_tonnes = estimated_tonnes = monitored_mwh = 0.0
    fuel_mwh = defaultdict(float)
    hours = unmatched = 0
    for hour, bucket in measured.items():
        if hour not in grid:
            unmatched += 1
            continue
        hours += 1
        measured_tonnes += bucket['co2']
        for fuel, mwh in bucket['load'].items():
            estimated_tonnes += mwh * (factors.get(fuel) or 0.0)
            monitored_mwh += mwh
            fuel_mwh[fuel] += mwh
    region_mwh = sum(h['net'] for h in in_year.values())
    coverage = monitored_mwh / region_mwh if region_mwh else None
    mismatch = [
        fuel for fuel in FUEL_COLUMNS
        if fuel_mwh[fuel] > monitored_mwh * 0.01
        and (factors.get(fuel) is None
             or sum(h['gen'][fuel] for h in in_year.values()) * GROSS_ALLOWANCE < fuel_mwh[fuel])
    ]
    difference = (estimated_tonnes - measured_tonnes) / measured_tonnes if measured_tonnes else None
    return {
        'region': region, 'year': year, 'hours': hours, 'unmatchedHours': unmatched,
        'measuredTonnes': round(measured_tonnes, 3), 'estimatedTonnes': round(estimated_tonnes, 3),
        'differenceTonnes': round(estimated_tonnes - measured_tonnes, 3),
        'difference': None if difference is None else round(difference, 6),
        'monitoredMwh': round(monitored_mwh, 3), 'regionMwh': round(region_mwh, 3),
        'coverage': None if coverage is None else round(coverage, 6),
        'fitR2': None if r2 != r2 else round(r2, 6),
        'factorsTonnesPerMwh': {c: (None if factors[c] is None else round(factors[c], 6)) for c in FUEL_COLUMNS},
        'fuelMismatch': mismatch,
        'informative': bool(coverage is not None and coverage >= COVERAGE_FLOOR and r2 == r2 and r2 >= MIN_FIT_R2 and not mismatch),
        'inputs': [{'file': os.path.basename(p), 'sha256': sha256(p)} for p in [grid_file] + epa_files],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--epa', required=True)
    parser.add_argument('--eia', required=True)
    parser.add_argument('--egrid', required=True)
    parser.add_argument('--regions', default='ISNE,NYIS,SOCO')
    parser.add_argument('--years', default='2024,2025')
    args = parser.parse_args()
    regions_of_plant = plant_regions(args.egrid)
    cases = []
    for region in args.regions.split(','):
        for year in [int(y) for y in args.years.split(',')]:
            cases.append(compare(region, year, args.epa, args.eia, regions_of_plant))
            print(f'{region} {year} done', file=sys.stderr)
    json.dump({
        'describes': 'The estimated-against-measured difference recomputed in Python from EPA\'s hourly files, EIA\'s per-region workbooks, and eGRID\'s plant sheet, independent of gridprims code.',
        'gates': {'coverageFloor': COVERAGE_FLOOR, 'minFitR2': MIN_FIT_R2, 'grossAllowance': GROSS_ALLOWANCE},
        'egrid': {'file': os.path.basename(args.egrid), 'sha256': sha256(args.egrid)},
        'cases': cases,
    }, sys.stdout, indent=2, sort_keys=True)
    print()


if __name__ == '__main__':
    main()
