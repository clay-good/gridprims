## Purpose

Gives quick, transparent battery sizing and cost-of-energy math with every assumption visible.

## ADDED Requirements

### Requirement: Battery basics
Given rated power (MW) and energy (MWh), the tool SHALL compute duration at rated power (h), C-rate (power ÷ energy), duration at a chosen dispatch power, and usable delivered energy after a stated depth of discharge, with the charging energy that delivery requires computed from round-trip efficiency. One convention holds site-wide: depth of discharge limits delivered energy, and round-trip efficiency is a loss on charging, matching `load/storage-and-solar-screen`.

#### Scenario: Partial-power dispatch
- **WHEN** a 100 MW / 400 MWh battery dispatches at 75 MW
- **THEN** duration is 5.33 h (to 0.01 h) and C-rate at that power is 0.1875

#### Scenario: Usable energy
- **WHEN** a 400 MWh battery has a 90% depth of discharge and 85% round-trip efficiency
- **THEN** usable delivered energy is 360 MWh (400 × 0.90) and the charging energy required is 423.5 MWh (360 ÷ 0.85)

### Requirement: Levelized cost of energy
The tool SHALL compute LCOE in $/MWh as (fixed charge rate × capital cost in $/kW + fixed O&M in $/kW-year) ÷ (capacity factor × 8.76 MWh per kW-year) + variable O&M + fuel cost in $/MWh, following the NLR ATB equations, with every input user-editable and defaults only from reusable sources, each cited with its year. Results SHALL match the ATB's published LCOE for the same inputs within 1%.

#### Scenario: LCOE numbers
- **WHEN** fixed charge rate is 0.07, capital cost $1,000/kW, fixed O&M $20/kW-year, capacity factor 25%, and no variable or fuel cost
- **THEN** LCOE is $41.10/MWh (90 ÷ 2.19)

#### Scenario: Inputs visible
- **WHEN** a user changes the fixed charge rate
- **THEN** LCOE updates and "How we got this" shows each term's contribution in $/MWh

#### Scenario: No licensed defaults
- **WHEN** no reusable default exists for a technology
- **THEN** the fields start empty with a link to the public source the user can read

### Requirement: The Annual Technology Baseline is a registered dataset
The NLR Annual Technology Baseline SHALL be a registered dataset owned by this change, with NLR as publisher, CC BY 4.0 as its license, the ATB edition year as its as-of date, and a refresh when a new edition publishes.

#### Scenario: One owner for ATB defaults
- **WHEN** `load/storage-and-solar-screen` needs a round-trip efficiency default
- **THEN** it reads the registered ATB dataset rather than citing the ATB on its own, so one edition date governs both tools

