# Builds the 50 stored ZIP lookup cases from the publishers' own files, with
# Python's standard library only (no gridprims code): the Census 2020
# ZCTA-to-county file, EIA-861's Service_Territory workbook, and EPA Power
# Profiler's Zip-subregion sheet (add-public-grid-data: utility lookup,
# "Verification of the lookup chain"). Dev-time only:
#   python3 -I verify/tools/lookup-cases.py <tab20_zcta520_county20_natl.txt> <f8612025.zip> <power_profiler_zipcode_tool_v14.3.xlsx> > verify/reference/lookup-cases.json
import hashlib, io, json, re, sys, unicodedata, zipfile
import xml.etree.ElementTree as ET
census, eia_zip, epa_xlsx = sys.argv[1:4]
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

def sheet_rows(xlsx_bytes, sheet_name):
    z = zipfile.ZipFile(io.BytesIO(xlsx_bytes))
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    rid = next(s.get('{%s}id' % NS['r']) for s in wb.find('m:sheets', NS) if s.get('name') == sheet_name)
    target = rels[rid].lstrip('/')
    path = target if target.startswith('xl/') else 'xl/' + target
    for row in ET.fromstring(z.read(path)).iter('{%s}row' % NS['m']):
        out = {}
        for c in row.findall('m:c', NS):
            col = re.match(r'[A-Z]+', c.get('r')).group(0)
            idx = 0
            for ch in col: idx = idx * 26 + ord(ch) - 64
            v = c.find('m:v', NS)
            if c.get('t') == 's': val = shared[int(v.text)]
            elif c.get('t') == 'inlineStr': val = ''.join(t.text or '' for t in c.iter('{%s}t' % NS['m']))
            else: val = v.text if v is not None else None
            out[idx - 1] = val
        yield [out.get(i) for i in range(max(out) + 1)] if out else []

def county_key(name):
    s = unicodedata.normalize('NFD', name)
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()
    s = re.sub(r'\b(county|parish|borough|census area|city and borough|municipality|municipio|planning region)\b', '', s)
    return re.sub(r'[^a-z]', '', s)
SUCCESSORS = {'AK|skagwayhoonahangoon': ['02105', '02230'], 'AK|wrangellpetersburg': ['02195', '02275'], 'AK|princeofwalesketchikan': ['02130', '02198'], 'AK|valdezcordova': ['02063', '02066'], 'VA|bedfordcity': ['51019']}
STATES = {'01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR'}

# Census: ZCTA -> counties (land overlap only, blank ZCTA dropped).
zcta = {}
key_to_fips = {}
for i, line in enumerate(open(census, encoding='utf-8-sig')):
    f = line.rstrip('\n').split('|')
    if i == 0: continue
    if not f[1] or int(f[16] or 0) == 0: continue
    zcta.setdefault(f[1], set()).add(f[9])
for i, line in enumerate(open(census, encoding='utf-8-sig')):
    f = line.rstrip('\n').split('|')
    if i == 0 or not f[1]: continue
    st = STATES.get(f[9][:2])
    if st: key_to_fips[f'{st}|{county_key(f[10])}'] = f[9]

# EIA-861 service territory: county FIPS -> utility ids.
eia = zipfile.ZipFile(eia_zip)
territory = {}
rows = list(sheet_rows(eia.read('Service_Territory_2025.xlsx'), 'Counties_States'))
for r in rows[1:]:
    if not r or not r[1]: continue
    uid, st, county = int(float(r[1])), r[4], r[5]
    k = f'{st}|{county_key(county)}'
    for fips in SUCCESSORS.get(k, [key_to_fips[k]] if k in key_to_fips else []):
        territory.setdefault(fips, set()).add(uid)

# EPA Power Profiler: ZIP -> subregions.
epa = {}
for r in list(sheet_rows(open(epa_xlsx, 'rb').read(), 'Zip-subregion'))[1:]:
    if not r or r[0] is None: continue
    z = str(int(float(r[0]))).zfill(5) if re.fullmatch(r'\d+(\.0)?', str(r[0])) else str(r[0]).strip()
    epa[z] = sorted(s for s in r[1:4] if s)

def case(z, kind):
    counties = sorted(zcta.get(z, []))
    utilities = sorted(set().union(*[territory.get(c, set()) for c in counties])) if counties else []
    return {'zip': z, 'kind': kind, 'counties': counties, 'utilities': utilities, 'subregions': epa.get(z, [])}

pick = lambda zs, n: [zs[i * len(zs) // n] for i in range(n)]
with_zcta = sorted(z for z in zcta if z in epa)
single = [z for z in with_zcta if len(zcta[z]) == 1 and len(territory.get(next(iter(zcta[z])), ())) == 1]
overlap = [z for z in with_zcta if len(zcta[z]) == 1 and len(territory.get(next(iter(zcta[z])), ())) > 1]
multi = [z for z in with_zcta if len(zcta[z]) > 1]
no_zcta = sorted(z for z in epa if z not in zcta and z[:3] in {k[:3] for k in zcta})
multi_sub = [z for z in with_zcta if len(epa[z]) > 1]
cases = [case(z, 'single-utility') for z in pick(single, 10)] + [case(z, 'overlapping') for z in pick(overlap, 10)] + \
        [case(z, 'multi-county') for z in pick(multi, 10)] + [case(z, 'no-zcta') for z in pick(no_zcta, 10)] + \
        [case(z, 'multi-subregion') for z in pick(multi_sub, 10)]
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
json.dump({'source': 'Census 2020 ZCTA-to-county file, EIA-861 2025 Service_Territory, and EPA Power Profiler v14.3 Zip-subregion, read with the Python standard library by verify/tools/lookup-cases.py',
           'files': {'census': sha(census), 'eia861': sha(eia_zip), 'powerProfiler': sha(epa_xlsx)}, 'cases': cases}, sys.stdout, indent=1)
print()
