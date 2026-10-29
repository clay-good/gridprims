## 1. Data

- [ ] 1.1 Snapshot EIA-930 hourly demand, generation by fuel, CO₂, and consumption-based intensity for every balancing authority since 2018-07-01 into per-region-year shards; verify 5 sampled region-hours equal EIA's published values
- [ ] 1.2 Track revisions between snapshots; verify a fixture with changed hours produces the right changelog counts
- [ ] 1.3 Store Open Grid Emissions fixtures for the cross-check regions with CC BY attribution; verify the registry entry

## 2. Tools

- [ ] 2.1 Region assignment from EIA-861 with a picker for multi-region utilities; verify the two-region scenario
- [ ] 2.2 Hourly emissions with UTC hour matching, exclusions, and eGRID comparison; verify the hour-alignment and missing-intensity scenarios
- [ ] 2.3 Hourly matching with supply profiles and the combined score; verify the 100%-annual solar scenario
- [ ] 2.4 Cleanest-hours charts and shift estimate, working without a file; verify the EV-shift scenario
- [ ] 2.5 Caveat and draft-method labels on every result and copied card; verify by snapshot tests

## 3. Verification and surfaces

- [ ] 3.1 Run the OGE cross-check; verify differences per region are within 10% or documented
- [ ] 3.2 Run every worked example through the MCP server; verify identical structured results
- [ ] 3.3 DESIGN.md glance test, 320 px sweep, keyboard pass; verify CI green
