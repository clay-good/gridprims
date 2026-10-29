## Purpose

Shows what a large customer must pay under a minimum-bill tariff if its load arrives late, smaller than contracted, or leaves early, year by year.

## ADDED Requirements

### Requirement: Minimum bill by year
Given contract demand (MW), a capacity ramp schedule (MW by year), the minimum formula for each component, component demand rates ($/kW-month), and expected actual billing demand by year, the calculator SHALL compute for each contract year the billed demand per component (the greater of actual and the minimum percentage of contract demand), the minimum bill, and the payment for unused capacity, in dollars.

#### Scenario: Slow ramp
- **WHEN** contract demand is 100 MW, the generation minimum is 60%, and actual demand in year 2 is 40 MW
- **THEN** year 2 generation billing demand is 60 MW, and at $10/kW-month the unused-capacity payment is $2,400,000 (20,000 kW × $10 × 12)

### Requirement: Tiered minimum formulas
The calculator SHALL support minimums defined as tiered piecewise formulas with a cap and a percent-of-prior-peak ratchet, applied to the contract capacity in force each year under the ramp.

#### Scenario: AEP Ohio tier, 100 MW
- **WHEN** contract capacity is 100 MW under the formula 57,500 kW plus 100% above 75 MW, capped at 85% of contract
- **THEN** the minimum demand is 82,500 kW (below the 85,000 kW cap)

#### Scenario: AEP Ohio tier hits the cap
- **WHEN** contract capacity is 200 MW under the same formula
- **THEN** the formula gives 182,500 kW and the minimum is the 170,000 kW cap

#### Scenario: Prior-peak ratchet wins
- **WHEN** the formula minimum is 82,500 kW and the highest billing demand in the past 11 months was 100,000 kW
- **THEN** the minimum is 85,000 kW (85% of 100,000 kW)

### Requirement: Exit-fee exposure
When the tariff defines an exit fee, the calculator SHALL compute the fee if the customer leaves at the end of each year, using the tariff's formula, and SHALL show the formula with its citation.

#### Scenario: Leave in year 5 of 14
- **WHEN** the exit fee is the minimum bill for the remaining term
- **THEN** the exposure at year 5 equals the sum of minimum bills for years 6 through 14

### Requirement: Verification
Where an order or tariff filing includes a worked minimum-bill or exit-fee example, the calculator SHALL reproduce it exactly (to the cent) as a stored fixture. Because none was found as of 2026-10-29 (`docs/research/06`), every seeded tariff SHALL also have at least one fixture computed by hand from the tariff text by a second person, recorded with name and date, and regulator staff exhibits SHALL be added when found.

#### Scenario: Filing example reproduced
- **WHEN** CI runs a stored example taken from a utility filing
- **THEN** the minimum bill matches the filing's figure

### Requirement: Prefill from the terms table
Choosing a tariff from `large-load/tariff-terms` SHALL prefill threshold, percentages, term, and ramp, with any "Not public" field left for the user to enter.

#### Scenario: Prefilled with gaps
- **WHEN** a user picks a tariff whose rates are public but ramp is not
- **THEN** rates are prefilled and the ramp field asks for input

### Requirement: Screening label
Results SHALL state that actual obligations depend on the signed contract and the regulator's current order.

#### Scenario: Label shown
- **WHEN** any year's minimum bill is displayed
- **THEN** the label appears in the same card
