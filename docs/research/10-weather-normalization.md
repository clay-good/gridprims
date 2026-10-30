# Weather normalization: "was it the weather, or did something change?"

Research only. No code. Researched 2026-10-29. Every fact is tagged **[V]** (Verified — read on a
primary page today) or **[U]** (Unverified — secondary source, paywalled, or inferred).

## Bottom line

- **Ship GHCN-Daily per-station TMAX/TMIN, not degree days.** One station file for Phoenix Sky Harbor
  (`USW00023183.csv.gz`) is **1,479,698 bytes** for the full record, and `.dly` text is 3,985,740 bytes
  **[V]**. Trimmed to ~3 years of TMAX/TMIN only, a station is a few KB — small enough to ship thousands
  as static files. Compute degree days in the browser at any base. **[V]**
- **The method stack is fully open.** CalTRACK 2.0 methods are **CC0-1.0**; OpenEEmeter/`eemeter` (4.1.1)
  and its successor `opendsm` (1.2.7) are **Apache-2.0** **[V]**. Nothing in the daily/billing
  change-point approach requires a paywalled document. ASHRAE Guideline 14-2023 (~$139 reseller **[U]**)
  and IPMVP (EVO account wall **[V]**) are *citable context*, not dependencies.
- **Use CalTRACK's four-candidate change-point family**: intercept-only, HDD-only, CDD-only, HDD+CDD,
  with a balance-point grid search 30–90 °F at ≤3 °F spacing, selected by highest adjusted R² **[V]**.
  This is PRISM (Fels 1986) in modern dress, and it is the honest default for both monthly bills and
  daily interval data.
- **The quality gate that matters is CV(RMSE) and sign-sane coefficients**, not R². CalTRACK sets no
  minimum R²; it recommends a default building-level **CV(RMSE) ≤ 100%** and drops candidate models with
  negative parameters **[V]**. Recurve/OpenDSM disqualifies daily/billing models at **CV(RMSE) > 1.0
  unless PNRMSE < 1.6** **[V]**. ASHRAE's tighter 15%/±5% monthly figures are secondary-sourced **[U]**.
- **Honest accuracy claim: ±10–20% on annual weather-normalized change for a well-fit meter; nothing
  defensible below ~5%.** LBNL's 537-building test found median NMBE across models of about **−1.2%**,
  range −3% to +0.4%, with median daily CV(RMSE) under 25% on 12 months of training **[V]** — but that is
  *median across a portfolio*, not a per-building guarantee. A single household's answer is much looser.
- **The biggest risk is not the math, it's confounding.** Solar/net metering, a heat pump added mid-year,
  occupancy change, and EV charging each invalidate the comparison outright; CalTRACK *excludes* such
  meters rather than modeling them **[V]**. A free tool must say this before it shows a number.

## 1. Weather data we can ship

