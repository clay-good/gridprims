## Purpose

Explains each part of the grid people ask about, balancing authorities, states, and emissions subregions, with demand, generation mix, emissions, and the utilities and plants inside.

## ADDED Requirements

### Requirement: Balancing authority pages
The site SHALL generate one page per balancing authority in EIA-930 showing: daily peak demand and daily energy for the latest 13 months, monthly generation by fuel type, net interchange, the record peak in our data with its date, and links to the utilities and plants in it. Charts SHALL be built from daily and monthly rollups of our hourly snapshot, and the page SHALL link to the hourly dataset and the cleanest-hours tool for that region.

#### Scenario: Record peak
- **WHEN** a visitor opens a balancing authority page
- **THEN** the page states the highest daily peak in our data, its date, and the data period searched

### Requirement: Rollups checked against EIA
Daily and monthly rollups (EIA-930, EIA, public domain; as-of = the snapshot's pinned EIA file date) SHALL match EIA's own published daily values in its Hourly Electric Grid Monitor files for a sample of 5 balancing authorities and 30 days, within 0.5%.

#### Scenario: Rollup check
- **WHEN** CI compares our daily peaks with EIA's daily values for the sample
- **THEN** every value is within 0.5% or the difference is documented

### Requirement: State pages
The site SHALL generate one page per state and DC showing: utilities by ownership type with customer shares, generation capacity and generation by fuel, average price by sector, the balancing authorities that serve it, and the interconnection queue summary from `data/queue-snapshot`.

#### Scenario: Ownership mix
- **WHEN** a visitor opens a state page
- **THEN** the page shows the share of customers served by investor-owned, cooperative, and public utilities, with the EIA-861 year

### Requirement: eGRID subregion pages
The site SHALL generate one page per eGRID subregion with total output and non-baseload CO₂ emission rates (lb/MWh) and SHALL explain in one sentence each when to use which: total output for location-based Scope 2 reporting, non-baseload for estimating avoided emissions.

#### Scenario: Rate guidance
- **WHEN** a visitor reads an emission rate
- **THEN** the guidance sentence and the eGRID edition appear next to it

### Requirement: Grid pulse source
The region data SHALL provide the 14 most recent daily peak demand values (MW) per balancing authority and for the lower 48 total, with their dates, for the app-shell grid pulse.

#### Scenario: Pulse value
- **WHEN** the pulse shows a value for a region
- **THEN** it matches the latest daily value on that region's page and shows the same date
