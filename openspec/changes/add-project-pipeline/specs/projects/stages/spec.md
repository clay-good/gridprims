## Purpose

Turns EIA's monthly generator inventory into project stages and rows that can be checked against the publisher's file, without adding location or engineering detail.

## ADDED Requirements

### Requirement: Source and credit
Project data SHALL come only from the `generators` table of the `eia-860m` dataset, published by the U.S. Energy Information Administration as a U.S. government work (17 U.S.C. 105). Every page and JSON file SHALL carry the dataset's attribution, release, publication date (`asOf`), and inventory month (`dataPeriod`).

#### Scenario: A reader checks the date
- **WHEN** a project page or JSON file is built from release 2026-10
- **THEN** it names EIA, Form EIA-860M, publication date 2026-10-23, and inventory month September 2026

### Requirement: EIA status codes map to five stages
The build SHALL assign planned generators by EIA status: P to Planned, L to Waiting for approval, T to Approvals received, and U, V, or TS to Being built. A planned generator with any other status SHALL fail the build with the plant, generator, and status named.

#### Scenario: A generator is more than half built
- **WHEN** a generator in EIA's planned sheet has status V
- **THEN** it counts as Being built and its row keeps EIA's status wording

#### Scenario: EIA adds a new status code
- **WHEN** a planned generator has a status outside the six mapped codes
- **THEN** the build fails and writes no project files

### Requirement: Finished is a rolling 24-month window
Finished SHALL hold generators in EIA's operating sheet whose operating month falls within the 24 calendar months ending at the inventory month, inclusive. Retired generators SHALL NOT appear in any stage.

#### Scenario: The September 2026 inventory
- **WHEN** the inventory month is September 2026
- **THEN** a generator first operating in October 2024 is Finished and one first operating in September 2024 is not

### Requirement: A row is one plant in one stage
The build SHALL produce one row per plant and stage, carrying the plant ID, plant name, reporting entity, state, county, balancing authority, stage, EIA status wording, generator count, technologies, nameplate MW, and reported month or month range. Nameplate MW SHALL be the sum of the row's generators.

#### Scenario: One plant in two stages
- **WHEN** a plant has one generator Approvals received and another Being built
- **THEN** it has two rows, and each generator counts in exactly one

### Requirement: Totals reconcile with EIA's file
For every release, each stage's generator count SHALL equal the independent count from EIA's file exactly, and its nameplate capacity SHALL match within 0.1 MW. State totals and balancing-authority totals SHALL each add up to the national stage totals within 0.1 MW.

#### Scenario: Release 2026-10
- **WHEN** the reconciliation runs on release 2026-10
- **THEN** it finds 695 Planned generators at 100,556.7 MW, 406 Waiting for approval at 64,727.3 MW, 228 Approvals received at 27,036.4 MW, 1,029 Being built at 97,921.6 MW, and 2,176 Finished at 118,972.4 MW

### Requirement: Messy records are kept and labeled
The build SHALL NOT alter a published value or infer a missing one. A blank county, or a county that does not match a Census county in the row's state, SHALL be grouped as "County not confirmed" with EIA's text kept on the row. A blank balancing authority SHALL be grouped as "Not reported". A missing planned date SHALL read "Date not reported".

#### Scenario: An offshore project has no county
- **WHEN** EIA gives Coastal Virginia Offshore Wind no county
- **THEN** its 2,640 MW counts in Virginia's totals and appears under "County not confirmed"

#### Scenario: A reported date has passed
- **WHEN** a generator's planned operating month is earlier than the inventory month
- **THEN** its row keeps the reported date and says the date has passed

### Requirement: Canceled or postponed generators stay separate
Generators in EIA's canceled or postponed sheet SHALL be reported only as a count and nameplate MW for the nation and each state. They SHALL NOT be added to any stage.

#### Scenario: National totals
- **WHEN** release 2026-10 is summarized
- **THEN** 1,745 generators at 185,356.8 MW appear as canceled or postponed and in no stage total

### Requirement: Project files stop at the county
Published project files SHALL NOT carry latitude, longitude, map links, geometry, points of interconnection, substations, feeders, circuits, buses, or transmission line names. The build SHALL fail if a field name in `dist/projects/*.json` matches any of these.

#### Scenario: A coordinate reaches a project file
- **WHEN** a fixture project file contains a `latitude` field
- **THEN** the CEII gate fails and names the file and field

### Requirement: State files are open and small
The build SHALL emit `/projects/<st>.json` for each state and DC with at least one row. Each file SHALL be readable from any origin and SHALL stay at or below 40 KB compressed.

#### Scenario: Another site reads Texas
- **WHEN** a client requests `/projects/tx.json`
- **THEN** the response is 200, allows any origin, and holds Texas rows only
