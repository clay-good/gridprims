# An independent rerun of the scorecard's URDB bills (add-tariff-conformance-suite 3.5): reads the raw URDB
# bulk rows from the snapshot's rates.csv.gz with Python's csv module and prices each listed rate at each
# listed level from the record's own fields (fixed charge, energy tiers with their adjustments, the month's
# period from the weekday schedule), in Decimal with each line rounded half up to the cent. It shares no code
# with gridprims' engine. Dev-time only, Python 3 standard library:
#   node verify/tools/scorecard-rates.mjs > /tmp/rates.json
#   python3 -I verify/tools/scorecard-rerun.py data/urdb/2026-10/rates.csv.gz /tmp/rates.json > verify/reference/scorecard/urdb-rerun.json
import csv, gzip, hashlib, json, sys, calendar
from decimal import Decimal, ROUND_HALF_UP

csv.field_size_limit(10**9)
raw_path, rates_path = sys.argv[1], sys.argv[2]
wanted = json.load(open(rates_path))
labels = {r['label'] for r in wanted}
rows = {}
with gzip.open(raw_path, 'rt', newline='') as f:
    for row in csv.DictReader(f):
        if row['label'] in labels:
            rows[row['label']] = row

cent = lambda d: d.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def bill(row, month, kwh):
    y, m = int(month[:4]), int(month[5:7])
    days = calendar.monthrange(y, m)[1]
    lines = []
    fixed = Decimal(row['fixed_charge'] or '0')
    if fixed:
        per_day = row['fixed_charge_units'] == '$/day'
        lines.append(cent(fixed * days if per_day else fixed))
    schedule = json.loads(row['energy_weekday_schedule'])
    if len(set(schedule[m - 1])) != 1:
        raise SystemExit(f"{row['label']}: the {month} weekday schedule changes by hour; this rerun prices flat-by-hour records only")
    period = schedule[m - 1][0]
    tiers = json.loads(row['energy_rate_structure'])[period]['energyRateTiers']
    left, floor = Decimal(kwh), Decimal(0)
    for t in tiers:
        rate = Decimal(str(t.get('rate', 0))) + Decimal(str(t.get('adj', 0)))
        top = Decimal(str(t['max'])) if 'max' in t else None
        used = left if top is None else min(left, top - floor)
        if used > 0:
            lines.append(cent(used * rate))
            left -= used
        if top is not None:
            floor = top
        if left <= 0:
            break
    total = sum(lines, Decimal(0))
    minimum = Decimal(row['min_charge'] or '0')
    if minimum and total < minimum:
        total = minimum
    return float(total)

out = {'source': {'file': raw_path.split('/')[-1], 'sha256': hashlib.sha256(open(raw_path, 'rb').read()).hexdigest()}, 'bills': []}
for r in wanted:
    row = rows.get(r['label'])
    if row is None:
        out['bills'].append({'label': r['label'], 'missing': True})
        continue
    out['bills'].append({'label': r['label'], 'month': r['month'], 'levels': [{'kwh': k, 'bill': bill(row, r['month'], k)} for k in r['kwh']]})
json.dump(out, sys.stdout, indent=2)
sys.stdout.write('\n')
