## Purpose

Answers "who is my electric utility?" from a ZIP code or county without revealing the ZIP code to anyone.

## ADDED Requirements

### Requirement: ZIP and county lookup on the device
The lookup SHALL map a ZIP code to counties using the Census 2020 ZCTA-to-county relationship file (public domain; land-area overlap only, rows with a blank ZCTA dropped) and counties to utilities using EIA-861 service territory data. The app SHALL ship a small table mapping three-digit ZIP prefixes to states, SHALL fetch only the state-level shard (or shards, when a prefix or ZCTA spans states) for the entered ZIP, and SHALL perform the match on the device.

#### Scenario: Request privacy
- **WHEN** a user enters a ZIP code
- **THEN** the only network request is for the state shard, and the ZIP appears in no request

### Requirement: Honest about overlap
Because EIA-861 lists territories by county, the result SHALL list every utility serving any county the ZIP touches, ordered by customers, and SHALL say that the user's address may be served by only one of them. Retail power marketers SHALL be listed separately from the delivery utility.

#### Scenario: Several utilities
- **WHEN** a ZIP spans two counties served by a co-op and an investor-owned utility
- **THEN** both are listed with a note to confirm with the utility or a recent bill

#### Scenario: ZIP spanning two states
- **WHEN** a ZIP's ZCTA overlaps counties in two states
- **THEN** both state shards are fetched and utilities from both are listed

### Requirement: ZCTAs are approximate
Because Census ZCTAs approximate ZIP codes, every lookup result SHALL say so.

#### Scenario: Note shown
- **WHEN** a lookup result appears
- **THEN** it notes that ZIP areas are approximated by Census ZCTAs

### Requirement: County lookup names the state
County lookup SHALL require a state, since county names repeat across states.

#### Scenario: Washington County
- **WHEN** a user types "Washington County"
- **THEN** the tool asks which state before fetching anything

### Requirement: eGRID subregion and balancing authority
The lookup SHALL also return the eGRID subregion(s) for the ZIP from EPA's Power Profiler ZIP-to-subregion table (EPA, public domain; published with each eGRID edition) and the utility's balancing authority from EIA-861, for use by the carbon tools; ZIPs in more than one subregion SHALL list each.

#### Scenario: Two subregions
- **WHEN** a ZIP maps to two eGRID subregions
- **THEN** both are listed and the carbon tools ask the user to choose

### Requirement: Invalid input
The lookup SHALL reject inputs that are not five-digit ZIP codes or known county names and SHALL say what it expects.

#### Scenario: Four-digit ZIP
- **WHEN** a user enters "4321"
- **THEN** the tool says a ZIP code has five digits, suggests "04321" in case a leading zero was dropped, and does not fetch anything
