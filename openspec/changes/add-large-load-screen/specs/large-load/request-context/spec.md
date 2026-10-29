## Purpose

Puts a proposed large load in plain context so local officials, boards, and reporters can grasp its scale relative to the utility that would serve it.

## ADDED Requirements

### Requirement: Size comparisons
Given a requested load (MW, and optional load factor, default 80%) and a utility, the card SHALL show the request as a percent of the utility's latest annual peak demand (FERC Form 714 via PUDL, registered by `add-public-grid-data` with its respondent-to-EIA crosswalk and pinned PUDL release) and its implied annual energy as a percent of the utility's annual retail sales (EIA-861), with sources and years.

#### Scenario: Co-op request
- **WHEN** a 300 MW request at 80% load factor is compared with a utility peaking at 1,500 MW and selling 7,000,000 MWh a year
- **THEN** the card shows 20.0% of peak and 30.0% of annual sales (2,102,400 MWh)

### Requirement: Missing peak
When Form 714 has no peak for the utility, the card SHALL say so and show only the sales comparison.

#### Scenario: No Form 714 peak
- **WHEN** the utility files no Form 714
- **THEN** the card shows only the percent of annual sales and says the peak is not reported to FERC

### Requirement: Household equivalents with method
The card SHALL express the implied annual energy as an equivalent number of the utility's average residential customers (annual energy ÷ the utility's average residential use per customer from EIA-861), with the formula shown.

#### Scenario: Household equivalent
- **WHEN** the utility's average residential customer uses 12,000 kWh a year
- **THEN** 2,102,400 MWh is shown as about 175,200 average homes, with the division visible

### Requirement: Verification
Percent and household figures SHALL be recomputed by hand for at least 3 utilities from the cited Form 714 and EIA-861 rows and stored as fixtures; results SHALL match to 0.1 percentage point and 100 homes.

#### Scenario: Stored hand computation
- **WHEN** CI runs the three stored utility cases
- **THEN** every percent and household figure matches

### Requirement: Who pays explanation
The card SHALL explain in plain words, with links to the applicable tariff terms if one exists, how minimum bills and exit fees are meant to protect other customers, and SHALL say when no large-load tariff is on file for the utility.

#### Scenario: No tariff on file
- **WHEN** the utility has no entry in the terms table
- **THEN** the card says no public large-load tariff was found and links to the state regulator's docket search