| Source | Exact path | Format | Latency | Coverage | Size | Verdict |
|---|---|---|---|---|---|---|
| GHCN-Daily (per station, text) | `ncei.noaa.gov/pub/data/ghcn/daily/all/<ID>.dly` | fixed-width, 1 row per station-month-element, TMAX/TMIN in **tenths °C**, missing = `-9999` **[V]** | daily adds; rebuilt each weekend; real-time replaced by archive sources **45–60 days** after month end **[V]** | >100,000 stations, 180 countries; **>25,000** with max/min temp **[V]** | 3,985,740 B for USW00023183 **[V]** | **Ship this, trimmed** |
| GHCN-Daily (per station, CSV) | `.../ghcn/daily/by_station/<ID>.csv.gz` | gzipped CSV **[V]** | same | same | 1,479,698 B for USW00023183 **[V]** | **Easiest to parse** |
| GHCN-Daily (all) | `.../ghcn/daily/ghcnd_all.tar.gz` | tar.gz of `.dly` | rebuilt — listing stamped **2026-10-29 00:02** **[V]** | all | **3,818,113,068 B** **[V]** | build-time input only |
| GHCN-Daily (US HCN subset) | `.../ghcnd_hcn.tar.gz` | tar.gz | same | US HCN | **316,493,743 B** **[V]** | good build-time subset |
| GHCN-Daily (by year) | `.../by_year/2026.csv.gz` | gzipped CSV, all stations one year | daily | global | **115,378,832 B** **[V]** | build-time input |
| Station metadata | `.../ghcn/daily/ghcnd-stations.txt` (+ `ghcnd-inventory.txt`) | fixed-width **[V]** | daily | all | **11,441,526 B** **[V]** | ship a filtered index |
| NCEI 1991-2020 Daily Normals | `ncei.noaa.gov/data/normals-daily/1991-2020/access/<ID>.csv` | CSV **[V]** | static (stamped 2023-06-27) **[V]** | >7,300 temp stations; 467 hourly **[V]** | **465,102 B** per station **[V]** | ship a slimmed subset |
| NCEI normals by variable | `.../normals-daily/1991-2020/` → `dly-htdd-normal.csv`, `dly-cldd-normal.csv` | CSV; HTDD bases 40/45/50/55/57/60 + base-65 `NORMAL`; CLDD adds 70/72 **[V]** | static | same | — | best "normal year" source |
| NCEI climate-division HDD/CDD | `ncei.noaa.gov/pub/data/cirs/climdiv/climdiv-hddcdv-v1.0.0-20261006` | fixed-width monthly; element `25`=HDD, `26`=CDD **[V]** | monthly, version-dated **2026-10-06** **[V]** | climate divisions (state 01-91, div 01-13) **[V]** | **4,579,932 B** **[V]** | good county/division fallback |
| NCEI county HDD/CDD | `.../climdiv-hddccy-v1.0.0-20261006` | same | monthly **[V]** | counties | **40,602,276 B** **[V]** | too big to ship whole |
| NCEI division/county normals | `.../climdiv-norm-hddcdv-...`; period code `0010` = 1991-2020 **[V]** | fixed-width | static | divisions | **413,462 B** **[V]** | **ship this whole** |
| CPC daily degree days | `ftp.cpc.ncep.noaa.gov/htdocs/degree_days/weighted/daily_data/` | pipe-delimited, by year; climate divisions, states, census divisions, CONUS **[V]** | daily + 7-day NDFD forecast **[V]** | population-weighted aggregates **[V]** | small (KB) | nice-to-have |
| CPC normals | `.../daily_data/climatology/1981-2010/` **[V]** | pipe-delimited | static | same | small | **stale period (1981-2010)** |

**Best choice for gridprims:** GHCN-Daily `by_station` CSV, pre-trimmed at build time to TMAX/TMIN for
the last ~5 years, one static file per station, plus a filtered `ghcnd-stations` index for nearest-station
lookup in the browser. Degree days are computed client-side so the user can pick any base. **[V]** on
every size and path above; the trimming plan itself is a design choice, not a verified fact.

**Licensing.** No NOAA page read today carries an explicit license or public-domain grant: the GHCN-Daily
product page has **no license statement** **[V]**, the GHCN readme has **no use-restriction statement**
but *requests* citation of Menne et al. (2012) and DOI `10.7289/V5D21VHZ` **[V]**, the Normals product
page has **no license statement** **[V]**, and NOAA's open-data page speaks only of access and cost, not
rights **[V]**. US federal works are not copyrightable under 17 USC 105, which is why these datasets are
universally redistributed — but that is **[U]** inference, not a NOAA statement. Ship the citation.

**Caveat:** the climdiv normals readme says these values "are not official NCEI normals," and **monthly
CDD/HDD normals are not computed for Alaska** because the algorithm does not suit its climate **[V]**.

## 2. Degree day definitions

| Item | Definition | Source |
|---|---|---|
| Base temperature | 65 °F, both HDD and CDD: "of 65°F is the base for both heating and cooling degree day computations" | CPC **[V]** |
| Daily mean | "average of the daily maximum and minimum temperatures" — EIA: "the high temperature plus the low temperature, divided by 2" | CPC, EIA **[V]** |
| HDD | "summations of negative differences between the mean daily temperature and the 65°F base" (i.e. max(0, 65 − Tmean)) | CPC **[V]** |
| CDD | "summations of positive differences from the same base" | CPC **[V]** |
| Hourly integration | Not used by CPC or EIA for standard HDD/CDD; both are mean-of-max-min | CPC, EIA **[V]** |
| Variable base | NCEI publishes HTDD at bases 40/45/50/55/57/60 and base-65 as `NORMAL`; CLDD adds 70 and 72; growing DD 40–72 plus bounded TB4886/TB5086 | NCEI readme **[V]** |
| Normals DD method | Not a plain average of 30 annual values (too noisy, missing-value and consistency problems). NCEI derives degree-day normals from the **daily mean temperature normal** (a constrained harmonic fit), then estimates the spread of daily values about that normal, because "the definition of HDD/CDD is constructed as an asymmetric sum." Lineage: Thom (1954, 1966) → spline → "more direct" from 1981-2010 onward; 1991-2020 uses "the same methodologies and basic algorithms" | Normals_Calculation_Methodology_2020.pdf **[V]** |
| Population weighting | CPC weights division degree days "according to their proportion of the State's population" (2000 Census for legacy files; 2010 Census/ACS for current) | CPC **[V]** |

