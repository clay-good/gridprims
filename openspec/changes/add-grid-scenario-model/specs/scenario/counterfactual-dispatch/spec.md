## Purpose

Dispatches a region's fleet against the hours that actually happened, on the device, fast enough that editing the fleet feels immediate.

## ADDED Requirements

### Requirement: Merit-order dispatch against recorded demand
For a chosen balancing authority and hour range, the tool SHALL take recorded hourly demand and recorded variable renewable output from our hourly snapshot, subtract the renewables to get residual demand, and meet it by dispatching the remaining fleet in ascending variable cost up to each unit's capacity, reporting generation by unit and by fuel for every hour.

#### Scenario: Residual met
- **WHEN** residual demand in an hour is 4,000 MW and the three cheapest available units offer 1,500, 2,000, and 1,200 MW
- **THEN** the first two run fully, the third runs at 500 MW, and the third is reported as marginal for that hour

#### Scenario: Demand exceeds the placed fleet
- **WHEN** residual demand exceeds the capacity the model could place in merit order for an hour
- **THEN** the tool reports an **unmet modeling residual** for that hour with its size, states that the real grid met that demand (through imports, demand response, or units we could not place) and that this is a gap in the model rather than a shortage on the grid, and SHALL NOT describe it as unserved energy or use it in any adequacy statement

### Requirement: What it does not model
Each run SHALL state that it omits unit commitment (start-up costs, minimum run times, ramp limits), reserves, transmission within the region, interchange with neighbours, storage arbitrage beyond a declared simple rule, outages, and market behavior.

#### Scenario: Omissions stated
- **WHEN** any dispatch result is shown or copied
- **THEN** the omissions list accompanies it

### Requirement: Interchange and storage handled explicitly
Interchange SHALL be taken from the recorded data as a fixed hourly quantity rather than optimized, and storage SHALL be excluded from dispatch in v1, its recorded net charge and discharge instead subtracted from and added to the hourly load it must serve, exactly as interchange is handled. The result SHALL state that storage is not optimized.

#### Scenario: Interchange fixed
- **WHEN** a region imported in an hour
- **THEN** the recorded net interchange is applied as given, and the result says it was not re-optimized

### Requirement: Messy hours handled explicitly
The dispatch SHALL work in hour-start coordinated universal time, matching the hourly snapshot's convention, and SHALL display in the region's local prevailing time with the zone named.

#### Scenario: Time basis stated
- **WHEN** a dispatch result is shown
- **THEN** hours are computed in hour-start coordinated universal time and displayed in the region's local prevailing time, with the zone named once

### Requirement: Hours the source did not report
The dispatch SHALL report and exclude, never silently fill: hours EIA-930 did not report, hours the publisher marked imputed, and hours in a leap day or a daylight-saving transition the source handles unusually.

#### Scenario: Missing and imputed hours
- **WHEN** 2% of hours in the chosen year are absent and another 3% are marked imputed by the publisher
- **THEN** both counts are reported, the absent hours are excluded from every total, and the imputed hours are included but flagged with their share

### Requirement: Fuel category changes inside a range
Where the source changed its fuel categories inside the chosen range, the tool SHALL say so and offer only the categories defined across the whole range.

#### Scenario: Fuel categories changed mid-range
- **WHEN** the publisher replaced its wind, solar, and hydro columns partway through the chosen range
- **THEN** the tool says so, names the date, and reports only categories defined consistently across the range

#### Scenario: Daylight-saving and leap day
- **WHEN** a range spans both daylight-saving transitions and a leap day
- **THEN** hour counts reconcile against the source's own hour count, and the receipt states the convention used

### Requirement: Interactive speed
A full year of hourly dispatch for one balancing authority SHALL complete in under one second on the reference profile, and a re-run after a fleet edit SHALL complete in under one second, with progress shown if it does not.

#### Scenario: Edit and re-run
- **WHEN** a user retires a unit on a full-year run
- **THEN** the new dispatch and its comparison appear in under one second on the reference profile

### Requirement: Everything on the device
Dispatch SHALL run entirely in the browser over shipped static data, with no request that depends on the scenario and no scenario state sent anywhere. Scenario state MAY be encoded in the URL fragment for sharing, and the share control SHALL state that the link carries the unit characteristics the user entered, so nobody shares commercially sensitive assumptions unknowingly.

#### Scenario: Share warning
- **WHEN** a user copies a share link for a scenario with entered unit costs
- **THEN** the control states that those entered values travel in the link

#### Scenario: No scenario leaves the tab
- **WHEN** the sentinel egress test runs a scenario with sentinel-named added units
- **THEN** no request contains any sentinel value

### Requirement: Verification against an independent implementation
The dispatch SHALL reproduce stored outputs from a third-party model (for example a PyPSA-USA or GridPath configuration), run once by a maintainer and committed as fixtures, for at least 3 region-years, matching generation by fuel within 0.5%. Marginal-unit agreement SHALL NOT be a gate, because no third-party model shares our inputs; instead the marginal-fuel distribution from each model SHALL be published side by side with the hours they disagree.

#### Scenario: Third-party comparison
- **WHEN** CI runs a stored third-party comparison for a region-year
- **THEN** every fuel total is within 0.5% or the case is documented as an expected difference, and the two marginal-fuel distributions are published with the share of hours they disagree

### Requirement: Expected differences recorded, and absences stated
Because no third-party model shares our exact inputs and simplifications, each fixture SHALL record which differences are expected and why. Where no third-party comparison can be configured, the backtest page SHALL state plainly that the region-year is unverified against any outside model, rather than presenting agreement with our own second implementation as independent.

#### Scenario: No outside comparison available
- **WHEN** no third-party model can be configured on our inputs for a region-year
- **THEN** the backtest page states that this region-year is unverified against any outside model, and the comparison against recorded history remains its only check

#### Scenario: Reference comparison
- **WHEN** CI runs the stored region-year comparisons
- **THEN** every fuel total is within 0.5% or the case is documented, and the marginal-fuel disagreement share is published rather than gated
