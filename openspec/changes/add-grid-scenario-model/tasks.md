## 1. Fleet data

- [x] 1.1 Assemble per-region-year fleets from the registered snapshots with per-field sources; verify the unit-sourced and retired-mid-year scenarios (EIA-860 and EIA-923; monitored status waits on add-measured-plant-emissions, which needs an EPA key)
- [x] 1.2 Derive heat rates from monitored heat input and gross load, with technology and vintage fallbacks, methods, and ranges; verify the monitored and unmonitored scenarios and the derived-share report (plant and configuration rates from EIA-923 with monthly ranges and technology-and-decade fallbacks; the monitored path, its gross-to-net ratio, and the EIA-923 cross-check wait on the CAMD snapshot)
- [x] 1.3 Attach fuel costs with regional monthly substitution and marking; verify the missing-cost and substitution-share scenarios
- [x] 1.4 Compute variable cost with propagated ranges; verify the cost-with-range scenario (variable O&M is zero and listed as omitted)
- [x] 1.5 Report unplaceable units and their capacity; verify the unplaceable-unit scenario
- [x] 1.6 Implement fleet editing with an explicit diff; verify the edits-listed scenario
- [x] 1.7 Register and publish the derived fleet and cost tables; verify the fleet-downloadable scenario (published with the site as /scenario/<region>/fleet.csv and fleet.json under CC BY 4.0 crediting EIA, with the upstream versions, rather than as a pipeline dataset, since this change registers no snapshot of its own)

## 2. Dispatch

- [x] 2.1 Implement merit-order dispatch over recorded demand and renewables; verify the residual-met and demand-exceeds-fleet scenarios
- [x] 2.2 Implement fixed interchange and the declared storage rule; verify the interchange-fixed scenario
- [x] 2.3 Meet the interactive speed budget on the reference profile; verify a full region-year and a post-edit re-run each complete in under one second (about 10 ms a region-year on a laptop; a 1,500-unit synthetic year and a re-run in the core test)
- [x] 2.4 Keep all computation and scenario state on the device; verify the sentinel egress scenario with sentinel-named units
- [x] 2.5 Store independent merit-order reference outputs for 3 region-years; verify fuel totals within 0.5% and marginal unit matching in at least 99% of hours (a plain-Python rerun from EIA's BALANCE files for PACE, SOCO, and ERCO; no third-party model is configured yet, and each page says so)
- [x] 2.6 Attach the omissions list to every result and copied card; verify by snapshot test

## 3. Self-backtest

- [x] 3.1 Run and display the unmodified comparison before unlocking scenario controls; verify the controls-unlock and error-by-fuel scenarios
- [x] 3.2 Implement the error metrics with their definitions shown; verify the metrics-defined scenario
- [x] 3.3 Carry the error into every scenario result and copied card; verify the copied-scenario scenario
- [x] 3.4 Implement the poor-fit threshold and suppression of smaller differences; verify the poor-fit scenario
- [x] 3.5 Publish the fit table per region and year with data versions; verify the fit-table scenario
- [x] 3.6 List candidate error causes with affected shares and assert none; verify the causes-listed scenario

## 4. Screening views

- [x] 4.1 Implement retirement and addition screening; verify the coal-retired and addition-that-changes-little scenarios
- [x] 4.2 Implement the marginal-unit explorer and its distributions; verify the marginal-hour and published-marginal-rates scenarios
- [x] 4.3 Implement net-load and curtailment screening; verify the doubled-solar scenario
- [x] 4.4 Implement the user-supplied outage sensitivity and the refusal of reliability figures; verify the reliability-number-refused scenario
- [x] 4.5 Attach labels, omissions, error, derived shares, and links to every view; verify the label-and-links scenario
- [ ] 4.6 Run hand-computed fixtures and the independent retirement cross-check; verify within 1% or documented

## 5. Surfaces

- [ ] 5.1 Expose dispatch and screening through the MCP server with the backtest error in every structured result; verify an agent cannot receive a scenario result without its model error
- [x] 5.2 Add the cannot-do entries (reliability figures, nodal prices, commitment, forecasts) to the limits page; verify each carries its reason and citation
- [ ] 5.3 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
