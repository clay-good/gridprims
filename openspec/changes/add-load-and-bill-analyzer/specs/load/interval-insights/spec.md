## Purpose

Tells a facility, fleet, or campus what its own interval meter data says: when it peaks, how steady its load is, what runs after hours, and how trustworthy the file is.

## ADDED Requirements

### Requirement: Core load metrics
From a parsed interval series, the tool SHALL compute: total energy (kWh, matching the file total within 0.01%), peak demand (kW) with its timestamp for the whole file and each calendar month, average and minimum demand (kW), load factor (average ÷ peak, as a percent), and baseload (the 5th percentile of demand, labeled as such).

#### Scenario: kWh intervals converted to demand
- **WHEN** a file contains kWh per 15-minute interval
- **THEN** demand for each interval is kWh × 4, and the receipt says so

#### Scenario: Monthly peaks
- **WHEN** a full calendar year of 15-minute data is loaded
- **THEN** the tool lists 12 monthly peaks, each with date, local time, and kW

### Requirement: Demand window
Demand SHALL be computed on the file's interval length unless the user picks a 15, 30, or 60-minute demand window, in which case demand is the block or rolling average the user chooses. A window shorter than the file's interval SHALL be refused with an explanation.

#### Scenario: Hourly file, 15-minute window
- **WHEN** a user picks a 15-minute window on an hourly file
- **THEN** the tool refuses and says 15-minute demand cannot be recovered from hourly data

### Requirement: Load shape views
The tool SHALL show a load duration curve, a calendar heatmap (day × time of day), an average weekday vs. weekend profile, and a time-series chart that keeps every peak when downsampled.

#### Scenario: Peak survives downsampling
- **WHEN** a year of 15-minute data is drawn in a 600 px wide chart
- **THEN** the single highest interval is visible on the chart at its true value

### Requirement: Plain-language flags
The tool SHALL generate flags for: a needle peak, when a month's peak is more than 25% above that month's 95th percentile demand; after-hours load above 40% of energy (business hours user-set, default 7 am–7 pm weekdays); a recurring weekly spike, when an interval exceeds the month's 95th percentile at the same weekday and hour in 3 or more consecutive weeks; and step changes in baseload greater than 15% lasting at least 14 days. Each flag SHALL link to the evidence on the chart.

#### Scenario: Needle peak
- **WHEN** one month's peak interval is more than 25% above that month's 95th percentile demand
- **THEN** a flag says that one short spike set the month's peak and links to it

### Requirement: Data quality report
The tool SHALL report coverage (percent of expected intervals present), gaps, duplicates, zero runs longer than 4 hours, negative values, and DST handling, and SHALL state for each metric whether it was affected.

#### Scenario: Partial year
- **WHEN** a file covers 7 months
- **THEN** annual figures are labeled "7 months of data" and are not annualized unless the user asks, in which case the method is stated

### Requirement: Verification
Core metrics SHALL match values computed independently from the same fixture files (stored outputs from a spreadsheet or script recorded with the fixture) within 0.01% for energy and exactly for peak value and timestamp.

#### Scenario: Independent peak
- **WHEN** CI compares a fixture's monthly peaks with the stored independent results
- **THEN** every value and timestamp matches

### Requirement: Multiple meters
When a file contains several meters, the tool SHALL analyze each meter and an aggregate, and SHALL let the user choose which drives the other tools.

#### Scenario: Aggregate peak is not the sum of peaks
- **WHEN** two meters peak at different times
- **THEN** the aggregate peak is computed from summed intervals, and the tool shows the diversity benefit in kW; for example, meter A peaks at 100 kW at 2 pm while B is at 40 kW, and B peaks at 80 kW at 8 pm while A is at 30 kW, so the aggregate peak is 140 kW and the diversity benefit is 40 kW (180 − 140)
