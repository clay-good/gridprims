## Purpose

Shows the model's error against what actually happened before it is allowed to answer a what-if, so nobody reads a scenario without knowing how well the model fits reality.

## ADDED Requirements

### Requirement: The backtest runs first and is shown first
For the chosen region and hours, the tool SHALL dispatch the unmodified recorded fleet and display its generation by fuel against EIA-930's recorded actual generation by fuel, with the error by fuel and by hour, before any scenario control becomes available.

#### Scenario: Controls unlock after the comparison
- **WHEN** a visitor opens the scenario tool
- **THEN** the unmodified comparison and its error appear first, and the fleet-editing controls become available only after it has been displayed

#### Scenario: Error by fuel
- **WHEN** the backtest completes for a region-year
- **THEN** it reports, per fuel, the modeled and actual totals, the difference in energy and percent, and the distribution of hourly differences

### Requirement: Stated error metrics
The backtest SHALL report, per fuel and overall: mean absolute error and mean bias as a share of actual generation, and the share of hours in which the modeled marginal fuel matches the fuel that recorded data indicates was marginal, each with its definition shown.

#### Scenario: Metrics defined
- **WHEN** an error figure is shown
- **THEN** its definition and unit appear with it

### Requirement: The error travels with every scenario result
Every scenario result and every copied card SHALL carry the backtest error for the same region and hours, so a scenario difference can never be read without its model error.

#### Scenario: Copied scenario
- **WHEN** a user copies a retirement scenario result
- **THEN** the text includes the scenario difference, the backtest error for those hours, and the omissions list

### Requirement: A poor fit limits what is offered
The tool SHALL compare each scenario difference against the backtest's error in the same quantity and over the same hours: a scenario's change in a fuel's total generation over the period SHALL be compared with the backtest's mean bias for that fuel over the same period, expressed as the same percent of actual generation. Where the scenario change is smaller than that mean bias, the tool SHALL report it as smaller than the model's own error and SHALL NOT present it as a finding.

#### Scenario: Change smaller than the model's bias
- **WHEN** the backtest's mean bias on gas generation over the period is 8% of actual gas generation and a scenario changes modeled gas generation by 3% of actual
- **THEN** the tool reports that the change is smaller than the model's own bias for that fuel and does not present it as a finding

#### Scenario: Change larger than the bias
- **WHEN** the same backtest bias is 8% and a scenario changes gas generation by 19% of actual
- **THEN** the change is presented, with the 8% bias shown beside it

### Requirement: Published per region and year
The backtest results SHALL be published for every region and year we ship, as a page and as data, so the model's fit is a public fact rather than something each visitor discovers alone.

#### Scenario: Fit table published
- **WHEN** a researcher opens the backtest page
- **THEN** it lists every region and year with its error metrics and the data versions used

### Requirement: Attribution of error is not claimed
The backtest SHALL report the error without asserting its cause, and SHALL list the known candidate causes with the share of capacity or hours each affects: derived rather than measured heat rates, substituted fuel prices, omitted commitment, fixed interchange, unplaceable capacity, and error in the reference data itself.

#### Scenario: Reference data error stated
- **WHEN** a backtest is shown for a region and year
- **THEN** it states the reference data's own known limits for those hours (hours missing, hours imputed by the publisher, and any fuel-category definition change in the period) beside the model's error, so the residual is not read as entirely ours

#### Scenario: Causes listed, not chosen
- **WHEN** an error is reported
- **THEN** the candidate causes are listed with their affected shares, and no sentence asserts which one dominates
