## 1. Tools

- [ ] 1.1 Verify NEC 220.87 (2023) and 120.87 (2026) data-period rules, 15-minute averaging, and the solar and peak-shaving restriction through NFPA's free read-only access and the state adoption rules, buying nothing; record findings in `docs/derivations/service-headroom.md`; verify every rule the tool applies cites a clause number there
- [x] 1.2 Service headroom with sufficiency check, 15-minute re-averaging, bill-entry path, power-factor default and comparison, phase note, and printable report; verify the hourly-file, 20-day, 480 V three-phase, balanced-phase, and solar-home scenarios
- [x] 1.3 EV fleet inputs, unmanaged and managed charging, 125% continuous-load headroom check; verify the not-enough-time, numbers, midnight-DST, and managed-peak scenarios
- [ ] 1.4 Added-load alignment, typical county shapes, and combined results; verify the hourly-on-15-minute and winter-peak scenarios
- [ ] 1.5 Register EAGLE-I v4 county data and the county end-use load shapes (ResStock and ComStock, pinned release) with credit, both in state shards, and derive outage events; verify the registry entries carry publisher, license, and as-of rule, and that events match an independent script for 3 counties
- [ ] 1.6 Backup power sizing and REopt resilience handoff; verify the 9.6 kWh, 75 kWh, 7.0 kW, and short-event scenarios, coverage exclusion, and the county-proxy label

## 2. Surfaces

- [ ] 2.1 Run worked examples through the MCP server; verify identical results
- [ ] 2.2 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
