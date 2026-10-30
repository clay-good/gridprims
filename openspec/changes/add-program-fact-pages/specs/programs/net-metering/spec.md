## Purpose

Shows how much customer-owned generation is connected in a state or on a utility's system, and whether it is growing, from federal data anyone can check.

## ADDED Requirements

### Requirement: Dataset and provenance
The pages SHALL be built from the EIA-861 Net Metering and Non-Net Metering Distributed Generation files, registered with the U.S. Energy Information Administration as publisher, public domain as the redistribution basis, EIA's requested dated credit as the attribution, the survey year as the data period, and EIA's release date as the as-of date.

#### Scenario: Source stamp
- **WHEN** a visitor reads a net metering capacity figure
- **THEN** the stamp names EIA-861, the data year, EIA's release date, and our retrieval date

### Requirement: State pages
Each state page SHALL show net-metered capacity (MW), customer counts, and energy (MWh) by sector (residential, commercial, industrial, transportation) and by technology (for example photovoltaic, photovoltaic with storage, wind), for every year we hold, plus non-net-metered distributed capacity shown separately and labeled as a different arrangement.

#### Scenario: Technology split
- **WHEN** a state page is opened
- **THEN** capacity is broken out by technology with the survey's own category names, and photovoltaic-with-storage is not merged into photovoltaic

#### Scenario: Pre-2010 data
- **WHEN** a year predates the survey's sector-and-technology breakout
- **THEN** that year shows the totals the survey published and a note that the breakout began later

### Requirement: Utility sections
Each utility page SHALL gain a section showing that utility's net-metered capacity, customers, and energy with the same breakouts, or a statement that it reported none, and SHALL link to its state page and to the state's own rules.

#### Scenario: Utility reported none
- **WHEN** a utility reports no net-metered capacity
- **THEN** the section says it reported none for that year rather than showing a blank or a zero without context

### Requirement: Rules are linked, never restated
The pages SHALL NOT state what a state's net metering rules are. They SHALL link to the state commission's own page and to the policy database, naming each source and that the rules change.

#### Scenario: No rule text
- **WHEN** a visitor looks for the state's net metering cap
- **THEN** the page links to the commission and the policy database and says we do not restate rules

### Requirement: Verification
Totals SHALL be recomputed from the cited files and checked against the publisher's own published summary tables for at least 5 states and 2 years, matching exactly where the publisher publishes the same aggregate, with any difference documented.

#### Scenario: State total check
- **WHEN** CI compares our state totals with the publisher's summary table
- **THEN** every compared value matches, or the difference is documented with its cause
