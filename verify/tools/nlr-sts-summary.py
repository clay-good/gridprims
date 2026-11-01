"""NLR's own State Summary for Sharing the Sun, September 2026
(add-program-fact-pages 3.4), read with openpyxl independent of gridprims
code: community solar capacity (MW-AC) by state and year of interconnection,
in queue, and in total, from the summary's first table.

    venv/bin/python -I verify/tools/nlr-sts-summary.py "<Sharing the Sun (Sep 2026).xlsx>" > verify/reference/nlr-sts-summary-2026-09.json
"""

import json
import sys

import openpyxl

wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
rows = list(wb['State Summary'].iter_rows(values_only=True))
head_at = next(i for i, r in enumerate(rows) if r and r[1] == 'State' and 'In Queue' in r)
head = rows[head_at]
years = [(i, h) for i, h in enumerate(head) if isinstance(h, int)]
queue = head.index('In Queue')
total = next(i for i, h in enumerate(head) if isinstance(h, str) and h.startswith('Total'))
out = {'source': 'Sharing the Sun Community Solar Project Data (September 2026), sheet "State Summary", first table', 'states': {}}
for r in rows[head_at + 1:]:
    if not r or r[1] in (None, 'Total'):
        break
    out['states'][r[1]] = {'years': {str(y): r[i] for i, y in years if r[i]}, 'inQueue': r[queue] or 0, 'total': r[total] or 0}
json.dump(out, sys.stdout, indent=1)
print()
