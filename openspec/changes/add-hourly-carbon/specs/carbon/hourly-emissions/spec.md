## Purpose

Computes the electricity emissions of a user's own load hour by hour from public-domain grid data, so organizations can see what annual averages hide.

## ADDED Requirements

### Requirement: Region assignment
The tool SHALL assign the load to a balancing authority from the user's utility (EIA-861 balancing authority field) or let the user pick one, and SHALL show the assignment and its source. When a utility serves more than one balancing authority, the user SHALL choose.

#### Scenario: Utility in two regions
- **WHEN** a user's utility reports load in two balancing authorities
- **THEN** the tool lists both and asks the user to pick before computing

### Requirement: Hourly emissions
For each hour of the load, the tool SHALL multiply the hour's energy (kWh, summed from sub-hourly intervals) by that balancing authority's consumption-based CO₂ intensity for the same UTC hour, and SHALL report hourly, monthly, and total emissions in pounds and metric tons. Hours missing intensity data SHALL be counted and excluded, never filled silently.

#### Scenario: Hour alignment
- **WHEN** a 15-minute file in Central time is analyzed
- **THEN** four intervals are summed into each clock hour and matched to the EIA hour with the same UTC start, and the receipt says so

#### Scenario: EIA hour-ending labels
- **WHEN** EIA labels an hour by its UTC end time (for example 2025-07-01T18:00Z for the hour starting 17:00Z)
- **THEN** the snapshot stores it as the hour starting 17:00Z, and a fixture pins this conversion so an off-by-one shift fails CI

#### Scenario: Missing intensity
- **WHEN** EIA intensity is missing for 30 hours of the data period
- **THEN** the result says "30 hours excluded (no EIA data)" and shows the share of energy excluded

### Requirement: Annual-average comparison in two steps
The tool SHALL show three CO₂ (not CO₂e) results side by side: the hourly result; the same load times the flat annual average of the same EIA series for the same balancing authority and year (isolating the effect of timing); and the load times the eGRID total output CO₂ rate for the user's eGRID subregion. It SHALL name the eGRID edition; an unofficial edition SHALL be labeled "unofficial, third-party build".

#### Scenario: Peaky evening load
- **WHEN** a load concentrated in evening hours yields more hourly-based emissions than the eGRID estimate
- **THEN** the timing line states the percent difference and the hours that drive it, and the eGRID line is labeled as a different region, basis, and year

### Requirement: Differences attributed honestly
The tool SHALL attribute only the difference between the hourly result and the flat-average result to when the load used power, and SHALL label the difference from eGRID as differences in region, basis (production versus consumption), and data year.

#### Scenario: Labels on the two gaps
- **WHEN** the three results are shown
- **THEN** the first gap is labeled "timing" and the second "region, basis, and year"

### Requirement: Regions without hourly data
EIA-930's published regions cover the lower 48 states; the exclusion of Alaska and Hawaii is our inference from the published region list and is carried in the limits page's unverified-claim register until EIA's own coverage statement is cited. For Alaska, Hawaii, and any balancing authority with no hourly data for the period, the tool SHALL say hourly data is not available and SHALL show the eGRID annual result only.

#### Scenario: Hawaii user
- **WHEN** a user's utility is in Hawaii
- **THEN** the tool shows the eGRID annual result with a note that EIA publishes no hourly data for Hawaii

### Requirement: Partial hours
An hour whose meter intervals are not all present SHALL be computed on the intervals present and flagged partial; the result SHALL report the count of partial hours.

#### Scenario: Three of four intervals
- **WHEN** an hour of 15-minute data has 3 of 4 intervals
- **THEN** that hour's emissions use the 3 intervals and the result reports 1 partial hour

### Requirement: Why this factor
Every result SHALL say, in one line, why its factor was chosen, using the GHG Protocol consultation draft's ranking (area, then time interval, then consumption-based), and SHALL label that ranking as from a draft that is not final.

#### Scenario: Factor explanation
- **WHEN** a result uses MISO's hourly consumption-based intensity
- **THEN** the line reads that it is the most detailed public hourly, consumption-based factor available for the user's balancing authority, per the draft ranking

### Requirement: Method caveat on every result
Every result SHALL state that EIA's hourly values come from hourly generation by fuel multiplied by annual average emission factors, so hourly variation reflects fuel mix only, and that combined heat and power, unmetered units, and interchange errors can distort them.

#### Scenario: Caveat in copied card
- **WHEN** a user copies the hourly emissions result card
- **THEN** the caveat sentence is included

### Requirement: Cross-check against an independent dataset
For a test set of at least 5 balancing authorities and one full year, our hourly intensity values SHALL match EIA's published values within 0.01 lb/MWh after unit conversion, and annual emissions for a flat 1 MW load SHALL be within 10% of the same computation using Singularity's Open Grid Emissions consumption-based data, with larger gaps documented.

#### Scenario: Cross-check report
- **WHEN** CI runs the cross-check from stored fixtures
- **THEN** it reports the percent difference per region and fails on an undocumented gap above 10%
