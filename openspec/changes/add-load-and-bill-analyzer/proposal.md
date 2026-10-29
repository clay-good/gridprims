## Why

**Value up front:** drop a meter file, and in under a second gridprims tells you what your load is doing, which 15 minutes set this month's demand charge, what the bill should be line by line, what it would cost on other rates, how exposed you are to grid coincident peaks, and what a battery or solar array would plausibly save. All of it happens on your device, with sources. Then it hands you a clean file for REopt if you want a full optimization.

Nobody free does this today (`docs/research/02`):
- **REopt** sizes solar and storage well but uploads your file to NLR servers, takes clean single-year CSV only (no Green Button XML), has no power-factor input, runs one rate at a time, does no bill audit, and warns of long solve times.
- **Free demand-charge calculators** use a single peak or a load-factor average, not your intervals, and many are lead generation for retail suppliers.
- **Paid tools** (Energy Toolbase from $170/user/month, EnergyCAP per meter, HOMER from $1,575/year) need accounts and uploads.
- We found **no free Green Button viewer** and **no free coincident-peak (4CP/5CP) calculator**.

The audience is large: about 19.5M commercial and 1.1M industrial customers (EIA, 2024), 168M smart meters, and about 5M of 18M commercial customers facing demand charges of $15/kW or more (McLaren et al., 2017; `docs/research/03` §8). Demand charges can be up to 40% of a commercial bill.

## What Changes

- **Interval insights:** peaks, load factor, load duration curve, a calendar heatmap, baseload and after-hours use, data-quality report, and plain-language flags.
- **Bill explainer:** compute a bill from a tariff on the user's intervals, line by line, including demand windows, ratchets, and power-factor adjustments, and show which interval set each demand charge.
- **Tariff comparison:** re-price the same intervals on alternative rates from a URDB snapshot or a rate the user enters, ranked by annual cost.
- **Coincident-peak exposure:** overlay published ERCOT 4CP, PJM 5CP, NYISO, and ISO-NE peak intervals on the user's load and estimate the related charges, versioned by rule year.
- **Storage and solar screen:** monthly threshold peak-shaving with disclosed assumptions, optional solar from a PVWatts export the user drops in, and simple payback.
- **Handoff and report:** export a cleaned, gap-labeled 8760 CSV in the shape REopt accepts, and a one-page report generated on the device.

## Capabilities

### New Capabilities

- `load/interval-insights`: What the meter data says, including data quality.
- `load/bill-explainer`: A line-by-line bill from a tariff and the user's intervals.
- `load/tariff-comparison`: The same load priced on alternative rates.
- `load/coincident-peak`: Exposure to grid system peaks and the charges tied to them.
- `load/storage-and-solar-screen`: A transparent peak-shaving and solar screen with payback.
- `load/handoff-and-report`: REopt-ready export, result cards, and the on-device report.

### Modified Capabilities

None (depends on `establish-platform-foundation`, which this change does not alter).

## Non-goals

- Optimal storage sizing or dispatch (REopt does this; we hand off).
- Reading PDF bills or connecting to utility accounts (Green Button Connect My Data requires a registered third party with OAuth; we accept downloaded files only).
- Retail supplier offers, energy brokering, or any lead generation.
- Net-metering and export compensation in v1: bills on files with an export channel price delivered energy only and say export credits are excluded (phase 2).
- Guaranteeing a bill matches the utility's to the cent; we show our work and the gaps.

## Impact

- Phase 1 (launch), per `plan-launch-and-value-proof`.
- Adds the load workbench page, six tool families, and their worked examples.
- Depends on the URDB snapshot owned by `add-public-grid-data`; owns the ERCOT 4CP interval snapshot.
