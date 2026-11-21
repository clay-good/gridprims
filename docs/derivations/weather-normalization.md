# Weather normalization

Used by `core/lib/weather-model.mjs`, `core/lib/weather-stations.mjs`, and the `ghcn-daily` and `census-zcta-points` datasets (add-weather-normalization).

**What it gives you:** how much of a change in your use was the weather, from your own meter or bills and the nearest NOAA station, with the model's quality shown and an honest "too small to call."

## Sources

| What | Source | License |
|---|---|---|
| The method | CalTRACK 2.0 method documentation (daily and billing-period models) | CC0 |
| The alternative fit criterion (PNRMSE) | Recurve's OpenDSM data sufficiency and disqualification guidelines | Published guidance |
| The reference implementation we check against | OpenEEmeter 3.2.0, `fit_caltrack_usage_per_day_model` | Apache-2.0 |
| Daily temperatures | NOAA GHCN-Daily per-station files, 1,117 first-order stations, from 2019 | U.S. federal work; NOAA asks for the Menne et al. (2012) citation |
| The normal year | NOAA NCEI 1991–2020 daily degree-day normals, per station | U.S. federal work |
| ZIP locations | Census 2020 Gazetteer ZCTA internal points | U.S. federal work |

ASHRAE Guideline 14 and IPMVP are paywalled. We have not read them, and we claim no conformance to them.

## Choices we made

| Choice | Why |
|---|---|
| Balance points 30 to 90 °F every 3 °F | CalTRACK's widest allowed spacing; OpenEEmeter run on the same grid. |
| No p-value screen | CalTRACK's default (`beta_*_maximum_p_value = 1`); the spec rejects negative coefficients only. |
| PNRMSE is RMSE over the interquartile range of observed use per day | OpenDSM's percentile-normalized RMSE. The spec calls it "predicted-to-actual normalized RMSE"; if OpenDSM's definition differs in detail, this is the one we apply. |
| A 7-day floor on consecutive missing station days | CalTRACK's 6-hour limit is for hourly models; for daily models the floor is ours. |
| The normal year at the published base nearest the balance point | NCEI publishes degree-day normals only at 40, 45, 50, 55, 57, 60, and 65 °F (heating), plus 70 and 72 °F (cooling). A model with a 58 °F balance point is priced at base 57. The result names the base. |
| First-order stations only | They have the most complete records and published normals. Cooperative-observer stations are not shipped. |
| Per-state shards | The browser asks for one state's file. No request names a station, a county, or a ZIP. |

## Checked against

- **OpenEEmeter on ten meters** (`verify/reference/eemeter-10-meters.json`): three heating-dominated, three cooling-dominated, two mixed, and two flat, on 2024 temperatures at Boston, Minneapolis, Chicago, Phoenix, Houston, Miami, Atlanta, Kansas City, San Diego, and Seattle. Every model form and balance point matches exactly, and every coefficient is within 1%.
- **NOAA's own monthly station degree days** (`verify/reference/weather/gsom-5-stations.json`): base-65 heating and cooling degree days from the Global Summary of the Month for Denver, Los Angeles, Miami, Atlanta, and Dallas, September 2024 to August 2026. Every month both publish agrees within GSOM's rounding (0.1 °C degree day, 0.18 °F degree day); the largest difference is 0.1 °F degree day (`verify/tests/core/degree-days-gsom.test.mjs`).
- **Not a target: NOAA's climate-division degree days.** We placed each station in its division with NOAA's boundaries (`verify/tools/station-divisions.py`) and averaged our station months over the division. For the best-covered division in each of five states, fixed before looking (CA 0406, TX 4103, FL 0801, CO 0502, AL 0107), our averages missed NOAA's series by more than 5% or 10 degree days in 10 to 24 of 24 months. Denver's division ran 7% to 30% short on heating (January 2025: 1,350 against 1,457), and the Southern California coast up to 40% (January 2025: 310 against 434). NOAA's divisional readme says why: its divisional degree days are "derived from the adjusted temperatures using a statistical algorithm" with population weights, not summed from daily station means. The spec's division check is replaced by the station check above.
