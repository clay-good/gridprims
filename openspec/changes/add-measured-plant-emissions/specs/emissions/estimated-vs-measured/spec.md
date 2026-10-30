## Purpose

Publishes how far the estimated hourly carbon intensity our tools use sits from what the monitored plants actually measured, so users can judge our own numbers.

## ADDED Requirements

### Requirement: The comparison is like for like
For each region and year, the tool SHALL compare the carbon dioxide reported by monitored units with the carbon dioxide the hourly estimate attributes to those same units' fuels over the same hours, and SHALL state the monitored share of the region's generation. It SHALL NOT compare monitored emissions with a region's whole estimated emissions.

#### Scenario: Scoped comparison
- **WHEN** a region's comparison is shown
- **THEN** it names the monitored share, compares only the monitored units' fuels and hours, and says what is excluded

### Requirement: Published difference per region and year
The result SHALL report, per region and year, the difference as a percent and in metric tons, the direction of the difference, and the distribution across hours (for example by month and by hour of day), so a user can see when the estimate runs high or low.

#### Scenario: Summer evenings
- **WHEN** the estimate runs low in summer evening hours for a region
- **THEN** the result shows the difference by hour of day and names those hours

### Requirement: Low coverage is uninformative, not a small error
Where monitored units account for less than 40% of a region's generation in the year, the comparison SHALL be reported as uninformative for that region, with the share shown, rather than as a small percentage difference. The 40% floor SHALL be named as gridprims' own choice.

#### Scenario: Mostly unmonitored region
- **WHEN** monitored units account for 11% of a region's generation
- **THEN** the result says the comparison cannot characterize that region's estimate and gives the share

### Requirement: Linked from every hourly carbon result
Every result in `carbon/hourly-emissions` SHALL link to this comparison for the user's own region and year, next to the method caveat, so the caveat carries a number rather than only a warning.

#### Scenario: Caveat carries a number
- **WHEN** a user reads the method caveat on an hourly emissions result
- **THEN** it links to the published difference for their region and year, or says the comparison is uninformative there

### Requirement: Method published and reproducible
The comparison's method SHALL be published with its matching rules (how units are mapped to the region and to fuels, how hours are aligned, what is excluded), and the inputs SHALL be downloadable so anyone can reproduce the figure.

#### Scenario: Reproduce the figure
- **WHEN** a researcher downloads the comparison inputs for a region and year
- **THEN** recomputing by the published method reproduces the published difference within 0.1 percentage point

### Requirement: Verification
The comparison SHALL be checked against an independent recomputation by a maintainer for at least 3 regions and 2 years, stored as fixtures, matching within 0.5 percentage points, and the unit-to-region and unit-to-fuel mappings SHALL have no row matched by name alone.

#### Scenario: Independent recomputation
- **WHEN** CI runs the stored region-year cases
- **THEN** every published difference is within 0.5 percentage points of the stored independent value
