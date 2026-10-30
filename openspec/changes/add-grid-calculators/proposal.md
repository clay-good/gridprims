## Why

**Value up front:** the grid math that today lives behind paywalled standards, Python libraries, or old spreadsheets, as instant, cited browser calculators and MCP tools. The flagship is the first free browser tool we know of for overhead line ampacity by the IEEE 738 method, including the ambient-adjusted rating tables FERC Order 881 now requires transmission providers to use.

Why (`docs/research/02`, `03`, `05` §3): FERC Order 881 makes ambient-adjusted ratings mandatory: PJM went live on 2026-03-04, ISO-NE goes live in November 2026, and MISO has until the end of 2028 (`docs/research/06`). Engineers, regulators' staff, intervenors, and students have no free browser tool; the open implementations are Python packages (`linerate`, `pypacity`). Unit and emissions conversions are asked constantly and answered inconsistently.

## What Changes

- **Line rating:** steady-state conductor ampacity by the IEEE 738 heat-balance method from user inputs and a public-domain conductor starter library, plus an ambient-adjusted rating table by temperature with day and night solar conditions.
- **Energy units and emissions:** energy and fuel conversions with EIA constants; annual emissions from MWh with eGRID rates.
- **Storage and cost basics:** battery duration, C-rate, usable energy after efficiency and depth of discharge, and levelized cost of energy with every input visible.
- **Power-factor correction:** the reactive correction needed to reach a target power factor, and what the current power factor costs on the user's own tariff.
- **Transformer sizing and loading:** required kVA from load or amps, the next standard rating, and how heavily an existing transformer is loaded.

## Capabilities

### New Capabilities

- `calc/line-rating`: IEEE 738-method ampacity and ambient-adjusted rating tables.
- `calc/energy-units-and-emissions`: Energy, fuel, and emissions conversions with cited constants.
- `calc/storage-and-cost`: Battery sizing basics and LCOE.
- `calc/power-factor-correction`: Capacitor sizing and the tariff cost of low power factor.
- `calc/transformer-sizing`: Required kVA, standard ratings, and loading of an existing unit.

### Modified Capabilities

None.

## Non-goals

- Reproducing IEEE text or tables, or any copyrighted conductor catalog.
- Transient or dynamic line rating from live sensors.
- Transformer loading-guide math (permissible overload duration, hot-spot temperature, loss of life) and capacitor bank design (stages, placement, harmonic and resonance analysis).
- Building wiring, conductor sizing for premises, or NEC calculations (roughlogic.com).

## Impact

- Phase 3, except the conversion half of `calc/energy-units-and-emissions`, which phase 0 builds as the foundation's reference tool (`establish-platform-foundation` design D10). Adds a conductor starter library from public-domain sources and stored reference outputs from `linerate` and `pypacity` for verification.
