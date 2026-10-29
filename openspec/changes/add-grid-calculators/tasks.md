## 1. Line rating

- [ ] 1.1 Implement the steady-state heat balance with unit conversion at the boundary; verify the metric-equivalence scenario
- [ ] 1.2 Generate and commit 50 reference cases from `linerate` and `pypacity`; verify every case within 1% or documented
- [ ] 1.3 Ambient-adjusted rating table and CSV export; verify the table export scenario
- [ ] 1.4 Build the conductor starter library from public-domain sources with per-entry citations; verify every entry has a source and license

## 2. Units, emissions, storage, cost

- [ ] 2.1 Energy and fuel converter with EIA constants (built in phase 0 as the reference tool; this task extends it with fuels); verify the 12 MWh and heat-content scenarios
- [ ] 2.2 Annual emissions with eGRID rates; verify against eGRID's published examples
- [ ] 2.3 Battery basics and LCOE; verify the 5.33 h scenario and an LCOE recomputed from a published public example

## 3. Surfaces

- [ ] 3.1 Run worked examples through the MCP server; verify identical results
- [ ] 3.2 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