**Consequence:** a tool computing its own degree days from GHCN TMAX/TMIN will **not** exactly reproduce
NCEI's degree-day *normals*, because the normals are harmonic-fit-derived, not a simple average. Compare
like with like: user-period DD from daily data vs. a "normal year" built the same way from 1991-2020 daily
normals of mean temperature, or state clearly which normals file you used. **[V]** on the mechanism.

## 3. Methods, in increasing rigor

| Method | Model form | Inputs | Accuracy | Free to implement & cite? |
|---|---|---|---|---|
| **Degree-day ratio** | `kWh_norm = kWh_actual × (DD_normal / DD_actual)` | bill totals + DD at one base | Crude. Breaks when base load dominates or the base temperature is wrong. No published error bound found. | Yes, trivially **[V]** |
| **PRISM** (Fels 1986) | Change-point regression of daily-average usage on degree days at a fitted base; output is **NAC** (Normalized Annual Consumption) = base load + slope × long-run DD at the fitted base | 12+ months of bills + daily temps | Described as a simple linear regression for normalizing residential billing records; NAC's "stability makes it a particularly useful monitoring index" **[U]**, secondary (ACEEE 1986/1992 proceedings). Needs a full year pre and post **[U]** | Method is public and reimplementable; the *original* Energy & Buildings v.9 (1986) special issue is paywalled **[U]**. OpenEEmeter states its daily and billing models "derive from PRISM" **[V]** |
| **ASHRAE G14 change-point family** | 2P, 3P-heating, 3P-cooling, 4P, 5P (and VBDD); the 2025 literature counts **seven** regression types including 3PH, 3PC, 5P **[U]** | monthly or daily energy + temperature | G14-2023 adds expanded uncertainty discussion, cost estimation, and a new section on using the IMT **[U]** | **Partly blocked.** Guideline ~$139 at a reseller **[U]**; the RP-1050 archive with IMT source + executable is "available only to purchasers of this guideline" **[V]** (ASHRAE supplemental-files page, updated 2023-07-20). IMT is a FORTRAN 90 app fitting least-squares, variable-base-DD, and single/multi-variable change-point models **[U]**. Addendum *a* to G14-2023 was approved **2025-10-29** and retitles it "Measurement **and Verification** of Energy, Demand, and Water Savings" **[U]** |
| **CalTRACK 2.0 + OpenEEmeter** | Four candidates — intercept-only, CDD-only, HDD-only, CDD-HDD — fit on usage *per day*; balance-point grid search; pick highest adjusted R² | 365 days of daily or billing-period usage + daily temps | See §4 | **Yes, cleanest path.** CalTRACK docs repo is **CC0-1.0** **[V]**; `eemeter` 4.1.1 and `opendsm` 1.2.7 are **Apache-2.0** **[V]**; eemeter docs say "released as open source software under a permissive Apache-2.0 license" **[V]** |
| **IPMVP Option C** | Whole-facility, utility-meter boundary, regression-adjusted to a common set of conditions | whole-building bills | — | **Account wall.** "To download a copy of the IPMVP Core Concepts 2022, login into you EVO web account" — pricing not stated on the page **[V]** |
| **LBNL TOWT** | Regression with a **time-of-week indicator** variable plus a **piecewise linear, continuous** dependence on outdoor air temperature | ≥ a few weeks of interval data + hourly/daily temps | 537 commercial buildings, 15-min load: average median NMBE ≈ **−1.2%**, median-error range **−3% to +0.4%** at 12-month training; "no clear winner across models"; median daily CV(RMSE) **<25%** for every model at 12 months, still true at 6 months **[V]** | **Yes.** Mathieu, Price, Kiliccote & Piette, *IEEE Trans. Smart Grid* 2(3):507-518 (2011), **LBNL-4944E**, free PDF on LBNL's site **[V]**. OpenEEmeter's hourly models "derive from LBNL's TOWT" **[V]**. TOWT underperformed on *residential* buildings **[U]** |
| **ASHRAE Standard 224** | — | — | — | **Could not confirm it exists.** Two searches found no ASHRAE page, catalog entry, or committee for a Standard 224 **[V]** (negative result). Nearest relatives: Std 105 (2021, "Standard Methods of Determining, Expressing, and Comparing Building Energy Performance and Greenhouse Gas Emissions") and Std 214 **[U]**. Do not cite 224 |

