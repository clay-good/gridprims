## Purpose

Shows what large fossil plants actually measured at the stack, by month and by hour, so a plant's own monitored numbers sit beside the estimates everyone else quotes.

## ADDED Requirements

### Requirement: Dataset and provenance
The dataset SHALL contain, per monitored unit: measured carbon dioxide (short tons, converted to metric tons at 0.90718474 metric tons per short ton, the factor shown on the page), sulfur dioxide, nitrogen oxides, heat input, and operating time, aggregated to monthly per unit and plant and to hourly per region per year.

#### Scenario: Contents and conversion
- **WHEN** a monitored unit's monthly row is built
- **THEN** it carries carbon dioxide in metric tons converted at 0.90718474 from short tons, sulfur dioxide and nitrogen oxides in their reported units, heat input, and operating time

### Requirement: Registered to EPA CAMPD
The dataset SHALL be registered with the U.S. Environmental Protection Agency's Clean Air Markets Program Data (CAMPD) as publisher, the redistribution basis recorded as a United States federal work not subject to domestic copyright, EPA's suggested citation as the required attribution, and the source file dates as the as-of date.

#### Scenario: Registry entry
- **WHEN** a visitor opens the dataset in the data library
- **THEN** it names EPA CAMPD, the federal-works basis, EPA's suggested citation, the data period, and our retrieval date

#### Scenario: Open license question recorded
- **WHEN** EPA's page states a citation but no license
- **THEN** the registry entry records that, names it as an open verification item, and the dataset still ships on the federal-works basis

### Requirement: No key reaches either surface
The agency key SHALL be used only in the build environment, SHALL NOT be committed, and SHALL NOT appear in any shipped file. The website and the local agent server SHALL read only our own shipped snapshots.

#### Scenario: Key absent from the build output
- **WHEN** CI scans every deployed file and the agent server release for the key's name or value
- **THEN** neither appears, and the no-network tests pass unchanged

### Requirement: Plant page section
Plant pages SHALL gain a measured-emissions section showing monthly and annual measured carbon dioxide in metric tons, sulfur dioxide and nitrogen oxides in their reported units, heat input, and the implied emission rate in lb/MWh, beside the estimated annual figures already shown, with both sources and both data years named.

#### Scenario: Measured beside estimated
- **WHEN** a plant has both monitored data for 2026 and estimated data for 2023
- **THEN** both appear with their sources and years, and the page states that they are a measurement and an estimate from different years

#### Scenario: Plant not monitored
- **WHEN** a plant has no monitored unit
- **THEN** the section says monitors cover large fossil units in the federal trading programs and this plant is not among them, and the estimated figures remain

### Requirement: Coverage stated everywhere
Every measured figure SHALL be shown with the share of that plant's or region's reported generation that monitored units account for, so a partial figure is never read as a total.

#### Scenario: Partial coverage
- **WHEN** monitored units account for 62% of a region's generation
- **THEN** every regional measured figure shows that share

### Requirement: Apportioned units flagged
Units whose values the program apportions across a shared or complex stack SHALL be flagged on the plant page, with a note that their unit-level figures are a division of a measured total rather than a direct measurement.

#### Scenario: Shared stack
- **WHEN** two units share a stack and the program apportions their values
- **THEN** both unit rows carry the flag and the note

### Requirement: Peak-hour generation detail
For a region's highest-demand hours in a chosen period, the tool SHALL list the monitored units that were operating, their generation where reported, their measured carbon dioxide, and their emission rate, with the hour in local time and the region's demand for that hour.

#### Scenario: Peak hour
- **WHEN** a user opens a region's highest-demand hour for a summer
- **THEN** the monitored units running in that hour are listed with their measured emissions and rates, and the hour and regional demand are named

### Requirement: Verification
Monthly unit totals SHALL match the agency's own published unit-level summaries for at least 10 units across 3 states and 2 years, exactly where the agency publishes the same aggregate, and the short-ton to metric-ton conversion SHALL use the stated factor and be checked on a fixture.

#### Scenario: Unit total check
- **WHEN** CI compares our monthly unit totals with the agency's published summaries
- **THEN** every compared value matches, or the difference is documented with its cause
