## Purpose

Answers "what would last year have cost on a different rate?" using the user's own intervals instead of a utility's averages, across every eligible rate for their utility.

## ADDED Requirements

### Requirement: Re-price on eligible rates
Given a utility and a customer class, the tool SHALL re-price the loaded intervals on every URDB rate for that utility and class whose stated eligibility (demand limits, voltage, sector) the load meets, and SHALL rank them by annual cost with the difference from the current rate in dollars and percent.

#### Scenario: Ineligible rate excluded
- **WHEN** a rate requires peak demand above 500 kW and the load peaks at 180 kW
- **THEN** that rate is listed under "Not eligible" with the reason

### Requirement: Explain the difference
For each alternative rate, the tool SHALL break the annual difference into fixed, energy, and demand components, and SHALL say in one sentence what drives it (for example "cheaper because your load is mostly off-peak").

#### Scenario: TOU winner
- **WHEN** a time-of-use rate is cheapest
- **THEN** the sentence names the share of energy used in its off-peak periods

### Requirement: Load-shift what-if
The user SHALL be able to shift a chosen amount of load (kW, hours) from one time window to another and see the effect on every compared rate.

#### Scenario: Shift chillers one hour earlier
- **WHEN** a user shifts 100 kW from 2–6 pm to 1–5 pm on weekdays
- **THEN** every rate's annual cost updates and the ranking may change

### Requirement: Verification
Each re-priced annual total SHALL equal the sum of the bill engine's verified monthly totals, and the ranking SHALL be checked on at least 3 fixture loads against stored PySAM Utilityrate5 annual costs for the same rates within 0.5%.

#### Scenario: Ranking agrees
- **WHEN** CI runs the 3-load comparison
- **THEN** the cheapest rate matches the stored independent result for each load

### Requirement: Honest about rate data
The comparison SHALL state how many of the utility's rates were found in URDB, the oldest last-updated date among them, and that URDB is manually maintained and may contain errors, with a link to report an error to OpenEI.

#### Scenario: Stale rates
- **WHEN** the newest URDB rate for the utility was last updated more than 24 months ago
- **THEN** a warning says the rates may be out of date and links to the utility's tariff page if URDB lists one
