## Purpose

Shows large customers how much of their load landed on the grid's system peaks, the charges those peaks drive, and what reducing load in those hours would have saved.

## ADDED Requirements

### Requirement: Supported programs
The tool SHALL support ERCOT 4CP (the four monthly 15-minute system peak intervals in June–September), PJM 5CP and the peak load contribution for capacity, PJM network service peak load (NSPL, the zone's single annual peak hour) for transmission, the NYISO ICAP tag, and the ISO-NE ICL tag.

#### Scenario: Program picker
- **WHEN** a user's utility is in ERCOT
- **THEN** ERCOT 4CP is preselected and the other programs remain selectable

### Requirement: Program rules are versioned by rule year
Each program definition SHALL carry its method (number of coincident peaks, which months, interval length, and whether the hour label is hour-beginning or hour-ending in the operator's time basis), the rule year it applies to, its source document, and its effective dates. An adopted rule change (see `docs/research/06` and design D5) SHALL be added as a new version without altering results for earlier years.

#### Scenario: Older year uses older rule
- **WHEN** a user analyzes 2025 data in ERCOT after a 12CP rule version is added
- **THEN** the 2025 analysis uses the 4CP definition in force in 2025 (four 15-minute intervals, June–September) and names it

#### Scenario: Method change, not just a date change
- **WHEN** a 12CP version with 30-minute intervals is added
- **THEN** the tool re-averages the user's intervals to 30 minutes for that version and refuses the version for hourly files with an explanation

#### Scenario: Hour label conventions
- **WHEN** PJM publishes a July 5CP hour as hour ending 18:00 EPT and NYISO publishes a July peak as the hour beginning 18:00 EDT
- **THEN** the PJM hour starts at 21:00Z and the NYISO hour starts at 22:00Z, and a fixture pins each conversion

### Requirement: Published peak intervals only
System peak intervals SHALL come from the grid operator's published values, with source and as-of date. The tool SHALL NOT forecast future peak days in v1.

#### Scenario: Peaks not yet published
- **WHEN** the data covers a summer whose 4CP intervals ERCOT has not yet published
- **THEN** the tool says the intervals are not yet published and does not estimate them

### Requirement: Peak intervals ship only where licensed
Where the operator's terms allow redistribution (ERCOT, per `docs/research/01` and `06`), peak intervals SHALL ship in our snapshot, registered with ERCOT as publisher, its terms retained (not relicensed), and ERCOT's posting date as the as-of date. Where terms reserve rights or forbid redistribution (PJM, NYISO, ISO-NE), the tool SHALL link to the operator's list and let the user enter dates and hours, until a legal review approves shipping a cited factual excerpt.

#### Scenario: PJM peaks entered by the user
- **WHEN** a user selects PJM 5CP
- **THEN** the tool links to PJM's published 5CP list, shows five date-and-hour fields, and computes once they are filled

### Requirement: Exposure and cost
For each program the tool SHALL show the user's load in each system peak interval, the resulting tag or average, and, when the user enters the related rate, the annual cost: $/kW-month or $/kW-year for transmission, and for PJM capacity $/MW-day × peak load contribution × the EDC scaling factor the user enters × days in the delivery year. It SHALL show the savings had load been reduced by a user-set amount in those intervals, and SHALL name the period the charge applies to.

#### Scenario: ERCOT 4CP
- **WHEN** a Texas customer's load was 900, 950, 880, and 970 kW in the four 2025 4CP intervals
- **THEN** the 4CP average is 925 kW; at $4.00/kW-month the tool shows $44,400 a year (925 × $4.00 × 12) and $4,800 saved per 100 kW reduced, applied to the following calendar year's bills

#### Scenario: ERCOT eligibility note
- **WHEN** ERCOT 4CP is shown
- **THEN** a note says 4CP transmission charges apply to customers billed on 4CP demand under their wires utility's tariff (typically interval-metered loads above 700 kW) and links the tariff

#### Scenario: PJM capacity cost
- **WHEN** a peak load contribution is 1,000 kW, the scaling factor 1.05, the price $329.17/MW-day, and the delivery year 365 days
- **THEN** the annual capacity cost is $126,154.40 (1.0 MW × 1.05 × $329.17 × 365)

### Requirement: Verification
ERCOT 4CP averages SHALL be checked against at least one published worked example of 4CP transmission cost allocation (for example from a Texas utility or PUCT filing cited in `docs/research/03`), and PJM, NYISO, and ISO-NE tag math against each operator's published method example, within $1 or 0.1 kW.

#### Scenario: Published example
- **WHEN** CI runs the stored 4CP worked example
- **THEN** the average kW and annual cost match the published values

### Requirement: Interval alignment
The tool SHALL align the user's intervals to the operator's interval definition and time basis (for example ERCOT 15-minute intervals in Central Prevailing Time) and SHALL say when the user's file resolution is coarser than the program's, in which case results are labeled approximate.

#### Scenario: Hourly file in a 15-minute program
- **WHEN** a user's file is hourly and the program uses 15-minute intervals
- **THEN** the result is labeled "approximate: your data is hourly" and explains the effect
