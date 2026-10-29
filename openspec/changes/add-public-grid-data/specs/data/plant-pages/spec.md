## Purpose

Gives every US power plant one readable, cited page: what it is, what it produces, what it emits, and when it is planned to change.

## ADDED Requirements

### Requirement: One page per plant with its generators
The site SHALL generate one page per plant in EIA-860 (keyed by EIA plant code) showing: name, operator (linked to its utility page), state, county, balancing authority, nameplate and summer capacity (MW), and a generator table with technology, energy source, capacity, operating year, status, and planned retirement year where reported.

#### Scenario: Generator table
- **WHEN** a plant has three generators
- **THEN** the table lists all three with their reported fields and sources

#### Scenario: Planned retirement
- **WHEN** a generator reports a planned retirement in 2028
- **THEN** the generator row shows "Planned retirement: 2028 (reported to EIA)" and the plant summary counts it under planned changes

### Requirement: County-level location on pages
Plant pages and page-backing shards SHALL show location at county level only. The data library's EIA-860 download SHALL remain EIA's complete public file, coordinates included, labeled as such.

#### Scenario: No precise coordinates
- **WHEN** a visitor views any plant page
- **THEN** the page shows the county and state and no latitude or longitude

### Requirement: Generation and capacity factor
The page SHALL show annual net generation (MWh) from EIA-923 (EIA, public domain; as-of = EIA's release date) for every year we hold and capacity factor = net generation ÷ (nameplate MW × hours in service that year), using EIA-860 nameplate and prorating by months in service for generators that started or retired mid-year, as a percent to 0.1. Plants with negative annual net generation (such as pumped storage) SHALL show "net consumer of energy" instead of a capacity factor.

#### Scenario: Capacity factor
- **WHEN** a 100 MW plant generates 219,000 MWh in a non-leap year
- **THEN** the page shows a capacity factor of 25.0%

#### Scenario: Mid-year start
- **WHEN** a 100 MW plant entered service on July 1 and generated 109,500 MWh that year (non-leap)
- **THEN** hours in service are 4,416 and capacity factor is 24.8%

#### Scenario: Pumped storage
- **WHEN** a plant's annual net generation is −120,000 MWh
- **THEN** the page shows "net consumer of energy" and no capacity factor

### Requirement: Emissions where covered
Where eGRID covers the plant, the page SHALL show annual CO₂ emissions in metric tons (the site-wide convention, converted from eGRID's short tons at 0.90718474 metric tons per short ton, rounded to the nearest metric ton, with the factor shown) and emission rate (lb/MWh) with the eGRID edition. Plants not in eGRID SHALL say so.

#### Scenario: Late eGRID edition
- **WHEN** the newest eGRID edition is older than the newest EIA-923 year
- **THEN** the emissions section names both years so the mismatch is visible

### Requirement: Content minimum
A plant page SHALL be generated only for plants with at least one operating or planned generator and at least four sourced facts.

#### Scenario: Canceled plant
- **WHEN** every generator at a plant is canceled
- **THEN** no page is generated
