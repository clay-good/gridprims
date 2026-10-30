## Purpose

Answers "my bill went up, was that the weather?" by splitting a change into a weather part, a use part, and what the model cannot explain.

## ADDED Requirements

### Requirement: Split a change three ways
Given a baseline period and a comparison period, the tool SHALL report the total change in use, and in dollars when a tariff is selected, split into three parts that sum to it: the **weather part**, the **use part**, and the **baseline fit part**.

#### Scenario: Three parts named
- **WHEN** a split is shown
- **THEN** all three parts appear by name with the total they sum to

### Requirement: How each part is computed
The weather part SHALL be the baseline model's prediction on the comparison period's weather minus its prediction on the baseline period's weather. The use part SHALL be the comparison period's actual use minus the model's prediction for that period's weather. The baseline fit part SHALL be the model's prediction on the baseline weather minus the baseline period's actual use, and SHALL be reported rather than hidden, because it is the model's own miss on the period it was fitted to.

#### Scenario: Formulas shown
- **WHEN** a user opens "How we got this" on a split
- **THEN** each part's formula appears with the predicted and actual values that produced it

#### Scenario: Colder winter
- **WHEN** a home used 1,200 kWh more than the year before, the weather part is 900 kWh, the use part is 340 kWh, and the baseline fit part is −40 kWh
- **THEN** the three parts sum to the 1,200 kWh total, the result reads that about 900 kWh was the weather and about 340 kWh was something else, and the baseline fit part is shown as the model's own miss

#### Scenario: Parts always reconcile
- **WHEN** any split is displayed
- **THEN** the weather, use, and baseline fit parts sum to the total change to within rounding, and the panel shows that sum

### Requirement: Units on every part
Each part SHALL be shown in kWh to the nearest kWh, in dollars to the cent where a tariff is selected, and as a percent of the total change to 0.1.

#### Scenario: Parts carry units
- **WHEN** a split is displayed
- **THEN** each part shows kWh, its dollar value when a tariff is selected, and its share of the total change

#### Scenario: Weather explains none of it
- **WHEN** the weather part is near zero and the use part carries the whole change
- **THEN** the sentence says the weather was about the same and the change came from how much power was used

### Requirement: Weather-normalized annual use
The tool SHALL report weather-normalized annual use: the selected model evaluated against the published normal year, in kWh and, where a tariff is selected, in dollars, labeled as what a typical-weather year would have looked like. It SHALL show the comparison period's weather against the normal year in degree days so the user can see how unusual the year was.

#### Scenario: Warm year
- **WHEN** the comparison year had 18% fewer heating degree days than the normal year
- **THEN** the result states that and gives the normalized annual use beside the actual

### Requirement: Accuracy stated as a range
Every split and normalized figure SHALL be shown as a range from the model's error, SHALL state that a well-fitted meter supports roughly 10% to 20% accuracy on the annual normalized change, and SHALL NOT present a normalized change smaller than 5% as a finding. Published portfolio-wide accuracy from the literature SHALL NOT be quoted as the accuracy for one meter.

#### Scenario: Difference too small to call
- **WHEN** the normalized change is 3% and the model's band is ±12%
- **THEN** the result says the change is too small to distinguish from the model's own error

### Requirement: Non-weather causes offered, never diagnosed
When a use part is found, the tool SHALL offer a short checklist of ordinary causes to check (added equipment, a new appliance or vehicle, more people at home, longer hours, a failing thermostat or heating element, a pool pump, a change in rate or billing period) phrased as things to look at, and SHALL NOT state a cause.

#### Scenario: Checklist shown
- **WHEN** a 300 kWh use increase is reported
- **THEN** the checklist appears with the strongest-first ordering explained, and no sentence asserts what caused it

### Requirement: Works from bills alone
The tool SHALL run from 12 to 24 billing periods with their dates and kWh, applying the billing-period rules in `weather/baseline-model`, and SHALL say that interval data gives a tighter answer with a link to the user's get-your-data guide.

#### Scenario: Bills only
- **WHEN** a user enters 24 monthly totals
- **THEN** the split is computed on billing periods, labeled as such, with the interval-data link shown

### Requirement: Verification
The split SHALL be checked against hand-computed fixtures for at least 5 cases (heating-dominated, cooling-dominated, flat, retrofit-split, and bills-only) so that the weather, use, and baseline fit parts sum to the total change to within 0.01 kWh, and against stored reference-implementation outputs for the normalized annual figure within 2%.

#### Scenario: Parts sum to the whole
- **WHEN** CI runs the five fixtures
- **THEN** in every case the three parts sum to the total change within 0.01 kWh, and the normalized annual figure is within 2% of the stored reference
