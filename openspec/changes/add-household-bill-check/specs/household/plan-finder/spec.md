## Purpose

Shows a household which of its utility's plans would have cost the least for how it actually used power, exactly from a meter file or as a labeled estimate from bill totals.

## ADDED Requirements

### Requirement: Price every residential plan
Given a utility, the tool SHALL price every active residential tariff in the URDB snapshot for that utility on the user's last 12 months, rank them by annual cost, and show the difference from the current plan in dollars and percent. Each plan SHALL show its URDB id, last-updated date, and source link.

#### Scenario: Cheaper plan found
- **WHEN** the current plan costs $1,640 a year and a time-of-use plan costs $1,512 on the same use
- **THEN** the tool says the TOU plan would have cost $128 less (7.8%) on the last 12 months

### Requirement: Exact with a file, estimated from totals
With interval data, or with kWh by TOU period from the bill, time-of-use plans SHALL be priced exactly by the bill engine. From totals only, TOU energy SHALL be split across periods with the typical residential hourly shape for the user's county, aligned to the weekdays of the billing year, and every such result SHALL carry the work-zone label "Estimate from a typical home's hourly pattern" and a link to get the meter file.

#### Scenario: Shape provenance
- **WHEN** a totals-based estimate is shown
- **THEN** its source stamp names NLR End-Use Load Profiles (ResStock), the pinned release, CC BY 4.0, and the release date as the as-of date

#### Scenario: Totals only
- **WHEN** a household with only bill totals compares a flat plan and a TOU plan
- **THEN** the flat plan is priced exactly and the TOU plan is shown as an estimate with the label and the get-your-data link

### Requirement: Plan conditions shown, not hidden
Plans with eligibility conditions (an electric vehicle, a heat pump, or solar) SHALL be listed under "Requires" with the condition from the tariff text, and SHALL be ranked among the others only when the user checks that the condition applies.

#### Scenario: EV plan
- **WHEN** the user has not checked "I have an EV"
- **THEN** the EV plan appears under "Requires an EV" with its cost on the user's use, outside the main ranking

### Requirement: Discount programs apply to every plan
Discount and allowance programs (for example CARE, FERA, and medical baseline) SHALL be inputs the user ticks, applied to every plan they cover as the program's percent discount or added baseline kWh from the tariff text, and SHALL NOT be listed as plans.

#### Scenario: CARE customer
- **WHEN** a user on CARE compares plans and CARE gives a 30% discount on covered charges
- **THEN** every plan's cost reflects the discount and the ranking uses discounted costs

### Requirement: California CCA customers
In community choice aggregation areas, the tool SHALL price the utility's delivery charges plus the CCA generation rate and the utility's exit fee (PCIA, by vintage), both entered by the user from the bill, and SHALL flag ZIP codes the registry marks as CCA-served.

#### Scenario: CCA home
- **WHEN** a PG&E customer served by a CCA enters the CCA generation rate and PCIA
- **THEN** each TOU plan is priced as delivery plus CCA generation plus PCIA, and the bundled PG&E price is not shown as their price

### Requirement: Retail choice supply plus delivery
In retail-choice areas, the tool SHALL price delivery from the utility's delivery tariff and supply from a plan the user enters. In Texas, the user SHALL be able to enter an Electricity Facts Label's energy charge (cents per kWh), base charge ($ per month), and usage credits; TDU delivery charges SHALL come from each TDU's PUCT-approved tariff (public record), versioned by effective date, using the version in force for each billing period.

#### Scenario: Texas plan
- **WHEN** a plan has a 9.5 cent energy charge and a $9.95 base charge, delivery is $4.39 per month plus 5.4 cents per kWh, and use is 1,000 kWh
- **THEN** the month costs $163.34 ($95.00 + $9.95 + $4.39 + $54.00), each line shown

### Requirement: No retail provider listings
The tool SHALL link to Power to Choose and state shopping sites, and SHALL NOT list, rank, or refer to retail providers.

#### Scenario: Texas results
- **WHEN** a Texas plan comparison is shown
- **THEN** the only provider-related element is a link to Power to Choose

### Requirement: Past use, not a promise
Every ranking SHALL state that it is based on the user's past 12 months and that savings depend on future use and the plan's enrollment terms, and SHALL show any minimum stay or bill-protection terms only when the tariff text states them.

#### Scenario: Label present
- **WHEN** a ranking is shown or copied
- **THEN** the past-use label is included

### Requirement: No plans on file
When URDB has no active residential tariff for the utility, the tool SHALL say so, link the utility's tariff page, and offer the manual tariff form.

#### Scenario: Small co-op
- **WHEN** a co-op has no residential tariff in URDB
- **THEN** the plan finder shows the empty state with the tariff link and manual form

### Requirement: Shift what-if
The user SHALL be able to move a daily amount of use (kWh per day) from one time window to another, for example EV charging from 6–9 pm to 11 pm–5 am, and see every plan's cost update.

#### Scenario: Move EV charging
- **WHEN** a user moves 10 kWh per day from 6–9 pm to midnight–5 am
- **THEN** each TOU plan's annual cost updates to the stored hand-computed fixture value within $0.01, and the ranking is re-sorted

#### Scenario: Average-accounting label on emissions
- **WHEN** the shift what-if also shows an emissions change
- **THEN** it is labeled as attributional (average-intensity) accounting, not the actual change in grid emissions

### Requirement: Verification
Annual costs SHALL equal the bill engine's verified monthly sums, and for at least 3 residential fixtures (including one default TOU plan) the ranking SHALL match stored PySAM Utilityrate5 results within 0.5%. The totals-based TOU estimate SHALL be checked on at least 3 fixtures that have both interval data and totals, with the estimate's error reported on the methods page.

#### Scenario: Estimate error published
- **WHEN** CI compares totals-based TOU estimates with exact interval results on the fixtures
- **THEN** the methods page shows each fixture's percent error with the test date