## 4. Goodness-of-fit and honesty rules

| Rule | Value | Source |
|---|---|---|
| Baseline period | "Models are fit to baseline data in the **365 days** immediately prior to the intervention start date" (§3.1.3) | CalTRACK **[V]** |
| Missing data, billing & daily | "should not exceed **37 days (10%)**" (§2.2.1.2) | CalTRACK **[V]** |
| Missing data, same rule in Recurve/OpenDSM | "**36 days (10%)**" — the two sources disagree by one day | Recurve **[V]** |
| Daily coverage | `min_fraction_daily_coverage=0.9`; Recurve: "**more than 328 days** (at least 90%)" with consumption, and electric also needs >328 **non-zero** days | eemeter, Recurve **[V]** |
| Monthly coverage | "At least **11 months** with consumption data" | Recurve **[V]** |
| Hourly coverage | no minimum baseline length, but ">**90%** of hours in the same calendar month" plus adjacent months of the prior year | CalTRACK **[V]** |
| Temperature gaps | "Temperature data may not be missing for more than **six consecutive hours**" (§2.2.4.1) | CalTRACK **[V]** |
| Billing period length | drop >**35 days** (pseudo-monthly) and >**70 days** (bi-monthly); eemeter also NaNs periods **<25 days** | CalTRACK, eemeter **[V]** |
| Balance point grid | heating and cooling both **30–90 °F**; max gap between candidates **3 °F**; cooling BP ≥ heating BP; no CDD for gas | CalTRACK **[V]** |
| Degree-day minimums | "At least **10 days** with non-zero degree days per year" (not for billing data) and "at least **20 degree days** per year" | CalTRACK **[V]** |
| Reject not-weather-driven | candidate models whose parameter estimates are negative are excluded (β_H > 0, β_C > 0, μ > 0); the intercept-only model has adjusted R² = 0 **by definition**, so it wins when nothing is weather-driven | CalTRACK **[V]** |
| Model selection | "The model with highest **adjusted R-squared** will be selected as the final model." **No minimum R² threshold is set.** | CalTRACK **[V]** |
| CV(RMSE) | building-level **100%** recommended as a default for portfolio use; procurer may waive. Formula divides by (P − c) where c excludes the intercept | CalTRACK §4.3.2.1 **[V]** |
| Disqualification, OpenDSM | daily/billing: **CV(RMSE) ∈ (0, 1.0] OR PNRMSE < 1.6**; hourly: **CV(RMSE) ∈ (0, 1.4] OR PNRMSE < 2.2**; legacy pre-1.0: daily CV(RMSE) > 1.0 disqualifies | Recurve **[V]** |
| Fractional savings uncertainty | example thresholds **15%** (NWA procurement), **25%** (pay-for-performance) | CalTRACK §4.3.2.3 **[V]** |
| Savings outlier | savings vs. counterfactual must fall between **−50% and +50%** (configurable) | Recurve **[V]** |
| Confounders → exclude | "Projects should be excluded if net metering" status changes in the baseline (§2.2.6) or reporting period (§3.5.6); solar or battery install dates in the training period **disqualify** a meter (30-day grace); EV charging installed in baseline → **flag** (§2.2.7); dual enrollment within 12 months → blocked | CalTRACK, Recurve **[V]** |
| Station distance | warning beyond **200 km**; usage outlier warning above **3 IQR** over the median | eemeter **[V]** |
| ASHRAE G14 calibration | commonly cited as monthly **CV(RMSE) ≤ 15%, NMBE ≤ ±5%**; hourly **≤ 30%, ≤ ±10%**. Sources conflict (one gives hourly NMBE ±5%, one gives monthly CV(RMSE) 20%) | **[U]** secondary only — guideline is paywalled |
| LBNL/DOE M&V 2.0 fitness | **R² > 0.6, CV(RMSE) < 25%, NMBE < 0.05**; an SMUD factsheet used R² > 0.7, CV(RMSE) < 25%, NMBE < 0.5% | **[U]** slide decks |
| G14 restated by LBNL | "Guideline 14 specifies CV(RMSE) during the training period, should be <25%" for a 12-month post period with no uncertainty analysis | LBNL slides **[V]** (as a quote of G14) |

