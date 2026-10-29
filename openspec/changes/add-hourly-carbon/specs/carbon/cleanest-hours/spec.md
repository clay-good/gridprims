## Purpose

Tells people with flexible loads which hours have typically been cleanest and dirtiest in their region, so they can shift use without any live data feed.

## ADDED Requirements

### Requirement: Typical hourly intensity by month
For a chosen balancing authority, the tool SHALL show the median and interquartile range of consumption-based CO₂ intensity for each hour of day in each month, over the latest three complete years, by local prevailing clock hour (both instances of the repeated fall-back hour count toward their clock hour; the absent spring-forward hour adds nothing).

#### Scenario: Summer evenings
- **WHEN** a user opens July for a region whose evening hours are dirtiest
- **THEN** the chart highlights those hours and the sentence names the cleanest and dirtiest two-hour windows

### Requirement: Shift estimate
Given a flexible load (kWh per day) and its current and proposed hours, the tool SHALL estimate the difference in attributed annual emissions using the typical average intensities, labeled as an estimate from history using average-intensity (attributional) accounting, not a forecast and not the actual change in grid emissions, which depends on marginal generators.

#### Scenario: Move EV charging
- **WHEN** a user moves 200 kWh per day of charging from 6–10 pm to 11 am–3 pm
- **THEN** with typical intensities of 1,000 lb/MWh in the evening window and 700 lb/MWh midday, the tool shows 9.9 metric tons a year less attributed CO₂ (200 kWh × 0.300 lb/kWh × 365 = 21,900 lb), the method, and the attributional label

### Requirement: Verification
Median and quartile values SHALL match an independent computation over the same snapshot (a stored script output recorded with the fixture) within 0.1 lb/MWh for at least 3 regions, and hour-of-day medians SHALL be compared with Open Grid Emissions (CC BY 4.0) for the same regions and years, with differences above 10% documented.

#### Scenario: Independent medians
- **WHEN** CI compares July medians for a fixture region
- **THEN** every hour's median matches the stored independent value

### Requirement: Works without a file
This tool SHALL work from a region choice alone, so anyone can use it without meter data.

#### Scenario: Region only
- **WHEN** a visitor picks a region without loading a file
- **THEN** the chart and windows appear
