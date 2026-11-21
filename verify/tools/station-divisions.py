# Places each weather station in its NOAA climate division (add-weather-normalization 1.3), for the check of
# our degree days against NOAA's published division series. Reads the stations table of the GHCN-Daily
# snapshot and NOAA's CONUS climate division boundaries (CONUS_CLIMATE_DIVISIONS.shp.zip from
# ncei.noaa.gov/monitoring-content/data/us/climdiv/monthly/current/), and tests each station's coordinates
# against each division's rings (even-odd rule). Dev-time only, with pyshp:
#   python -I verify/tools/station-divisions.py data/ghcn-daily/2026-11/stations.csv.gz /tmp/shp/GIS.OFFICIAL_CLIM_DIVISIONS > verify/reference/weather/station-divisions.json
import csv, gzip, hashlib, json, sys
import shapefile

stations_path, shp = sys.argv[1], sys.argv[2]
r = shapefile.Reader(shp=open(shp + '.shp', 'rb'), dbf=open(shp + '.dbf', 'rb'), shx=open(shp + '.shx', 'rb'), encoding='cp1252')
fields = [f[0] for f in r.fields[1:]]
divisions = []
for sr in r.iterShapeRecords():
    rec = dict(zip(fields, sr.record))
    pts, parts = sr.shape.points, list(sr.shape.parts) + [len(sr.shape.points)]
    rings = [pts[parts[i]:parts[i + 1]] for i in range(len(parts) - 1)]
    divisions.append((f"{int(rec['CLIMDIV']):04d}", rec['NAME'], sr.shape.bbox, rings))

def inside(x, y, rings):
    hit = False
    for ring in rings:
        for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                hit = not hit
    return hit

out = {}
with gzip.open(stations_path, 'rt', newline='') as f:
    for row in csv.DictReader(f):
        x, y = float(row['lon']), float(row['lat'])
        found = [d for d in divisions if d[2][0] <= x <= d[2][2] and d[2][1] <= y <= d[2][3] and inside(x, y, d[3])]
        if len(found) == 1:
            out[row['station']] = {'division': found[0][0], 'name': found[0][1]}

json.dump({'source': {'boundaries': 'CONUS_CLIMATE_DIVISIONS.shp.zip', 'shp_sha256': hashlib.sha256(open(shp + '.shp', 'rb').read()).hexdigest()}, 'stations': dict(sorted(out.items()))}, sys.stdout, indent=1)
sys.stdout.write('\n')
