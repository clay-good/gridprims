## Purpose

Lets a customer see what a proposed rate change would have cost them on their own past year of use, line by line.

## ADDED Requirements

### Requirement: Current and proposed tariffs
The user SHALL be able to start the current tariff from URDB or the manual form, copy it as the proposed tariff, and edit any charge. The tool SHALL list every charge that differs between the two.

#### Scenario: Customer charge increase
- **WHEN** the proposed tariff raises the fixed charge from $12.00 to $20.00 per month
- **THEN** the difference list shows "Fixed charge: $12.00 → $20.00 per month"

### Requirement: Impact on the user's own load
The tool SHALL price the loaded intervals under both tariffs with the bill engine and SHALL show the annual and monthly difference in dollars and percent, broken down by fixed, energy, and demand charges.

#### Scenario: Annual impact
- **WHEN** a household's last year costs $1,640 under the current rate and $1,802 under the proposed rate
- **THEN** the tool shows +$162 per year (+9.9%) and the largest contributing charge

### Requirement: Verification
Both bills SHALL come from the verified bill engine; the difference SHALL be checked on at least 3 fixture loads against stored PySAM Utilityrate5 results for the same current and proposed tariffs within 0.5%.

#### Scenario: Difference verified
- **WHEN** CI runs the three stored cases
- **THEN** each annual difference is within 0.5% of the stored result

### Requirement: Without a meter file
When the user has no interval data, the tool SHALL accept 12 monthly kWh values from their bills and SHALL say which charges (demand, time-of-use) cannot be priced from monthly totals.

#### Scenario: Less than a year
- **WHEN** the user has 8 months of data
- **THEN** the impact covers those 8 months, is labeled "8 months", and is not annualized unless the user asks, in which case the method is shown

#### Scenario: Monthly totals only
- **WHEN** a user enters 12 monthly totals for a time-of-use proposal
- **THEN** the tool prices fixed and tiered charges and marks time-of-use charges "needs interval data"
