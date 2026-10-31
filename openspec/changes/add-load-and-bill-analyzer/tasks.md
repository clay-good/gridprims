## 1. Fixtures and reference data

- [ ] 1.1 Extend the foundation's fixture library (foundation task 5.1) with bill, ratchet, holiday, export, and coincident-peak cases; verify each fixture's receipt and expected results match their stored files
- [ ] 1.2 Consume the URDB snapshot owned by `add-public-grid-data`, partitioned by state; verify the bill tools fetch only state shards
- [ ] 1.3 Snapshot ERCOT 4CP intervals for 2018–2025 from ERCOT's files, and add 2026 when ERCOT posts it (expected late November); verify 2018–2020 and 2022–2025 each have four interval-ending stamps matching ERCOT's published values, and that 2021 ships as dates only, flagged "times not published", until a primary source supplies them (`docs/research/06`)
- [ ] 1.4 Record the Green Button field map in `docs/derivations/green-button.md` from the Apache-2.0 ESPI schema; verify every handled element names its schema type and enumeration, and that no requirement depends on buying the standard

## 2. Interval insights

- [ ] 2.1 Implement core metrics and monthly peaks; verify energy totals match fixtures within 0.01%
- [ ] 2.2 Implement load duration curve, heatmap, weekday/weekend profile, and peak-preserving downsampling; verify the max interval is drawn at its true value
- [ ] 2.3 Implement flags (needle peak, after-hours share, weekly spikes, baseload step); verify one fixture triggers each flag and a flat fixture triggers none
- [ ] 2.4 Implement the data-quality report and multi-meter aggregate; verify the diversity-benefit scenario

## 3. Bill explainer

- [x] 3.1 Normalize URDB records and the manual form into the tariff record (D2), converting $/day, $/year, kVA, and daily-demand units; verify 50 sampled URDB rates normalize with unmodeled items listed and the daily fixed charge scenario
- [x] 3.2 Implement billing determinants (demand windows, ratchets with month-limited lookbacks, PF adjustment, minimums, holidays, export exclusion); verify the ratchet, lookback-incomplete, July 4, solar-export, and PF scenarios
- [x] 3.3 Implement line-by-line bills with setting-interval links; verify the March scenario
- [ ] 3.4 Implement the actual-bill comparison; verify the riders scenario wording
- [ ] 3.5 Run the 10-tariff cross-check against PySAM Utilityrate5 and REopt.jl; verify every monthly total within 0.5% or documented

## 4. Tariff comparison

- [ ] 4.1 Implement eligibility filtering and ranking; verify the ineligible-rate scenario
- [ ] 4.2 Implement component breakdown and the one-sentence driver; verify the TOU scenario
- [ ] 4.3 Implement the load-shift what-if; verify the chiller scenario updates all rates
- [ ] 4.4 Implement rate-coverage and staleness notes; verify the 24-month warning

## 5. Coincident peak

- [ ] 5.1 Implement versioned program definitions (D5) for ERCOT, PJM, NYISO, ISO-NE with method fields and hour-label conventions; verify the older-year, method-change, and hour-label scenarios
- [ ] 5.2 Implement exposure, tag, cost (including PJM $/MW-day capacity and NSPL), and reduction savings; verify the 925 kW 4CP, PJM capacity, and eligibility-note scenarios
- [ ] 5.3 Implement user-entered peaks with operator links; verify the PJM scenario
- [ ] 5.4 Implement interval alignment and coarse-data labels; verify the hourly-file scenario

## 6. Storage and solar screen

- [ ] 6.1 Implement monthly threshold dispatch (D4); verify the energy-limited scenario
- [ ] 6.2 Implement assumption controls and excluded-effects list; verify the upper-bound label appears with every savings figure
- [ ] 6.3 Implement PVWatts export intake with typical-year alignment and net load; verify the evening-peak scenario and a leap-year, DST alignment fixture
- [ ] 6.4 Implement payback and REopt handoff; verify the no-cost scenario
- [ ] 6.5 Run the demand-only REopt bound check on 5 redistributable profiles × 3 tariffs; verify every case is at least 98% of REopt's demand savings

## 7. Handoff and report

- [ ] 7.1 Implement the REopt-ready export, calendar-year re-stitching, and notes file; verify the July-to-June scenario; verify 8,760, 17,520, and 35,040 rows for normal and leap years (December 31 dropped) against REopt's current documentation
- [ ] 7.2 Implement result cards; verify the copied text contains no file contents
- [ ] 7.3 Implement the on-device one-page report; verify the sentinel egress test passes

## 8. Launch readiness

- [ ] 8.0 Run every worked example and fixture through the local MCP server (`gridprims_analyze_file`, `gridprims_run`); verify identical structured results to the website

- [ ] 8.1 Publish "review pending" labels for every tool awaiting practitioner review, and record a sign-off in `docs/review-signoffs.md` if one arrives; verify the labels are generated from that file and that nothing waits on a reviewer
- [ ] 8.2 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
