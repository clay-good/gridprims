# Generates Shapiro-Wilk reference cases with SciPy's scipy.stats.shapiro
# (Royston's AS R94, the algorithm R's shapiro.test also uses) for the
# major-event-day normality check (add-reliability-tools task 3.3). Only the
# outputs are stored; SciPy is never bundled. Samples span n = 3 to 2,000:
# normal, log-normal, uniform, exponential, heavy-tailed, tied, and the
# logarithms of skewed outage-like daily minutes. Dev-time only, with SciPy
# 1.18.1 under Python 3.14:
#   python verify/tools/shapiro-wilk-cases.py > verify/reference/shapiro-wilk/scipy-cases.json
import json
import numpy as np
from scipy import stats, __version__

rng = np.random.default_rng(20261114)
samples = []
def add(name, xs):
    xs = [float(round(x, 6)) for x in xs]
    w, p = stats.shapiro(xs)
    samples.append({'name': name, 'n': len(xs), 'x': xs, 'W': float(w), 'p': float(p)})

add('n3', [1.0, 2.0, 4.0])
add('n3-even', [1.0, 2.0, 3.0])
for n in (4, 5, 6, 7, 11, 12, 20, 30, 50, 100, 365, 1000, 2000):
    add(f'normal-{n}', rng.normal(10, 2, n))
for n in (5, 11, 12, 30, 200):
    add(f'uniform-{n}', rng.uniform(0, 1, n))
for n in (8, 30, 150):
    add(f'exponential-{n}', rng.exponential(1, n))
for n in (40, 300):
    add(f'lognormal-{n}', rng.lognormal(0, 1, n))
add('student-t3-80', rng.standard_t(3, 80))
add('ties-25', [1, 1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 8, 9, 10, 10, 11, 12])
# Logarithms of daily minutes per customer: mostly quiet days with small values and a few storm days,
# the shape a small utility's log has, which often fails.
daily = np.concatenate([rng.lognormal(-1.5, 0.9, 120), rng.lognormal(3.5, 0.6, 8)])
add('log-daily-128', np.log(daily))
add('log-daily-normal-500', np.log(rng.lognormal(-1, 1, 500)))
print(json.dumps({'tool': f'scipy.stats.shapiro (SciPy {__version__})', 'cases': samples}, indent=1))
