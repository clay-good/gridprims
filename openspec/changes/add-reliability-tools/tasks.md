## 1. Data and intake

- [x] 1.1 Record the free formula sources (the federal form instructions, the published engineering deck, the reference guide) in `docs/derivations/reliability.md` with author, date, and the exact page or slide for each index; verify every implemented index cites one
- [ ] 1.2 Build outage-log fixtures for the common vendor export shapes named in `docs/research/11`, with expected receipts, including a restore-before-start row, overlapping rows on one device, partial-restoration rows for one event, and a duration crossing midnight and a daylight-saving change; verify the mapping-corrected, missing-field, restore-before-start, partial-restoration, and crossing-midnight scenarios
- [ ] 1.3 Derive cohort tables (ownership type, size class, state and census division) from the EIA-861 reliability file owned by `add-public-grid-data`; verify medians against an independent recomputation for 3 cohorts

## 2. Index calculator

- [x] 2.1 Implement the sustained indices with formulas, counts, per-index citations, and declared rounding; verify the annual-indices, formula-and-counts, availability-citation, and rounding scenarios
- [x] 2.2 Implement the sustained threshold, its statement, and the user override; verify the momentaries-excluded scenario
- [x] 2.3 Implement the momentary index and its not-logged message; verify the no-momentaries scenario
- [x] 2.4 Mark per-customer indices unavailable with their data requirement; verify nothing is estimated from event counts
- [x] 2.5 Implement the three reporting bases; verify the three-bases scenario
- [x] 2.6 Build the federal form sheet with instruction text and the filer-responsibility note; verify copy and print are the only actions
- [x] 2.7 Implement feeder and cause breakdowns with URL exclusion and small-group suppression; verify the small-feeder scenario and that no breakdown appears in a fragment or copied card

## 3. Major event days

- [x] 3.1 Implement the threshold with every intermediate value shown, both standard-deviation variants, and the day-attribution rule; verify the threshold, days-without-activity, both-thresholds-shown, and interruption-spanning-two-days scenarios
- [x] 3.2 Implement flagged-day listing and both-basis indices; verify the storm-days scenario
- [ ] 3.3 Implement the Shapiro-Wilk normality check at the 5% level with its warning; verify the assumption-fails scenario and that the test and level are named as ours
- [x] 3.4 Implement our disclosed minimum and the short-history label; verify the too-few-days and two-years scenarios
- [ ] 3.5 Store the verified published vector and the daily-table fixture; verify both, and record the two unusable published examples with recomputed values

## 4. Peer comparison

- [ ] 4.1 Implement cohorting and percentile reporting with widening, and register the cohort tables as a downloadable dataset; verify the co-op, cohort-too-small, and cohort-downloadable scenarios
- [ ] 4.2 Implement basis and method guards; verify the mixed-bases and method-label scenarios
- [ ] 4.3 Show coverage share with its caveat; verify the partial-coverage scenario
- [ ] 4.4 Link the comparison from `data/utility-pages`; verify the link carries no user data and the page states the cohort

## 5. Surfaces

- [ ] 5.1 Run every worked example through the MCP server; verify identical structured results
- [ ] 5.2 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