Note the gap: CalTRACK's 100% CV(RMSE) is a *portfolio screen*, deliberately loose. ASHRAE's 15–25% is
a *calibration* bar. A household tool should report the number and say which bar it clears, not pick one
silently.

## 5. Independent test vectors

| Candidate | What it is | License | Status |
|---|---|---|---|
| `openeemeter/caltrack` repo | "documentation and testing of CalTRACK methods"; sidebar shows **CC0-1.0** | CC0-1.0 **[V]** | No data/fixture files visible in the root listing **[V]** |
| `eemeter` docs "CalTRACK Compliance" page | Requirement-by-requirement checklist mapping CalTRACK rules to eemeter functions (`fit_caltrack_usage_per_day_model`, `caltrack_sufficiency_criteria`, `select_best_candidate`, `compute_temperature_features`) with the thresholds in §4 | Apache-2.0 **[V]** | **Best available reference spec.** Warns that "using just the OpenEEmeter does not guarantee CalTRACK compliance" **[V]** |
| `eemeter` test suite | `tests/` contains `common/`, `comparison_groups/`, `drmeter/`, `eemeter/`, `conftest.py`, `regression_metrics.py`, syrupy snapshot extensions | Apache-2.0 **[V]** | Snapshot-based; no CSV fixtures visible at the top level **[V]**. Deeper dirs not inspected **[U]** |
| `eemeter` tutorial data | `load_test_data` reads **parquet** datasets via the `tutorial` extra | Apache-2.0 **[V]** | Contents not documented on the page **[U]** |
| ASHRAE G14 / RP-1050 standard test cases | IMT ships with standard test cases; a 2025 paper validates an auto change-point method against them | **Purchasers only** **[V]** | **Blocked** for a free project |
| LBNL 537-building dataset | 537 commercial buildings, 15-min electric load, temperature by ZIP, "no known efficiency interventions, significant changes in operations, occupancy" | not stated **[U]** | Results published; raw data availability unconfirmed **[U]** |

**Practical plan:** treat the eemeter CalTRACK-compliance page as the spec and generate test vectors by
running `eemeter` locally on synthetic and public GHCN-driven inputs, then freeze those outputs as
fixtures. Apache-2.0 permits this **[V]**.

## 6. What this makes possible

### (a) From 12–24 monthly bill totals + degree days

| Answer | Defensible claim |
|---|---|
| "Your bill rose X%, of which Y points are weather and Z points are something else" | Directional with a magnitude band, not a point estimate. State the model's CV(RMSE) and refuse to split the difference when it exceeds ~25% |
| "Your base load (weather-independent) is about N kWh/day" | Good. The intercept is the best-identified parameter in a monthly change-point fit |
| "Your heating/cooling sensitivity is S kWh per degree day above/below B °F" | Good when §4's degree-day minimums are met (≥10 non-zero DD days, ≥20 DD/yr); otherwise say "not weather-driven" |
| "Your home starts heating around B °F" (fitted balance point) | Useful and intuitive; grid-search resolution is ±3 °F at best, so round to 5 °F |
| "Normalized annual consumption (NAC) was A last year and B this year" | This is PRISM's core output and the right headline number. Honest band: **±10–20%** on the *change* |
| "Nothing here looks weather-driven" (intercept-only wins) | **Strongest and most honest answer the tool can give.** CalTRACK's intercept-only candidate makes this a first-class result, not a failure |

### (b) From a year of interval data

