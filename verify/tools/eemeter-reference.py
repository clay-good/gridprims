"""OpenEEmeter's CalTRACK daily model on the ten reference meters
(add-weather-normalization 2.5): eemeter 3.2.0 (Apache-2.0), balance points
30 to 90 °F every 3 °F, no p-value screen (CalTRACK's own default), each
day's temperature given as 24 equal hourly values of the station's daily mean.

    python3.11 -m venv venv && venv/bin/pip install eemeter==3.2.0 pytz "setuptools<70"
    node verify/tools/weather-meters.mjs > meters-in.json
    venv/bin/python -W ignore verify/tools/eemeter-reference.py meters-in.json > verify/reference/eemeter-10-meters.json
"""

import json
import sys

import pandas as pd
import eemeter

inp = json.load(open(sys.argv[1]))
BPS = list(range(30, 91, 3))
out = {'engine': f'eemeter {eemeter.__version__} (Apache-2.0), caltrack usage per day', 'balancePoints': '30 to 90 °F every 3 °F', 'snapshot': inp['snapshot'], 'cases': []}
for c in inp['cases']:
    days = pd.to_datetime([d['date'] for d in c['daily']]).tz_localize('UTC')
    meter = pd.DataFrame({'meter_value': [d['kwh'] for d in c['daily']]}, index=days)
    hours = pd.date_range(days[0], days[-1] + pd.Timedelta(hours=23), freq='H')
    by_day = {d['date']: d['meanF'] for d in c['daily']}
    temp = pd.Series([by_day.get(h.strftime('%Y-%m-%d')) for h in hours], index=hours, dtype=float)
    feats = eemeter.compute_temperature_features(meter.index, temp, heating_balance_points=BPS, cooling_balance_points=BPS, data_quality=True)
    data = eemeter.merge_features([meter, feats])
    res = eemeter.fit_caltrack_usage_per_day_model(data)
    m = res.model
    p = m.model_params
    out['cases'].append({
        'id': c['id'],
        'inputs': c['daily'],
        'expected': {
            'type': {'intercept_only': 'flat', 'cdd_only': 'cdd', 'hdd_only': 'hdd', 'cdd_hdd': 'hdd_cdd'}[m.model_type],
            'heatingBalance': p.get('heating_balance_point'), 'coolingBalance': p.get('cooling_balance_point'),
            'intercept': p.get('intercept'), 'heating': p.get('beta_hdd'), 'cooling': p.get('beta_cdd'),
            'adjR2': m.r_squared_adj,
        },
    })
json.dump(out, sys.stdout, indent=1)
print()
