## 1. Line rating

- [ ] 1.1 Implement the steady-state heat balance with unit conversion at the boundary; verify the metric-equivalence scenario
- [ ] 1.2 Generate and commit 50 reference cases from `linerate` and `pypacity`; verify every case within 1% or documented
- [ ] 1.3 Ambient-adjusted rating table and CSV export; verify the table export scenario
- [ ] 1.4 Build the conductor starter library from public-domain sources with per-entry citations; verify every entry has a source and license

## 2. Units, emissions, storage, cost

- [x] 2.1 Energy and fuel converter with EIA constants (built in phase 0 as the reference tool; this task extends it with fuels); verify the 12 MWh and heat-content scenarios
- [x] 2.2 Annual emissions with eGRID rates; verify against eGRID's published examples
- [ ] 2.3 Battery basics and LCOE; verify the 5.33 h scenario and an LCOE recomputed from a published public example
- [x] 2.4 Power-factor correction sizing and tariff cost; verify the 236.8 kVAR, 576.9 kW penalty, target-below-current, and no-reactive-data scenarios, plus two published examples within 1 kVAR
- [ ] 2.5 Transformer sizing and loading with a cited standard-rating list; verify the 498.8 kVA, 86.7% loading, over-rating, and round-trip scenarios

## 3. Surfaces

- [ ] 3.1 Run worked examples through the MCP server; verify identical results
- [ ] 3.2 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
