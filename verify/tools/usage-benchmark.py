# Builds the usage-benchmark reference (add-household-bill-check task 3.1,
# "Verification"): EIA's published average monthly residential consumption
# by state from Table 5A, read with Python's standard library only (no
# gridprims code), and three utilities' averages computed by hand in exact
# decimals from their EIA-861 2025 rows. Dev-time only:
#   python3 -I verify/tools/usage-benchmark.py <table_5A.xlsx> > verify/reference/eia-table-5a-usage.json
import hashlib, io, json, re, sys, zipfile
from decimal import Decimal, ROUND_HALF_UP
import xml.etree.ElementTree as ET
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

STATES = {'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'}

data = open(sys.argv[1], 'rb').read()
z = zipfile.ZipFile(io.BytesIO(data))
sheet = ET.fromstring(z.read('xl/workbook.xml')).find('m:sheets', NS)[0].get('name')
rows = list(sheet_rows(data, sheet))
title = rows[0][0]
states = {}
for r in rows:
    if r and r[0] in STATES:
        states[STATES[r[0]]] = {'customers': int(float(r[1])), 'averageMonthlyKwh': round(float(r[2]), 4)}

# Three utilities, by hand: residential sales (MWh) x 1,000 / residential customers, from EIA-861 2025's
# Sales_Ult_Cust (Austin Energy, Green Mountain Power) and Sales_Ult_Cust_CS delivery rows (Oncor).
CASES = [('TX', 1015, 'Austin Energy', 'A', 'Bundled', 5234369, 522446),
         ('TX', 44372, 'Oncor Electric Delivery Company LLC', 'C', 'Delivery', 47049703, 3545814),
         ('VT', 7601, 'Green Mountain Power Corp', 'A', 'Bundled', 1641614, 227727)]
cases = []
for st, uid, name, part, stype, mwh, cust in CASES:
    avg = Decimal(mwh) * 1000 / Decimal(cust)
    whole = int(avg.quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    pct = ((Decimal(14400) / Decimal(whole) - 1) * 100).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
    cases.append({'state': st, 'utilityId': uid, 'utility': name, 'dataYear': 2025,
                  'rows': [{'part': part, 'service_type': stype, 'res_sales_mwh': mwh, 'res_customers': cust}],
                  'work': f'{mwh:,} MWh x 1,000 / {cust:,} customers = {avg:.2f} kWh a year',
                  'averageKwhPerYear': whole, 'home14400': {'annualKwh': 14400, 'percentFromAverage': float(pct)}})

print(json.dumps({
    'source': 'U.S. Energy Information Administration, Electric Sales, Revenue, and Average Price, Table 5A, https://www.eia.gov/electricity/sales_revenue_price/xls/table_5A.xlsx, retrieved 2026-10-31',
    'title': title, 'dataYear': int(re.match(r'\d{4}', title).group(0)), 'sha256': hashlib.sha256(data).hexdigest(),
    'method': 'EIA-861 residential sales x 1,000 / residential customers / 12, delivery-only rows left out of state totals',
    'states': dict(sorted(states.items())), 'utilities': cases}, indent=2))
