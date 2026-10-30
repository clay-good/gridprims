## Why

**Value up front:** your bill went up 18%. gridprims tells you how much of that was a colder winter and how much was you, from your own meter data or twelve bill totals, computed on your device, with the model's quality shown rather than hidden. If your use is not actually weather-driven, it says that too.

This is the top question households ask and the first question any energy manager must answer after a retrofit, and no free tool answers it privately on your own data (`docs/research/09`, `10`):
- Utility portals show "you used more than last year" and leave the cause unexplained.
- Measurement and verification tools that do this properly (the CalTRACK method family, OpenEEmeter) are Python libraries for program administrators, not something a person can point at their own file.
- The standards that define the method are paywalled, but the open method documentation is CC0 and the reference implementations are Apache-2.0, so we can implement and cite freely (`docs/research/10`).

It also makes every other number on the site more honest: a tariff comparison, a storage screen, or a rate-case impact computed on an unusually hot year carries that bias, and this change is what lets a result say so.

## What Changes

- **Degree-day data:** daily temperature history by weather station from NOAA's daily global historical climatology network, trimmed to the fields we need and packed into the existing state shards so no asset URL names a station, county, or ZIP, plus the published 1991–2020 normals for a "normal year" comparison, and the station index used to pick a station near a ZIP code on the device.
- **Baseline model:** fit the user's own use against heating and cooling degree days using the open change-point family (flat, heating-only, cooling-only, and heating-plus-cooling), with a balance-point search, published rejection rules, and goodness-of-fit reported in plain words. Works from interval data or from monthly bill totals.
- **Change explainer:** split the difference between two periods into a weather part, a use part, and an unexplained part; give the weather-normalized annual use; and state plainly when the model is too poor to answer.

## Capabilities

### New Capabilities

- `weather/degree-day-data`: Station temperature history, normals, and the on-device station lookup.
- `weather/baseline-model`: The fitted relationship between weather and the user's own use, with quality rules.
- `weather/change-explainer`: How much of a change was weather, how much was not, and when we cannot tell.

### Modified Capabilities

- `household/usage-benchmark` and `ratepayer/proposed-rate-impact`: each gains a line saying how unusual the analysed year's weather was, from the degree-day comparison this change provides.

Both are rendered by their owning capability; the requirements here describe what this change must supply, and the owning changes are applied first.

## Non-goals

- Telling a user *why* their non-weather use changed. We quantify it and offer a checklist; we do not diagnose.
- Program-grade savings claims, utility incentive settlement, or anything presented as a measurement-and-verification report for a rebate.
- Hourly time-of-week-and-temperature models (a later phase; the daily and billing-period models answer the question).
- Forecasting next month's bill from weather forecasts (the mid-cycle forecast in `household/bill-totals` uses the days already metered, not a forecast).
- Reproducing paywalled standard text or claiming conformance to a standard we have not read.

## Impact

- Phase 2, per `plan-launch-and-value-proof`, and the first phase-2 candidate because it reuses the interval series and bill engine and serves both doors.
- Adds the NOAA daily station history and 1991–2020 normals to the data registry, with the station index shipped in the app.
- Gives every other tool a dated way to say "this year was warmer than normal", used by `household/usage-benchmark` and the rate-case impact tools.
