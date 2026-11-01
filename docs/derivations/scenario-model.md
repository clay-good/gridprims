# Grid scenario model

Used by `core/lib/fleet.mjs`, `core/lib/dispatch.mjs`, `core/lib/backtest.mjs`, and the `/scenario/` pages (add-grid-scenario-model).

**What it gives you:** retire or add a plant in a balancing authority and see which fuels replace its output over the year that happened. Every answer sits beside the model's own error against that year.

## Sources

| What | Source | License |
|---|---|---|
| Units, capacity, fuel, dates | EIA-860 generators and plants (balancing authority from the plant) | U.S. federal work |
| Heat rates | EIA-923 Page 1: monthly fuel burned for electricity and net generation, by plant and prime mover | U.S. federal work |
| Fuel prices | EIA-923 Page 5: every delivery's quantity, heat content, and delivered cost | U.S. federal work |
| Recorded hours | EIA-930 hourly demand, interchange, and generation by fuel | U.S. federal work |
| CO₂ per MMBtu | EIA, Carbon Dioxide Emissions Coefficients by Fuel (September 18, 2024) | U.S. federal work |

## How it works

1. **Fleet.** Every coal, gas, and oil generator operating in the year is placed. A generator retired mid-year runs through the month before it retired. Nuclear, hydro, wind, solar, storage, and other sources are not dispatched; their recorded output is taken as given.
2. **Heat rate** (MMBtu per net MWh). This is the plant's electric fuel divided by its net generation for the year. A combined-cycle plant's turbines and steam parts are combined first. The range is the 10th to 90th percentile of the monthly rates. A blank month counts as missing, not as zero. A rate outside 5.5 to 25 for combined cycle, or 7.5 to 25 for other units, is not used. Those units take the capacity-weighted median of their technology and decade, from at least 5 plants.
3. **Fuel price** ($ per MMBtu). This is the plant's own delivered cost that month. Where EIA withholds it, the model uses the region's heat-weighted price, then the nation's. Either one marks the unit substituted.
4. **Variable cost** is heat rate × fuel price. Variable O&M is zero and listed as omitted.
5. **Dispatch.** Each hour's need is demand plus net exports, minus every recorded non-dispatched source. Units run in ascending cost until the need is met. A need above the placed fleet is an *unmet modeling residual*: a gap in the model, not a shortage.
6. **Backtest.** The unchanged fleet is compared with EIA-930's recorded coal, gas, and oil output. The comparison reports totals, mean bias, mean absolute error, the hourly spread, and the share of hours with the same marginal fuel. A scenario change no larger than the bias for that fuel is not presented as a finding.

## What the data shows

- **Withheld costs.** EIA withholds 9,100 of 36,789 delivered costs in 2025, including every delivery to an unregulated plant. So 85% of ERCOT's placed capacity and 78% of PJM's run on a substituted price at least one month. The page shows the share for each region.
- **Fit.** A full year dispatches in about 10 ms per region on a laptop. The fit is often poor:

| Region | Coal bias | Gas bias | Mean absolute error |
|---|---|---|---|
| ERCOT | +76% | −24% | 38% |
| PJM | −15% | +4% | 24% |
| CAISO | — | +2% | 13% |
| Southern Co. | −10% | +4% | 18% |
| PacifiCorp East | −31% | +77% | 46% |

That is the honest result of merit order without commitment, contracts, or must-run. Every page and the fit table at `/scenario/` show it.

## Not yet done

| Gap | Why |
|---|---|
| No unit is measured | Monitored hourly heat input (EPA CAMD) needs an agency key the pipeline does not hold (`add-measured-plant-emissions`). Every rate is a plant or group average. There is no gross-to-net ratio to publish until that data is held. |
| No outside model comparison | No third-party model is configured on our inputs yet, and each page says so. A plain-Python rerun of the dispatch from EIA's own six-month files (`verify/tools/merit-order-check.py`) gives the same coal and gas totals to within half a percent and the same marginal unit in at least 99% of hours for PACE, SOCO, and ERCOT. It checks our code, not our method. |
| Imputed hours | The hourly snapshot does not carry EIA's imputation marks. |
