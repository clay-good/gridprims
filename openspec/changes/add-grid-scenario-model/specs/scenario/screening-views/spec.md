## Purpose

Turns the dispatch into the four questions people actually ask: what if this closes, what if we build this, what sets the price and the emissions at the margin, and when does renewable output exceed what the grid can take.

## ADDED Requirements

### Requirement: Retirement and addition screening
Given one or more units retired or added, the tool SHALL report the change in generation by fuel, in carbon dioxide using the emission rates already shipped, in the marginal unit mix, and in the count of hours with an unmet modeling residual, each as a difference from the unmodified run with the backtest error shown.

#### Scenario: Coal unit retired
- **WHEN** a 600 MW coal unit is retired for a full year
- **THEN** the result shows which fuels replaced its generation, the change in carbon dioxide in metric tons, the change in marginal hours by fuel, and any increase in hours with an unmet modeling residual, with the model error beside each

#### Scenario: Residual is not an adequacy claim
- **WHEN** a retirement increases the hours with an unmet modeling residual
- **THEN** the result states that this measures what the model could not place, not whether the grid would have had enough capacity, and links the limits page entry refusing adequacy figures

#### Scenario: Addition that changes little
- **WHEN** an added unit's cost places it above every hour's marginal cost
- **THEN** the result says it would not have run in the modeled hours and explains why

### Requirement: Marginal-unit explorer
For any hour in the modeled range, the tool SHALL show which unit is marginal, its implied marginal cost in dollars per MWh, and its implied marginal emission rate, and SHALL let the user see the distribution of marginal fuel by hour of day and month.

#### Scenario: Marginal hour
- **WHEN** a user opens a summer evening hour
- **THEN** the marginal unit, its cost, its emission rate, and its fuel are shown with the inputs that placed it there

#### Scenario: Compared with published marginal rates
- **WHEN** marginal emission rates are shown
- **THEN** the page explains that published projections of marginal rates exist and are not editable, links them, and states that these are ours and auditable

### Requirement: Net-load and curtailment screening
The tool SHALL let a user scale a region's recorded wind and solar output and show the resulting net load, the hours it falls below a user-entered minimum generation floor, and the energy above that floor, labeled as a screening estimate that ignores transmission and commitment.

#### Scenario: Doubled solar
- **WHEN** recorded solar output is doubled
- **THEN** the tool shows the new net-load shape, the hours below the entered floor, and the energy that would need to be curtailed, exported, or stored

### Requirement: Outage sensitivity is the user's assumption only
Where a user enters forced-outage rates, the tool MAY show the sensitivity of available capacity to those rates, labeled entirely as the user's assumption, and SHALL NOT produce a loss-of-load, unserved-energy, or adequacy figure, stating that the data required is not publicly available.

#### Scenario: Reliability number refused
- **WHEN** a user asks for a loss-of-load expectation
- **THEN** the tool declines, explains that forced-outage data is confidential and the only open class averages are long out of date, and links the limits page

### Requirement: Every view is labeled and bounded
Each view SHALL carry the screening label, the omissions list, the backtest error, the share of capacity on derived heat rates and substituted fuel prices, and a link to the national models that do this properly.

#### Scenario: Label and links present
- **WHEN** any screening view is shown or copied
- **THEN** all five accompany it

### Requirement: Verification
Each view SHALL reproduce hand-computed fixtures for at least 2 cases, and the retirement view SHALL be checked against an independent implementation's result for the same edit on at least 2 region-years, with the difference reported rather than hidden.

#### Scenario: Retirement cross-check
- **WHEN** CI runs the stored retirement comparisons
- **THEN** the replacement generation by fuel is within 1% of the independent result, or the difference is documented with its cause
