"""Typical July medians and quartiles of consumption-based CO2 intensity for
three regions (add-hourly-carbon 2.4, cleanest-hours "Verification"),
computed apart from gridprims' JavaScript: the column shards are parsed here
from docs/formats/column-shard.md with the standard library, hours are put
on the local clock with zoneinfo, and quantiles use the linear method
(statistics.quantiles with method='inclusive').

    python3 -I verify/tools/eia-930-typical.py data/eia-930/<version> > verify/reference/eia-930-typical-july.json
"""

import json
import statistics
import struct
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

REGIONS = {'CISO': 'America/Los_Angeles', 'ERCO': 'America/Chicago', 'PJM': 'America/New_York'}
YEARS = [2023, 2024, 2025]
src = sys.argv[1]


def columns(path, names):
    b = open(path, 'rb').read()
    assert b[:4] == b'GPC1'
    n = struct.unpack_from('<I', b, 4)[0]
    header = json.loads(b[8:8 + n])
    start = (8 + n + 7) // 8 * 8
    out = {}
    for c in header['columns']:
        if c['name'] not in names:
            continue
        at, rows = start + c['offset'], header['rows']
        if c['type'] == 'i32':
            vals = struct.unpack_from(f'<{rows}i', b, at)
            out[c['name']] = [None if v == -2147483648 else v / c['scale'] for v in vals]
        elif c['type'] == 'f32':
            out[c['name']] = [None if v != v else v for v in struct.unpack_from(f'<{rows}f', b, at)]
        else:
            out[c['name']] = [None if v != v else v for v in struct.unpack_from(f'<{rows}d', b, at)]
    return out


def quartiles(v):
    v = sorted(v)
    if len(v) == 1:
        return v[0], v[0], v[0]
    q1, med, q3 = statistics.quantiles(v, n=4, method='inclusive')
    return q1, med, q3


result = {'method': 'Standard-library parse of the shards, zoneinfo local hours, statistics.quantiles inclusive (linear) quartiles', 'years': YEARS, 'unit': 'lb/MWh', 'regions': {}}
for ba, zone in REGIONS.items():
    tz = ZoneInfo(zone)
    cells = [[] for _ in range(24)]
    # A July in local time can start in the UTC year before (never for these zones), so the year's own shard suffices.
    for y in YEARS:
        c = columns(f'{src}/hourly/{ba}-{y}.bin', {'hour', 'intensity_consumed'})
        for h, x in zip(c['hour'], c['intensity_consumed']):
            if x is None:
                continue
            local = datetime.fromtimestamp(h * 3600, tz=timezone.utc).astimezone(tz)
            if local.year == y and local.month == 7:
                cells[local.hour].append(x * 1000)
    result['regions'][ba] = [dict(zip(['hour', 'n', 'q1', 'median', 'q3'], [hr, len(v), *quartiles(v)])) for hr, v in enumerate(cells)]
json.dump(result, sys.stdout, indent=1)
print()
