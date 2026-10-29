## Purpose

Tells a household whether its electricity use is high, typical, or low for its own utility and state, using only published averages and saying so.

## ADDED Requirements

### Requirement: Compare with average homes
The tool SHALL compare the user's annual kWh (summed from 12 periods, or annualized from fewer by days covered with the method shown) with the utility's average residential use per customer (residential sales ÷ residential customers, EIA-861) and the state average, as a percent difference, with the data year.

#### Scenario: Above utility average
- **WHEN** a home used 14,400 kWh in a year and its utility's average is 12,000 kWh
- **THEN** the tool says the home used 20% more than the utility's average home, with "EIA-861, 2025"

#### Scenario: Partial year
- **WHEN** the user entered 7 months covering 213 days
- **THEN** the annual figure is labeled "estimated from 213 days" and the method is shown

### Requirement: Averages only
The tool SHALL NOT show percentiles, rankings, or "homes like yours" comparisons, because EIA-861 publishes no distribution, and SHALL say that averages include homes of every size and heating type.

#### Scenario: No percentile
- **WHEN** a result is shown
- **THEN** no percentile or rank appears, and the averages note is present

### Requirement: Seasonal pattern as a checklist
The tool SHALL show the highest and lowest periods by kWh per day and their ratio, and when the ratio exceeds 1.5 SHALL show a short checklist of common causes (electric heating, air conditioning, pool pumps, EV charging) phrased as things to check, not a diagnosis.

#### Scenario: Winter-heavy pattern
- **WHEN** January averages 62 kWh per day and May 24 kWh per day
- **THEN** the tool shows a 2.6× ratio and the checklist, starting with electric heating

### Requirement: Verification
Utility and state averages SHALL be recomputed by hand from the cited EIA-861 rows for at least 3 utilities and stored as fixtures, and state averages SHALL match EIA's published average monthly residential consumption by state for the same year within 1%; percentages SHALL match to 0.1 percentage point.

#### Scenario: Hand-computed average
- **WHEN** CI runs the three stored utility cases
- **THEN** every average and percent difference matches
