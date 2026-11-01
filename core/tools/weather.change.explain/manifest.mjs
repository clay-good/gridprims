import { billsText, weatherText } from './examples.mjs';

export default {
  id: 'weather.change.explain',
  version: '0.1.0',
  title: 'Was it the weather?',
  purpose: 'How much of a change in your electricity use was the weather, from 12 to 24 bills and the nearest weather station.',
  archetype: 'calculator',
  firstScreen: ['periods', 'weather', 'change'],
  inputs: [
    { name: 'periods', label: 'Billing periods', type: 'text', multiline: true, example: '2025-11-01 to 2025-11-30, 812 kWh', hint: 'One bill a line, oldest or newest first: the dates and the kWh. Enter 12 to 24 bills; the latest year is compared with the bills before it.' },
    { name: 'weather', label: 'Daily temperatures', type: 'text', multiline: true, picker: 'weather-station', example: 'station USW00023183 PHOENIX AIRPORT\n2025-11-01 68.4', hint: 'Filled by the station picker: a station line, then one date and daily mean °F a line.' },
    { name: 'change', label: 'A change in the home', type: 'text', example: 'none', hint: 'none, or solar, heat pump, electric vehicle, or occupancy change with the date it began, as heat pump from 2025-10-01.' },
  ],
  outputs: [
    { name: 'total', label: 'Total change', unit: 'kWh', rounding: { decimals: 0, fixed: true } },
    { name: 'weather', label: 'Weather part', unit: 'kWh', rounding: { decimals: 0, fixed: true } },
    { name: 'use', label: 'Use part', unit: 'kWh', rounding: { decimals: 0, fixed: true } },
    { name: 'fit', label: 'Baseline fit part', unit: 'kWh', rounding: { decimals: 0, fixed: true } },
    { name: 'usePct', label: 'Use change, weather-normalized', unit: '%', rounding: { decimals: 1, fixed: true } },
    { name: 'band', label: 'Model band', unit: '± %', rounding: { decimals: 1, fixed: true } },
    { name: 'normalKwh', label: 'Use in a normal-weather year', unit: 'kWh', rounding: { decimals: 0, fixed: true } },
  ],
  method: 'The bills before the latest year are fitted with the CalTRACK billing-period model: use per day against heating and cooling degree days, four candidates (flat, heating, cooling, both) over balance points 30 to 90 °F, negative coefficients rejected, the best adjusted R² kept. The latest year\'s change is split three ways that always sum to it: the weather part (the model on this year\'s weather less the model on the baseline\'s), the use part (this year\'s actual use less the model on its weather), and the baseline fit part (the model\'s own miss on the baseline).',
  assumptions: [
    'Each bill\'s days take the station\'s daily mean temperature, the mean of the day\'s maximum and minimum.',
    'Billing periods over 35 days are left out, and a baseline needs at least 11 bills.',
    'The normal year is NOAA\'s published 1991–2020 daily degree-day normals at the published base nearest the model\'s balance point.',
  ],
  citations: [
    { source: 'CalTRACK Methods, version 2.0', edition: 'CC0', locator: 'Billing methods: candidate models, balance-point search, sufficiency, and CV(RMSE)', url: 'https://docs.caltrack.org/en/latest/methods.html' },
    { source: 'Recurve, OpenDSM data sufficiency and disqualification guidelines', edition: '2025', locator: 'Daily and billing models: CV(RMSE) above 1.0 unless PNRMSE is below 1.6', url: 'https://docs.recurve.com/flex-programs/measurement/energy%20efficiency%20and%20electrification/project-based-measurement-data-sufficiency-and-disqualification-guidelines' },
    { source: 'NOAA NCEI, Global Historical Climatology Network - Daily, Menne et al. (2012)', edition: 'version 3.35, served snapshot 2026-11', locator: 'Daily maximum and minimum temperature (TMAX, TMIN)', url: 'https://doi.org/10.7289/V5D21VHZ' },
    { source: 'NOAA NCEI, U.S. Climate Normals 1991–2020', edition: 'daily normals, version 1.0.1', locator: 'Daily heating and cooling degree-day normals (DLY-HTDD, DLY-CLDD)', url: 'https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals' },
  ],
  datasets: ['ghcn-daily', 'census-zcta-points'],
  examples: [
    { id: 'colder-winter', title: 'A winter 6 °F colder, with use otherwise the same', inputs: { periods: billsText(6), weather: weatherText(6), change: 'none' }, expect: { weather: { value: 1109, tolerance: { abs: 1 }, display: '1,109' }, total: { value: 1109, tolerance: { abs: 1 }, display: '1,109' } }, source: 'Built from stated numbers: 18 kWh a day plus 1.2 kWh per heating degree day below 60 °F, on a seasonal curve whose second winter is 6 °F colder' },
    { id: 'something-else', title: 'The same colder winter, and 4 kWh a day more for other reasons', inputs: { periods: billsText(6, { extra: 4 }), weather: weatherText(6), change: 'none' }, expect: { weather: { value: 1109, tolerance: { abs: 1 }, display: '1,109' }, use: { value: 1460, tolerance: { abs: 1 }, display: '1,460' } }, source: 'Built from stated numbers: 4 kWh a day × 365 days = 1,460 kWh of use not explained by weather' },
    { id: 'same-weather', title: 'The same weather both years, and 4 kWh a day more', inputs: { periods: billsText(0, { extra: 4 }), weather: weatherText(0), change: 'none' }, expect: { weather: { value: 0, tolerance: { abs: 1 }, display: '0' }, use: { value: 1460, tolerance: { abs: 1 }, display: '1,460' } }, source: 'Built from stated numbers: identical weather, so the whole 1,460 kWh change is use' },
  ],
  glossary: ['kwh'],
  related: ['household.usage-benchmark.compare'],
  handoffs: [{ label: 'Get your meter data for a tighter answer', url: 'https://gridprims.com/files/' }],
  stability: 'experimental',
  validation: { level: 2, evidence: [
    { kind: 'own-examples', summary: 'Three worked examples built from stated numbers (a colder winter, the same winter plus 4 kWh a day, and the same weather plus 4 kWh a day) give the stated weather and use parts, and the parts always sum to the total.' },
    { kind: 'reference-output', path: 'verify/reference/eemeter-10-meters.json', summary: 'On ten meters built on real 2024 station temperatures (heating, cooling, mixed, and flat), the model matches OpenEEmeter 3.2.0\'s CalTRACK fit exactly on model form and balance points and within 1% on every coefficient.' },
  ] },
  toRaise: 'A practitioner\'s weather-normalized result for real bills, reproduced within the model\'s band, would raise it to field-verified.',
  screeningLabel: 'A screening split of your use, not a measurement-and-verification study.',
  limitations: [
    'Bills give a looser answer than interval data; a change under 5%, or inside the model\'s band, is not a finding.',
    'The use part is what the weather does not explain; this tool never says what caused it.',
    'The station is the nearest first-order NOAA station, which may differ from your home in elevation or exposure.',
  ],
};
