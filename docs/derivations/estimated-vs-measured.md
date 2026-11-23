# Our estimated hourly carbon against what the monitors measured

Used by `core/lib/estimated-vs-measured.mjs`, published at `/carbon/estimated-vs-measured/` and on each balancing-authority page.

**What it gives you:** a number for the weakness we state on every hourly carbon result. The estimate is EIA's hourly generation by fuel times annual average factors. EPA's monitors measure large fossil stacks directly. For each region and year we publish the gap, for the same units in the same hours.

## The comparison, step by step

| Step | What happens |
|---|---|
| 1. The measurement | EPA's hourly records for the monitored units of a balancing authority: carbon dioxide in short tons converted to metric tons, and gross load by fuel, summed per hour. Each record is moved to UTC by its state's standard offset before it is added up, so a region spanning two zones never mixes hours. |
| 2. The estimate's factors | EIA publishes hourly carbon dioxide, not the factors behind it. The per-fuel factors are recovered by least squares from the region-year's own hours, regressing EIA's carbon dioxide on its reported generation by fuel. A negative coefficient is held at zero and said to be held; a fuel whose column adds nothing is dropped and comes back empty. |
| 3. What is compared | The monitored units' own gross load, fuel by fuel and hour by hour, priced with those factors, against what those units measured. Nothing is scaled up to generation no monitor covers. |
| 4. The result | The difference as a percent and in metric tons, by month and by hour of the day on the region's own standard clock, with the monitored share of the region's generation. |

Recovered factors land where a reader of EIA's methodology would expect: about 1.0 metric tons per MWh for coal, 0.39 to 0.49 for natural gas, and 0.8 to 0.97 for oil, with a fit r² above 0.9999 in most regions.

## When we do not publish a difference

Three gates, all ours, each named on the page. A region that fails one is reported as uninformative with the reason, never as a small error.

| Gate | Threshold | Why |
|---|---|---|
| Coverage | monitored units at or above **40%** of the region's generation for the year | Below that, the gap mostly measures generation the monitors never saw. |
| Fit | r² at or above **0.99** when recovering EIA's factors | Below that, the factors are not EIA's method as we read it, so the gap would be our fitting error. |
| Regional agreement | a fuel's monitored gross load no more than **25%** above EIA's regional generation from it | EPA and EIA must place these units in the same region. A federal hydro marketer's plants, or a neighbour's units eGRID puts here and EIA puts there, fail this. The 25% is the gross-to-net allowance: gross load runs a few percent above net generation. |

In the 2026-11 build, 43 of 98 region-years pass all three. Among those, the difference runs from about −59% to +29%, and the middle case is within a few percent.

## What the gap is not

- **Not EIA's error alone.** It is the gap between two public figures, each with its own method. EPA's monitors have substitute data for invalid hours; EIA's factors are annual averages; gross load is not net generation.
- **Not a region's whole emissions.** Only monitored units are in it.
- **Not a correction.** The carbon tools still use EIA's estimate, because it covers every balancing authority and every fuel. This is the cross-check, published rather than hinted at.

## How it is checked

`verify/tools/camd-estimate-error.py` recomputes the whole comparison in Python for three regions and two years, from the publishers' own files: EPA's hourly bulk files, EIA's per-region workbooks, and eGRID's plant sheet. It refits the factors, moves the hours, and applies the same three gates in its own code, so nothing in its answer comes from the code it checks. `verify/tests/pipeline/camd-estimate-error.test.mjs` compares the published figures with those stored values.
