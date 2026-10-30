## 1. Fleet data

- [ ] 1.1 Assemble per-region-year fleets from the registered snapshots with per-field sources; verify the unit-sourced and retired-mid-year scenarios
- [ ] 1.2 Derive heat rates from monitored heat input and gross load, with technology and vintage fallbacks, methods, and ranges; verify the monitored and unmonitored scenarios and the derived-share report
- [ ] 1.3 Attach fuel costs with regional monthly substitution and marking; verify the missing-cost and substitution-share scenarios
- [ ] 1.4 Compute variable cost with propagated ranges; verify the cost-with-range scenario
- [ ] 1.5 Report unplaceable units and their capacity; verify the unplaceable-unit scenario
- [ ] 1.6 Implement fleet editing with an explicit diff; verify the edits-listed scenario
- [ ] 1.7 Register and publish the derived fleet and cost tables; verify the fleet-downloadable scenario

## 2. Dispatch

- [ ] 2.1 Implement merit-order dispatch over recorded demand and renewables; verify the residual-met and demand-exceeds-fleet scenarios
- [ ] 2.2 Implement fixed interchange and the declared storage rule; verify the interchange-fixed scenario
- [ ] 2.3 Meet the interactive speed budget on the reference profile; verify a full region-year and a post-edit re-run each complete in under one second
- [ ] 2.4 Keep all computation and scenario state on the device; verify the sentinel egress scenario with sentinel-named units
- [ ] 2.5 Store independent merit-order reference outputs for 3 region-years; verify fuel totals within 0.5% and marginal unit matching in at least 99% of hours
- [ ] 2.6 Attach the omissions list to every result and copied card; verify by snapshot test

## 3. Self-backtest

- [ ] 3.1 Run and display the unmodified comparison before unlocking scenario controls; verify the controls-unlock and error-by-fuel scenarios
- [ ] 3.2 Implement the error metrics with their definitions shown; verify the metrics-defined scenario
- [ ] 3.3 Carry the error into every scenario result and copied card; verify the copied-scenario scenario
- [ ] 3.4 Implement the poor-fit threshold and suppression of smaller differences; verify the poor-fit scenario
- [ ] 3.5 Publish the fit table per region and year with data versions; verify the fit-table scenario
- [ ] 3.6 List candidate error causes with affected shares and assert none; verify the causes-listed scenario

## 4. Screening views

- [ ] 4.1 Implement retirement and addition screening; verify the coal-retired and addition-that-changes-little scenarios
- [ ] 4.2 Implement the marginal-unit explorer and its distributions; verify the marginal-hour and published-marginal-rates scenarios
- [ ] 4.3 Implement net-load and curtailment screening; verify the doubled-solar scenario
- [ ] 4.4 Implement the user-supplied outage sensitivity and the refusal of reliability figures; verify the reliability-number-refused scenario
- [ ] 4.5 Attach labels, omissions, error, derived shares, and links to every view; verify the label-and-links scenario
- [ ] 4.6 Run hand-computed fixtures and the independent retirement cross-check; verify within 1% or documented

## 5. Surfaces

- [ ] 5.1 Expose dispatch and screening through the MCP server with the backtest error in every structured result; verify an agent cannot receive a scenario result without its model error
- [ ] 5.2 Add the cannot-do entries (reliability figures, nodal prices, commitment, forecasts) to the limits page; verify each carries its reason and citation
- [ ] 5.3 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
