# Generates 50 steady-state ampacity reference cases with two open
# implementations of the IEEE 738 heat balance, linerate 5.0.0 (MIT) and
# pypacity 0.1.3 (GPL-3.0), for the line-rating tool's cross-check
# (add-grid-calculators task 1.2). Only their outputs are stored; neither is
# ever bundled. Inputs vary conductor size, resistance,
# surface, temperature limits, weather, elevation, latitude, line bearing,
# date, and hour. Dev-time only, with both under Python 3.12:
#   python verify/tools/line-rating-cases.py > verify/reference/line-rating/ieee738-cases.json
import json, math
import numpy as np
import linerate, pypacity
from pypacity.cable.cable import Cable
from pypacity.case.case import Case
from pypacity.ieee738.ieee738 import IEEE738 as Pypacity738
from linerate.types import Conductor, Span, Tower, Weather
from linerate.models.ieee738 import IEEE738

# Bare-conductor sizes (outer diameter m, AC resistance ohm/m at 25 and 75 C) spanning common ACSR.
CONDUCTORS = [(0.01831, 1.39e-4, 1.65e-4), (0.02517, 7.28e-5, 8.69e-5), (0.02812, 5.88e-5, 7.02e-5), (0.03198, 4.53e-5, 5.42e-5), (0.0352, 3.69e-5, 4.43e-5)]
cases = []
for i in range(50):
    D, R25, R75 = CONDUCTORS[i % 5]
    eps = [0.5, 0.7, 0.8, 0.9][i % 4]
    alpha = [0.5, 0.8, 0.9][i % 3]
    tmax = [75, 90, 100, 120][(i // 2) % 4]
    ta = [-10, 0, 15, 25, 35, 40][i % 6]
    wind = [0.3, 0.61, 1.0, 2.0, 4.0][(i // 3) % 5]
    attack = [90, 60, 45, 20, 0][(i // 5) % 5]
    elev = [0, 300, 1000, 1800][(i // 7) % 4]
    lat = [25.0, 32.0, 40.0, 47.0][(i // 4) % 4]
    bearing = [0, 30, 90, 135, 210][(i // 6) % 5]
    month, day = [(6, 10), (7, 4), (1, 15), (9, 21), (12, 21)][(i // 8) % 5]
    hour = [11, 12, 14, 16, 20][(i // 9) % 5]
    c = Conductor(core_diameter=D / 3, conductor_diameter=D, outer_layer_strand_diameter=D / 9, emissivity=eps, solar_absorptivity=alpha,
                  temperature1=25, temperature2=75, resistance_at_temperature1=R25, resistance_at_temperature2=R75,
                  aluminium_cross_section_area=float('nan'), constant_magnetic_effect=1, current_density_proportional_magnetic_effect=0,
                  max_magnetic_core_relative_resistance_increase=1)
    d = 0.001
    b = math.radians(bearing)
    start = Tower(latitude=lat, longitude=0.0, altitude=elev)
    end = Tower(latitude=lat + d * math.cos(b), longitude=d * math.sin(b) / math.cos(math.radians(lat)), altitude=elev)
    span = Span(conductor=c, start_tower=start, end_tower=end, num_conductors=1)
    azimuth = float(np.degrees(span.conductor_azimuth))
    w = Weather(air_temperature=ta, wind_direction=float(span.conductor_azimuth) + math.radians(attack), wind_speed=wind, ground_albedo=0.1, clearness_ratio=1)
    when = np.datetime64(f'2025-{month:02d}-{day:02d}T{hour:02d}:00')
    m = IEEE738(span, w, when)
    amps = float(m.compute_steady_state_ampacity(tmax, min_ampacity=0, max_ampacity=8000, tolerance=0.001))
    # pypacity: steady-state rating mode, solar computed from the sun at the same solar hour.
    cab = Cable(); cab.D = D * 1000; cab.TLO = 25; cab.THI = 75; cab.RLO = R25; cab.RHI = R75; cab.EMISS = eps; cab.ABSORP = alpha; cab.TCDRMAX = tmax
    cs = Case(); cs.demo(2)
    cs.TAMB = ta; cs.VWIND = wind; cs.Z1_DEG = azimuth; cs.DWIND_DEG = (azimuth + attack) % 360; cs.WINDANG_DEG = attack; cs.CDR_ELEV = elev
    cs.CDR_LAT_DEG = float(span.latitude); cs.NDAY = int(when.astype('datetime64[D]').astype(object).timetuple().tm_yday); cs.SUN_TIME = hour; cs.A3 = 0; cs.TCDRPRELOAD = tmax
    p = Pypacity738(); p.set_cable(cab); p.set_case(cs); p.ieee_738()
    cases.append({'id': i + 1, 'diameterM': D, 'r25OhmPerM': R25, 'r75OhmPerM': R75, 'emissivity': eps, 'absorptivity': alpha, 'maxTempC': tmax,
                  'ambientC': ta, 'windMps': wind, 'windAngleDeg': attack, 'elevationM': elev, 'latitude': span.latitude, 'lineAzimuthDeg': azimuth,
                  'dayOfYear': int(when.astype('datetime64[D]').astype(object).timetuple().tm_yday), 'solarHour': hour, 'ampsLinerate': round(amps, 3), 'ampsPypacity': round(float(cs.TR), 3)})
print(json.dumps({'engine': f'linerate {linerate.__version__} (MIT), IEEE738 model, and pypacity {pypacity.__version__} (GPL-3.0), steady-state rating; clear atmosphere; the hour is solar time',
                  'notes': 'linerate takes solar declination as 23.3 degrees × sin(2π(284 + N)/365); pypacity and IEEE 738 use about 23.46 degrees.', 'cases': cases}, indent=1))
