## Context

IEEE 738-2023 is paywalled. Open implementations: `linerate` 5.0.0 (MIT; implements IEEE 738 and CIGRE) and `pypacity` 0.1.3 (GPL-3.0); neither names its IEEE 738 edition, and we only store their outputs, never bundle them (`docs/research/07`). Order 881 status (`docs/research/06`): PJM ambient-adjusted ratings went live 2026-03-04, ISO-NE goes live for operating day 2026-11-19, MISO has until 2028-12-31; NYISO, SPP, and CAISO dates are unverified. NLR ATB 2025 is now CC BY 4.0 (`docs/research/08`), so ATB values may serve as cited LCOE and storage defaults with credit. The public-domain USDA RUS Bulletin 1724E-200 gives ACSR diameters but no resistances, and no public-domain resistance table was found.

The conversion part of `calc/energy-units-and-emissions` is built in phase 0 as the foundation's reference tool (foundation design D10); everything else here is phase 3.

## Goals / Non-Goals

**Goals:** the first free browser IEEE 738-method calculator, verified against two open implementations.

**Non-Goals:** sensor-based dynamic line rating, transient ratings in v1.

## Decisions

### D1. Implement the heat balance from the published method, verify against stored outputs
We implement the steady-state heat balance from our own reading of the standard (purchased copy kept by the maintainer, not distributed) and verify against 50 stored cases run once in `linerate` and `pypacity`. Alternative: port one library. Rejected: their licenses would need tracking, and two independent references catch more errors than one port.

### D2. Conductor starter library: names and diameters, resistance by the user
The starter library ships conductor names, stranding, and diameters from RUS Bulletin 1724E-200 (public domain), each entry cited. AC resistance at two temperatures is entered by the user from their manufacturer's data sheet, with a link explaining where it is printed.

| Alternative | Why not |
|---|---|
| Copy resistances from manufacturer catalogs | Copyrighted compilations. |
| Compute resistance from DC resistivity and stranding | Misses skin and core effects; a wrong default rating is worse than a blank field. |

### D3. Power factor and transformer math reuse verified parts
Power-factor correction uses the trigonometric identity and, for the money, the verified bill engine's power-factor rules rather than its own tariff logic. Transformer sizing stops at apparent power and standard ratings.

| Alternative | Why not |
|---|---|
| Add transformer thermal loading (hot-spot, loss of life) | The loading guide is paywalled, inputs are oil and winding specifics users rarely have, and a wrong answer shortens equipment life. |
| Ship a capacitor bank design (stages, placement, harmonics) | Needs system impedance and harmonic spectra; resonance can damage equipment. Screening only, then an engineer. |

### D4. Transient ratings later
Transient (time-step) ratings need a time-series input UI and are deferred until steady-state tools show use. Alternative: ship both at once. Rejected: doubles verification work for a smaller audience.

## Risks / Trade-offs

- **Method differences between editions and libraries.** Mitigation: documented differences and edition labels.
- **Use in operations.** Mitigation: screening label stating ratings must come from the transmission owner's approved methodology.
