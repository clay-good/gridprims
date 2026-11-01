"""Open Grid Emissions fixtures for the hourly carbon cross-checks
(add-hourly-carbon 1.3, 3.1): each region-year's hourly consumption-based CO2
rate, read straight out of Singularity Energy's Zenodo release by HTTP range
requests (the yearly zips are about 1.2 GB; only the few hundred kilobytes of
each region's file are fetched), and written as gzip CSV.

Open Grid Emissions Dataset 2005-2025 (early release), v0.8.0, Singularity
Energy, doi:10.5281/zenodo.22052851, CC BY 4.0.

    python3 -I verify/tools/oge-fixtures.py verify/reference/oge
"""

import csv
import gzip
import io
import os
import sys
import time
import urllib.request
import zipfile

RECORD = 'https://zenodo.org/api/records/22052851/files/results_{year}.zip/content'
# The emissions cross-check: eight regions in 2024. The cleanest-hours check: three of them over 2022 to 2024
# (the 2025 early release has no hourly carbon accounting files).
FIXTURES = [(ba, 2024) for ba in ['CISO', 'ERCO', 'PJM', 'MISO', 'ISNE', 'NYIS', 'BPAT', 'SOCO']] + [(ba, y) for ba in ['CISO', 'ERCO', 'PJM'] for y in (2022, 2023)]


class Ranged(io.RawIOBase):
    """A remote file read by HTTP range requests, retried when the host cuts one short."""

    def __init__(self, url):
        self.url, self.pos = url, 0
        self.size = int(urllib.request.urlopen(urllib.request.Request(url, method='HEAD'), timeout=60).headers['Content-Length'])

    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos

    def readinto(self, b):
        n = min(len(b), self.size - self.pos)
        if n <= 0:
            return 0
        for attempt in range(6):
            try:
                req = urllib.request.Request(self.url, headers={'Range': f'bytes={self.pos}-{self.pos + n - 1}'})
                data = urllib.request.urlopen(req, timeout=60).read()
                break
            except Exception:
                time.sleep(2 + 3 * attempt)
        else:
            raise IOError(f'range read failed at {self.pos}')
        b[:len(data)] = data
        self.pos += len(data)
        return len(data)


out = sys.argv[1]
zips = {}
for ba, year in FIXTURES:
    if os.path.exists(f'{out}/{ba}-{year}.csv.gz'):
        continue
    if year not in zips:
        zips[year] = zipfile.ZipFile(io.BufferedReader(Ranged(RECORD.format(year=year)), buffer_size=1 << 20))
    text = zips[year].read(f'carbon_accounting/hourly/us_units/{ba}.csv').decode('utf-8')
    rows = list(csv.DictReader(io.StringIO(text)))
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator='\n')
    w.writerow(['hour_start_utc', 'consumed_co2_lb_per_mwh', 'consumed_co2_lb_per_mwh_adjusted'])
    for r in rows:
        # OGE stamps each hour by its start, as "2024-01-01 08:00:00+00:00".
        w.writerow([r['datetime_utc'][:13].replace(' ', 'T'), r['consumed_co2_rate_lb_per_mwh_for_electricity'], r['consumed_co2_rate_lb_per_mwh_for_electricity_adjusted']])
    with open(f'{out}/{ba}-{year}.csv.gz', 'wb') as f:
        f.write(gzip.compress(buf.getvalue().encode('utf-8'), compresslevel=9, mtime=0))
    print(ba, year, len(rows), file=sys.stderr)
