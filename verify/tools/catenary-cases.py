"""Exact-catenary reference cases for lines.midspan-clearance.check
(add-overhead-line-checks 4.4).

RUS Bulletin 1724E-152 gives the parabolic sag method but no worked examples,
so the test vectors come from the exact catenary y = c*cosh((x - x0)/c) with
c = H/w, solved in plain Python for supports at (0, 0) and (S, h). Each case
records the catenary sag below the chord at midspan; the parabolic value is
not computed here. Shares no code with core/lib.

    python3 -I verify/tools/catenary-cases.py OUT.json
"""

import json
import math
import sys

SPANS = [75, 100, 150, 200, 250, 300, 400, 500, 600, 800]
WEIGHTS = [0.1, 0.3, 0.5, 1.0, 2.0]
SAG_SHARES = [0.005, 0.01, 0.02, 0.035, 0.045, 0.06, 0.08]
DIFFS = [0, 2, 5, 10]


def sag(S, w, H, h):
    c = H / w
    def f(x0):
        return c * (math.cosh((S - x0) / c) - math.cosh(x0 / c)) - h
    lo, hi = -10 * S, 10 * S
    for _ in range(300):
        mid = (lo + hi) / 2
        # f decreases as x0 grows.
        if f(mid) > 0:
            lo = mid
        else:
            hi = mid
    x0 = (lo + hi) / 2
    y_mid = c * (math.cosh((S / 2 - x0) / c) - math.cosh(x0 / c))
    return h / 2 - y_mid


cases = []
for i in range(50):
    S = SPANS[i % len(SPANS)]
    w = WEIGHTS[(i * 3) % len(WEIGHTS)]
    share = SAG_SHARES[(i * 5) % len(SAG_SHARES)]
    h = DIFFS[(i * 7) % len(DIFFS)]
    # Pick the tension that gives roughly this parabolic sag share, rounded to a whole pound.
    H = round(w * S / (8 * share))
    cases.append({'id': i + 1, 'span_ft': S, 'weight_lb_per_ft': w, 'tension_lb': H, 'height_diff_ft': h, 'catenary_sag_ft': round(sag(S, w, H, h), 6)})

json.dump({'note': 'Exact catenary sag below the chord at midspan, by bisection on the catenary through both supports; see verify/tools/catenary-cases.py.', 'cases': cases}, open(sys.argv[1], 'w'), indent=1)