| Answer | Defensible claim |
|---|---|
| "Your load shape by time-of-week, and how much of each hour is temperature-driven" | Strong — this is TOWT's native output; LBNL reports median daily CV(RMSE) <25% on commercial buildings at 12-month training **[V]** |
| "Your temperature sensitivity is unusually high — check the HVAC" | Supported: LBNL found a TOWT model "can flag buildings that are unusually temperature-sensitive, which can point to HVAC problems" **[U]** |
| "Something changed on about this date, independent of weather" | Supported in principle (the LBNL commissioning paper's stated purpose) **[U]**; date resolution realistically weeks, not days |
| "Daily-model savings/change estimate with an uncertainty band" | Yes, and a daily model earns a tighter band than a monthly one. Still cite the **−50%/+50%** outlier screen |

**Blanket honesty rule:** every LBNL accuracy figure above is a **median across hundreds of buildings**,
and the commercial buildings tested had *no known interventions or occupancy changes* **[V]**. A single
residence is noisier on both counts. Do not quote portfolio medians as a per-user accuracy.

## 7. Pitfalls — what a free tool must say out loud

| Pitfall | What happens | What to say |
|---|---|---|
| Solar / net metering | The meter reads net, so weather drives *generation* and *load* in opposite directions. CalTRACK **excludes** meters whose net-metering status changed; Recurve **disqualifies** on a solar or battery install date in the training period **[V]** | "If you added or changed solar or a battery during this period, this tool cannot separate weather from that. Stop here." |
| Heat pump / electrification mid-year | The temperature coefficient itself changes; one fitted slope is wrong for both halves | "A heating or cooling system change mid-period breaks the comparison. Split the period, or treat the result as the combined effect." |
| EV charging | Large non-weather load added. CalTRACK **flags** rather than excludes **[V]** | "Did you start charging a vehicle at home? That shows up as 'something changed,' and it is not a problem with your house." |
| Occupancy change | Base load moves; the model attributes it to the intercept or, worse, to the slope | "Moved in, moved out, people home more? Expect a change the weather cannot explain." |
| COVID-era baselines | 2020–2021 occupancy is not representative | "Baselines that include 2020 or 2021 may not reflect how the building is used now." **[U]** — no primary source read today |
| Mild-weather months | Few degree days → slope is unidentifiable. CalTRACK's ≥10 non-zero-DD-days and ≥20-DD/yr tests exist precisely for this **[V]** | "There was not enough hot/cold weather to measure your sensitivity." |
| Non-weather-driven loads | Pools, servers, grow lights, well pumps dominate and the weather term vanishes | Let intercept-only win and name it |
| Rate changes vs. usage changes | A bill can rise with flat kWh | Normalize **kWh**, never dollars, and say so |
| Nearest-station error | eemeter warns beyond **200 km** **[V]** | Show the station name and distance; warn past ~50 km or large elevation differences |
| Winner's curse | Picking the best of four candidates by adjusted R² biases the fit optimistically; CV(RMSE) is computed in-sample | "This model was chosen because it fit your data best, which makes the fit look slightly better than it is." |
| Degree-day apples-to-oranges | Self-computed DD ≠ NCEI harmonic-fit DD normals **[V]** | Name the normals period (1991-2020) and the base used |

## Recommended for gridprims

**Ship now**
1. **GHCN-Daily `by_station` CSV, trimmed to TMAX/TMIN** for the most recent ~5 years, one static gzipped
   file per station, plus a filtered station index (lat/lon/name/elev) for nearest-station search.
2. **Client-side degree days** at base 65 °F by default, mean-of-max-min, per the CPC/EIA definition — plus
   a user-adjustable base, since that is free once you ship temperatures.
3. **CalTRACK 2.0 daily/billing change-point model**: four candidates, 30–90 °F grid at 3 °F, highest
   adjusted R², negative-coefficient rejection, degree-day minimums, 365-day baseline, 10%-missing limit.
4. **An honesty panel, always visible**: CV(RMSE), the chosen model, the balance point, the station and its
   distance, and the §7 confounder checklist as a hard gate before any number is shown.
5. **NCEI 1991-2020 normals** (slimmed `dly-htdd-normal.csv` / `dly-cldd-normal.csv`, and the 413,462-byte
   division normals file) as the "normal year," labeled as such.

**Defer**
- TOWT / hourly modeling. Publishable and free, but LBNL's validation is commercial-building-centric and
  reportedly weaker on residences **[U]**. Ship the daily model first.
- Solar/net-metered disaggregation. Follow CalTRACK: detect and decline.
- Any fractional-savings-uncertainty math. Needs more primary reading than this pass gave it.

**Cite**
CalTRACK 2.0 (CC0-1.0), OpenEEmeter/eemeter (Apache-2.0), Fels 1986 PRISM, Mathieu et al. 2011
(LBNL-4944E), CPC and EIA degree-day definitions, NCEI Normals methodology, and GHCN-Daily via
Menne et al. 2012 + DOI 10.7289/V5D21VHZ. **Do not cite "ASHRAE Standard 224"** — existence unconfirmed.
Reference ASHRAE Guideline 14 and IPMVP by name as context only; neither was read today.

## Sources

- GHCN-Daily product page — https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily **[V]**
- GHCN-Daily readme — https://www.ncei.noaa.gov/pub/data/ghcn/daily/readme.txt **[V]**
- GHCN-Daily directory listing (sizes, 2026-10-29) — https://www.ncei.noaa.gov/pub/data/ghcn/daily/ **[V]**
- U.S. Climate Normals product page — https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals **[V]**
- Normals by-variable/by-station readme — https://www.ncei.noaa.gov/data/normals-daily/1991-2020/doc/Readme_By-Variable_By-Station_Normals_Files.txt **[V]**
- Normals Calculation Methodology 2020 — https://www.ncei.noaa.gov/data/normals-daily/1991-2020/doc/Normals_Calculation_Methodology_2020.pdf **[V]**
- NCEI climdiv directory + normals readme — https://www.ncei.noaa.gov/pub/data/cirs/climdiv/ , https://www.ncei.noaa.gov/pub/data/cirs/climdiv/normals-readme.txt **[V]**
- CPC degree days index — https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/cdus/degree_days/ **[V]**
- CPC degree day explanation — https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/cdus/degree_days/ddayexp.shtml **[V]**
- EIA degree days — https://www.eia.gov/energyexplained/units-and-calculators/degree-days.php **[V]**
- NOAA Open Data Dissemination — https://www.noaa.gov/information-technology/open-data-dissemination **[V]**
- CalTRACK Methods v2.0 — https://docs.caltrack.org/en/latest/methods.html **[V]**
- CalTRACK repo (CC0-1.0) — https://github.com/openeemeter/caltrack **[V]**
- eemeter CalTRACK compliance — https://eemeter.readthedocs.io/caltrack_compliance.html **[V]**
- OpenDSM / OpenEEmeter repo (Apache-2.0) — https://github.com/openeemeter/eemeter **[V]**
- PyPI `eemeter` 4.1.1 and `opendsm` 1.2.7, both Apache-2.0 — https://pypi.org/pypi/eemeter/json **[V]**
- Recurve data sufficiency & disqualification — https://docs.recurve.com/flex-programs/measurement/energy%20efficiency%20and%20electrification/project-based-measurement-data-sufficiency-and-disqualification-guidelines **[V]**
- Mathieu, Price, Kiliccote & Piette 2011 (TOWT), LBNL-4944E — https://eta-publications.lbl.gov/publications/quantifying-changes-building **[V]**
- LBNL 2015 model accuracy results (537 buildings) — https://bies.lbl.gov/sites/default/files/2015modelaccuracyresults.pdf **[V]**
- ASHRAE G14-2014 supplemental files (RP-1050/IMT purchaser-only) — https://www.ashrae.org/technical-resources/bookstore/supplemental-files/supplemental-files-for-ashrae-guideline-14-2014 **[V]**
- ASHRAE G14-2023 Addendum a (approved 2025-10-29, retitle) — https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/g14_2023_a_20251029.pdf **[U]**
- Guideline 14-2023 reseller listing, $139 — https://standards.nimonik.com/products/ashrae/gde-14/ **[U]**
- EVO IPMVP download page (account required) — https://evo-world.org/en/library/download-protocol-documents-mainmenu-en **[V]**
- Fels 1986 PRISM, via ACEEE 1986 proceedings panel 9 — https://www.aceee.org/files/proceedings/1986/data/papers/SS86_Panel9_Paper_04.pdf **[U]**
- Granderson et al. 2016, Applied Energy 173:296-308 — https://escholarship.org/uc/item/61r4t6jt **[U]** (page returned empty today)
