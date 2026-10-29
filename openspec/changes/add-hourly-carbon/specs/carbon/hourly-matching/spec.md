## Purpose

Shows how much of a load clean supply really covers hour by hour versus over a year, so buyers and planners understand the gap hourly accounting will expose.

## ADDED Requirements

### Requirement: Supply profiles
The user SHALL be able to add one or more clean supply profiles: an hourly PVWatts export, any hourly CSV of MWh or kWh, or a flat block (MW, hours). Each profile SHALL show its annual energy and its own receipt.

#### Scenario: Supply profile alignment
- **WHEN** a supply CSV is in MWh, local standard time, covers 8,760 hours of a different year, and the load covers 2024
- **THEN** values convert to kWh, map by month, day, and hour onto 2024 (February 28 repeated for February 29), shift to prevailing time, and the receipt lists each step

#### Scenario: Flat block
- **WHEN** a user adds a 2 MW flat block for all hours
- **THEN** the profile supplies 2 MWh in every hour of the data period

### Requirement: Hourly and annual matched shares
The tool SHALL compute the annual matched share (total clean energy ÷ total load, capped at 100%) and the hourly matched share (sum over hours of the lesser of load and clean supply, ÷ total load), and SHALL show both side by side with the surplus and shortfall energy.

#### Scenario: Solar covers 100% annually
- **WHEN** solar output over the year equals the load's annual energy
- **THEN** the annual matched share is 100% and the hourly matched share is lower, with the shortfall shown by hour of day

#### Scenario: Numbers
- **WHEN** load is 10 kWh in each of 24 hours and solar is 20 kWh in 12 of them and 0 in the other 12
- **THEN** the annual matched share is 100% (240 ÷ 240) and the hourly matched share is 50% (120 ÷ 240)

### Requirement: Grid share in unmatched hours
The tool SHALL estimate the carbon-free share of grid power in unmatched hours from EIA-930 net generation by fuel for the user's balancing authority, counting nuclear, hydro (excluding pumped storage where EIA reports it separately), wind, and solar as carbon-free (fuel rules in the next requirement), and SHALL show a combined score (matched share plus the grid's carbon-free share of the remainder) with the formula visible.

#### Scenario: Clean share hand check
- **WHEN** CI runs a 24-hour fixture with stated generation by fuel
- **THEN** the grid clean share equals the hand-computed value to 0.01 percentage points

#### Scenario: Formula shown
- **WHEN** the combined score is displayed
- **THEN** "How we got this" shows matched hours, unmatched energy, and the grid's clean share in those hours

### Requirement: Fuel rules for the clean share
Battery discharge SHALL be excluded (stored energy, not generation), and EIA's "Other" category, which mixes geothermal, oil, and biomass, SHALL count as not carbon-free, with a note that this understates regions with geothermal.

#### Scenario: CAISO note
- **WHEN** the region is CAISO
- **THEN** the result notes that geothermal sits in "Other" and is not counted

### Requirement: Clean share is labeled production-based
The grid's carbon-free share SHALL be labeled production-based (generation inside the region, ignoring imports), unlike the consumption-based emissions intensity, wherever it is shown or copied.

#### Scenario: Label on the combined score
- **WHEN** the combined score is copied
- **THEN** the copied text includes "grid clean share is production-based"

### Requirement: Verification
Matched shares SHALL be checked against hand-computed results for at least 3 fixture pairs of load and supply (including surplus-only and shortfall-only hours) to within 0.01 percentage points.

#### Scenario: Hand-computed case
- **WHEN** CI runs a 24-hour fixture with known hourly load and solar
- **THEN** the hourly and annual matched shares equal the stored hand-computed values

### Requirement: Draft-method label
Every matching result SHALL say it previews hourly matching as described in the GHG Protocol's 2025–2026 Scope 2 consultation, that the method is not final, and that it does not account for deliverability, certificates, or contract terms.

#### Scenario: Label present
- **WHEN** any matching score is shown or copied
- **THEN** the draft-method label is included
