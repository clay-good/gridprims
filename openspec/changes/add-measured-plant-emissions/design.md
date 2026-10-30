## Context

Sources and caveats are in `docs/research/13` (verified 2026-10-29) and `docs/research/01`: the program publishes bulk files and an interface that needs a free key; monitors cover units in the acid rain and interstate trading programs, mostly fossil units of 25 MW and above; values for plants with shared or complex stack configurations are apportioned between units and will differ from raw monitor records; files are large. EPA publishes a suggested citation and a disclaimer rather than a license: `docs/research/15` records that the disclaimer limits use to non-commercial, scientific, and educational purposes, that content "may be protected by copyright", and that only EPA's geospatial data is stated public domain. The redistribution basis is therefore recorded as EPA's own stated terms, captured automatically from EPA's page by the pipeline, and `platform/data-snapshots` derives the posture from them: unrecognized or restrictive terms mean we publish only values we computed and link EPA's own files rather than republishing them. Derived tables keep those terms rather than being relicensed, and nothing waits on written confirmation.

## Goals / Non-Goals

**Goals:** current measured plant facts, and an honest published error figure for the estimate our own tools use.

**Non-Goals:** replacing the estimate; compliance analysis; shipping raw hourly national data.

## Decisions

### D1. Aggregate at build time, ship two shapes
The pipeline fetches bulk files at build time and ships: monthly totals per unit and per plant (small, serves plant pages), and hourly totals per region per year (one packed file per region-year, serves the cross-check and the peak-hour view). Raw hourly per-unit national data is never shipped.

| Alternative | Why not |
|---|---|
| Ship raw hourly per-unit data | Hundreds of files far past our per-file and total budgets, for a question nobody asked. |
| Query the agency interface from the browser | Needs a key in client code and a third-party request; both forbidden. |

### D2. The estimate stays primary, the measurement is the check
The carbon tools keep using the public-domain estimated hourly intensity, because it covers every balancing authority and all fuels. The measured data covers part of the fleet, so it answers "how good is the estimate?" rather than replacing it.

Alternative: switch the carbon tools to measured data. Rejected: partial fleet coverage would silently exclude unmonitored generation and make a customer's footprint wrong in the other direction.

### D3. Compare like with like, or not at all
The cross-check compares only what is comparable: for a region and year, the carbon dioxide the monitored units reported against the carbon dioxide the estimate attributes to those same units' fuels and hours, with the monitored share of regional generation stated. Where the monitored share is low, the comparison is reported as uninformative rather than as a small error.

| Alternative | Why not |
|---|---|
| Compare monitored emissions with the region's whole estimate | The difference would mostly measure unmonitored generation, not the estimate's error. |
| Scale monitored emissions up to full fleet coverage | Inventing the unmonitored part is the error we are trying to measure. |

### D4. Apportionment is disclosed per unit
Units whose values the program apportions across a shared stack are flagged on the plant page, because their unit-level numbers are a division of a measured total rather than a direct measurement.

Alternative: present apportioned values like direct measurements. Rejected: a unit-level figure that is actually a share of a shared stack would be read as that unit's measurement, and plant totals would look more certain than they are.

### D5. Coverage is a first-class fact
Every page and result states what share of the plant's or region's generation the monitors cover. A plant with no monitored unit says so and keeps its estimated figures.

Alternative: show measured figures without the coverage share. Rejected: a partial figure with no share reads as a total, which is the most likely way this dataset gets misquoted.

## Risks / Trade-offs

- **The cross-check may embarrass our own primary dataset.** Mitigation: that is the point; publishing the error is more trustworthy than a caveat sentence, and the carbon results link to it.
- **Agency terms are not stated as a license.** Mitigation: registry records the federal-works basis and the suggested citation, and the open item stays until confirmed.
- **Build-time key management.** Mitigation: the key lives only in the build environment, is never committed, and the no-network tests prove neither surface uses it.
