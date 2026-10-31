# Builds data/curated/conductors-acsr.json, the line-rating tool's starter
# conductor library (add-grid-calculators task 1.4), from USDA RUS Bulletin
# 1724E-200, "Design Manual for High Voltage Transmission Lines" (revised May
# 2009; public domain), Appendix B, "ACSR Conductors, NESC District Loadings"
# (pages B-3 and B-4 of the bulletin): each conductor's code name, size, stranding,
# and outside diameter. Resistances are not in the bulletin and are not added.
# Dev-time only, with poppler's pdftotext -layout output of the bulletin:
#   python3 -I verify/tools/rus-acsr.py <rus.pdf> <rus.txt> > data/curated/conductors-acsr.json
import hashlib, json, re, sys

pdf, txt = sys.argv[1:3]
lines = open(txt).read().split('\n')
start = next(i for i, l in enumerate(lines) if 'ACSR CONDUCTORS' in l and 'NESC DISTRICT LOADINGS' in lines[i + 1])
rows = []
row = re.compile(r'^([A-Z]+)\s+([\d/.]+)\s+(\d+/\d+)\s+(?:[\d.]+\s+){9}\d+\s+([\d.]+)\s+[\d.]+\s*$')
for l in lines[start:start + 120]:
    if 'HIGH WIND LOADINGS' in l: break
    m = row.match(l.strip())
    if m and m.group(1) not in {r['name'] for r in rows}:
        size = m.group(2)
        rows.append({'name': m.group(1).title(), 'size': size if '/' in size else f'{float(size):g} kcmil', 'stranding': m.group(3), 'diameterIn': float(m.group(4))})
print(json.dumps({
    'source': 'USDA Rural Utilities Service, Bulletin 1724E-200, Design Manual for High Voltage Transmission Lines, revised May 2009, Appendix B, ACSR Conductors, NESC District Loadings (bulletin pages B-3 and B-4)',
    'url': 'https://www.govinfo.gov/content/pkg/GOVPUB-A68-PURL-LPS124223/pdf/GOVPUB-A68-PURL-LPS124223.pdf',
    'license': 'U.S. federal government work, public domain',
    'sha256': hashlib.sha256(open(pdf, 'rb').read()).hexdigest(),
    'note': 'Diameters only. The bulletin gives no AC resistance, and no public-domain resistance table was found, so the user enters resistance from the manufacturer.',
    'conductors': rows,
}, indent=1))
