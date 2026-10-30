## Purpose

Assembles the generating fleet of a balancing authority from our existing snapshots, with each cost input carrying its source and its uncertainty, so a dispatch can be audited input by input.

## ADDED Requirements

### Requirement: Fleet contents
For each balancing authority and year, the fleet SHALL list every generating unit with: plant and unit identifiers, capacity (MW), fuel, technology, operating and retirement dates, and whether it is monitored for hourly emissions, built from the registered EIA-860 generator, EIA-923 generation and fuel-cost, and EPA CAMD monitored-emissions snapshots, with each field's source and snapshot version named.

#### Scenario: Unit sourced
- **WHEN** a visitor inspects a unit in the fleet
- **THEN** every field shows which dataset and version it came from

#### Scenario: Unit retired mid-year
- **WHEN** a unit retired in June of the chosen year
- **THEN** it is available to dispatch only for hours before its retirement date, and the fleet notes the date

### Requirement: Heat rates derived, with method and range
Each thermal unit SHALL carry a heat rate with its derivation method and a plausible range: derived from the monitored monthly heat input and gross load in the EPA CAMD snapshot where the unit is monitored, otherwise from a fleet average by technology and vintage. The fleet SHALL report the share of regional capacity whose heat rate is derived rather than unit-measured.

#### Scenario: Monitored unit
- **WHEN** a unit reports monthly heat input and gross load
- **THEN** its heat rate is derived from those values, the method is named, and the range reflects the spread across its own months

### Requirement: Known biases in derived heat rates are named and handled
The derivation SHALL state and handle each known bias. A blank value SHALL be treated as missing rather than zero. Substitute data the monitoring program inserts for invalid periods SHALL be excluded where it can be identified, with the share excluded reported.

#### Scenario: Blank is not zero
- **WHEN** a monitored month has a blank heat input
- **THEN** that month is excluded from the derivation as missing, and the excluded share is reported, rather than treated as zero fuel

### Requirement: Combined-cycle configurations
Combined-cycle configurations may report the combustion turbine's fuel without the steam turbine's generation, so such units SHALL be combined at the configuration level before a heat rate is derived, or excluded with their capacity reported.

#### Scenario: Gross to net stated
- **WHEN** a derived heat rate is shown
- **THEN** the page states that monitored load is gross, names the net-to-gross ratio applied, its EIA-923-to-CAMD derivation and sample, and shows the rate before and after it

#### Scenario: Combined-cycle configuration
- **WHEN** a combustion turbine reports fuel but its paired steam turbine's generation is reported separately
- **THEN** the units are combined at the configuration level before deriving a heat rate, or the configuration is excluded and its capacity reported as unplaceable

### Requirement: The net-to-gross adjustment is derived, not assumed
Because monitored load is gross while dispatch and EIA-930's recorded generation are net, a net-to-gross adjustment SHALL be applied and shown. It SHALL be derived per technology from the ratio of EIA-923 net generation to the same units' CAMD gross load over the same months, never taken from a literature value, and the derived ratio, its sample size, and its spread SHALL be published.

#### Scenario: Ratio published
- **WHEN** the fleet table is built for a region-year
- **THEN** each technology's net-to-gross ratio, the units and months it was derived from, and its spread are published beside the derived heat rates

### Requirement: Heat rates cross-checked against EIA-923
Derived unit heat rates SHALL be aggregated to plant and period and compared with the plant heat rate implied by EIA-923's generation and fuel consumption, with the distribution of differences published and any plant whose derived rate differs by more than 20% flagged as low-confidence.

#### Scenario: Plant cross-check
- **WHEN** a plant's derived heat rate differs from the EIA-923-implied rate by more than 20%
- **THEN** the plant is flagged, its units are marked low-confidence, and the difference is published

#### Scenario: Unmonitored unit
- **WHEN** a unit is not monitored
- **THEN** its heat rate comes from a technology and vintage average, is labeled as such, and carries that group's spread as its range

### Requirement: Fuel costs, with substitutions marked
Each unit SHALL carry a fuel cost with its source. Where the plant's own reported fuel cost is missing, a regional monthly price for that fuel SHALL be used, the unit marked as substituted, and the share of regional capacity running on a substituted price reported on the fleet and on every result derived from it.

#### Scenario: Missing reported cost
- **WHEN** a plant reports no fuel cost for the period
- **THEN** its unit uses the regional monthly price, is marked substituted with that source, and counts toward the reported share

#### Scenario: Substitution share shown
- **WHEN** a quarter of regional capacity uses substituted prices
- **THEN** that share appears on the fleet summary and on every dispatch result

### Requirement: Variable cost and its uncertainty
Each unit's variable cost SHALL be computed as its heat rate times its fuel cost plus its variable operating cost, in dollars per MWh, with the inputs and the arithmetic shown, and a range propagated from the heat-rate and fuel-cost ranges.

#### Scenario: Cost shown with range
- **WHEN** a unit's variable cost is displayed
- **THEN** it shows the value, the inputs that produced it, and a range, all in stated units

### Requirement: Gaps are shown, never filled silently
Units missing a field the dispatch needs SHALL be listed with the missing field, and the fleet SHALL state how much capacity it could not place in merit order and how those units were handled.

#### Scenario: Unplaceable unit
- **WHEN** a unit has no usable heat rate or fuel cost
- **THEN** it is listed as unplaceable with the missing field, excluded from merit order, and its capacity reported in the summary

### Requirement: Fleet is editable and the edits are explicit
A user SHALL be able to retire a unit, add a unit with entered characteristics, or change a unit's capacity or cost, and every edit SHALL be listed beside the result with its original value, so a scenario is always readable as a diff from the recorded fleet.

#### Scenario: Edits listed
- **WHEN** a user retires two units and adds one
- **THEN** the result lists all three edits with their original values and labels the run a scenario

### Requirement: Registered and downloadable
The derived fleet and cost tables SHALL be a registered dataset with gridprims as publisher, the build date as the as-of date, the snapshot versions recorded, and the rows downloadable. Rows derived from EIA data SHALL be published under CC BY 4.0 crediting EIA; rows derived from EPA data SHALL carry EPA's own stated terms rather than being relicensed, per `platform/data-snapshots`.

#### Scenario: Fleet downloadable
- **WHEN** a researcher downloads a region-year fleet
- **THEN** it carries every field, its sources, its derivation methods, and the upstream snapshot versions

### Requirement: This change registers no snapshot of its own
EIA-860 and EIA-923 SHALL be owned by `add-public-grid-data` and the EPA CAMD monitored-emissions snapshot by `add-measured-plant-emissions`. Both changes SHALL be applied before this one, which SHALL register no dataset of its own and SHALL read only their registered snapshots.

#### Scenario: Upstream snapshot missing
- **WHEN** the fleet build runs before the CAMD snapshot is registered
- **THEN** it fails naming the owning change rather than fetching or registering the dataset itself

