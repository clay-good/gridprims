## Purpose

Finds the honest relationship between the weather and a customer's own electricity use, and refuses to claim one when the data does not support it.

## ADDED Requirements

### Requirement: Four candidate models
The tool SHALL fit use per day against heating and cooling degree days as four candidates: flat (no weather term), heating-only, cooling-only, and heating-plus-cooling, each by ordinary least squares on use per day.

#### Scenario: Gas-heated home
- **WHEN** a home's winter use is flat and its summer use rises with temperature
- **THEN** the cooling-only candidate is selected and the result says heating does not show in the electricity use

### Requirement: Balance-point search and rejection
Candidates SHALL be fitted across balance points from 30 °F to 90 °F at no more than 3 °F spacing. A candidate whose heating or cooling coefficient is negative SHALL be rejected. Among the surviving candidates the tool SHALL select the highest adjusted coefficient of determination, and SHALL report the selected model, its balance points, its coefficients with units, and the candidates it rejected and why.

#### Scenario: Negative coefficient rejected
- **WHEN** a cooling-only candidate fits a negative cooling coefficient
- **THEN** it is rejected as physically implausible and named in the rejected list

#### Scenario: Selection shown
- **WHEN** a model is selected
- **THEN** "How we got this" lists each candidate, its balance points, its adjusted coefficient of determination, and the reason the winner won

### Requirement: Flat is a real answer
When the flat candidate wins, the tool SHALL state that the use is not weather-driven over this period and SHALL NOT report a weather-normalized change, offering the non-weather comparison instead.

#### Scenario: Not weather-driven
- **WHEN** the flat model wins for an apartment with electric cooking only
- **THEN** the result reads that weather does not explain this use, and no weather split is shown

### Requirement: Data sufficiency rules
A baseline SHALL require 365 days of use data with at most 10% of days missing and at least 90% daily coverage; a baseline from bill totals SHALL require at least 11 billing periods. Billing periods longer than 35 days (or 70 days where the utility bills every two months) SHALL be dropped. Each rule SHALL be shown as a plain sentence with the value it tested.

#### Scenario: Short baseline
- **WHEN** only 280 days of use data are present
- **THEN** no model is fitted and the message says a year is needed, naming the days found

### Requirement: Enough weather variation to measure
A weather relationship SHALL NOT be claimed unless the period has at least 10 days with non-zero degree days and at least 20 degree days in the year.

#### Scenario: Mild climate
- **WHEN** a location has 14 heating degree days in the year
- **THEN** the tool says there is too little weather variation to measure a relationship

### Requirement: Fit quality reported and enforced
The tool SHALL report the coefficient of variation of the root mean squared error and the normalized mean bias error for the selected model, in plain words as well as numbers. No minimum coefficient of determination SHALL be imposed, matching the open method documentation.

#### Scenario: Fit reported in words
- **WHEN** a model is selected
- **THEN** its coefficient of variation of the root mean squared error and its normalized mean bias error appear as numbers and as a plain sentence saying how closely it tracks the meter

### Requirement: Disqualification thresholds
A model whose coefficient of variation of the root mean squared error exceeds 1.0 SHALL be disqualified unless the published alternative criterion, a predicted-to-actual normalized root mean squared error below 1.6, passes. A disqualified model SHALL produce no weather split.

#### Scenario: Poor fit
- **WHEN** the selected model's coefficient of variation of the root mean squared error is 1.4 and its predicted-to-actual normalized root mean squared error is 1.9
- **THEN** both thresholds fail, the tool reports that the use is too irregular to separate weather from other causes, and shows no split

### Requirement: Retrofits and solar split or stop the baseline
When the series has an export channel, or the user states that solar, a heat pump, an electric vehicle, or an occupancy change began on a date inside the period, the tool SHALL fit separate baselines before and after that date, and SHALL refuse to fit a single baseline across it. If either side fails the sufficiency rules, it SHALL say which.

#### Scenario: Heat pump mid-year
- **WHEN** a user reports a heat pump installed in October of a 24-month period
- **THEN** the tool fits before and after baselines, reports both, and never spans the date with one model

### Requirement: Method cited to open sources
The method page SHALL cite the open method documentation and reference implementations it follows, with their licenses and versions, and SHALL state that paywalled standards were not read and conformance to them is not claimed.

#### Scenario: Citation honesty
- **WHEN** a user opens the method page
- **THEN** it names the open method documentation and implementation versions, and says no conformance to a paywalled standard is claimed

### Requirement: Verification
The model SHALL reproduce stored reference outputs from an openly licensed reference implementation, run once by a maintainer and committed as fixtures, for at least 10 meters spanning heating-dominated, cooling-dominated, mixed, and flat cases: selected model form and balance points exactly, and fitted coefficients within 1%.

#### Scenario: Reference comparison
- **WHEN** CI runs the 10-meter comparison
- **THEN** every selected model form and balance point matches, and every coefficient is within 1% or the case is documented as a known difference
