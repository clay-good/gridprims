## Purpose

Computes the threshold that separates ordinary days from major event days, shows every day it excludes, and says when the method does not fit the utility's own data.

## ADDED Requirements

### Requirement: The threshold, step by step
From the daily customer-minutes-per-customer-served values, the tool SHALL use only days with interruption activity, take the natural logarithm of each, compute the mean and the standard deviation, and set the threshold at the exponential of the mean plus two and a half standard deviations. It SHALL use five years of history where available and SHALL apply the threshold to the following year. Every step's intermediate value SHALL be shown.

#### Scenario: Threshold computed
- **WHEN** the logged daily values give a mean of −2.86 and a standard deviation of 1.31 in log space
- **THEN** the threshold is 1.51 minutes per customer per day, and the panel shows the mean, the standard deviation, the count of days used, and the formula

### Requirement: The standard-deviation choice is disclosed
Because no free source states whether the sample or the population standard deviation is intended, the tool SHALL use the sample standard deviation, SHALL name that as a gridprims choice, and SHALL report the threshold under both so the difference is visible.

#### Scenario: Both thresholds shown
- **WHEN** a threshold is computed
- **THEN** the panel shows it under the sample and the population standard deviation, and names the sample one as the value used and as our choice

#### Scenario: Days without activity excluded
- **WHEN** 210 of 365 days had no interruptions
- **THEN** those days are excluded before the logarithm, the count is shown, and the result names the 155 days used

### Requirement: Which day an interruption counts toward
The tool SHALL attribute each interruption's customer minutes to the day the interruption began, SHALL cite the state rule that states that convention, and SHALL offer splitting minutes across calendar days as an alternative the user can select, reporting the threshold under whichever is chosen, because the choice changes every daily value and therefore the threshold.

#### Scenario: Interruption spanning two days
- **WHEN** an interruption runs from 23:30 to 01:15 with 400 customers out
- **THEN** by default all 42,000 customer minutes (400 × 105) count toward the starting day, the convention is named with its citation, and selecting the split option moves the 30,000 customer minutes after midnight (400 × 75) to the following day

### Requirement: Every flagged day is listed
The tool SHALL list each day whose daily value exceeds the threshold with its date, its daily value, its event count, and its customer minutes, and SHALL show the indices with and without those days.

#### Scenario: Storm days flagged
- **WHEN** two days exceed the threshold and one equals it exactly
- **THEN** the two exceeding days are listed and flagged, the day equal to the threshold is not, and the indices appear on both bases

### Requirement: The distribution assumption is checked and reported
Because the method assumes the daily values follow a log-normal distribution, the tool SHALL test the natural logarithms of the daily values for normality with the Shapiro-Wilk test at a 5% significance level, report the statistic and the result in plain words, and warn when it fails that the threshold may be unreliable, which is common for a small utility with few outage days. The test and its level SHALL be named as gridprims' choice, since no free source prescribes one.

#### Scenario: Assumption fails
- **WHEN** the logged daily values fail the test at the 5% level
- **THEN** the result says the method's assumption does not hold for this data, keeps the threshold visible as a reference, and advises reporting both bases and stating the method

### Requirement: Our own minimum, disclosed as ours
Because no free source states a minimum number of days for the method, the tool SHALL require at least 30 active days, SHALL refuse to compute a threshold below that, and SHALL state that the 30-day minimum is gridprims' choice and not part of the published method.

#### Scenario: Too few active days
- **WHEN** a log has 22 active days
- **THEN** no threshold is computed, and the message gives the 30-day minimum, the 22 found, and says the floor is ours

### Requirement: Less than five years is labeled
When fewer than five years of history are supplied, the tool SHALL compute the threshold from what is available and SHALL label the result with the number of years used and the effect of a short history on the threshold.

#### Scenario: Two years supplied
- **WHEN** two years of daily values are supplied
- **THEN** the threshold is computed and labeled as based on two years, with a note that fewer years make the threshold less stable

### Requirement: Verification
The threshold SHALL reproduce the one verified published vector exactly to two decimal places, and the day-flagging SHALL reproduce the stored published daily table's flags exactly.

#### Scenario: Published vector
- **WHEN** CI runs the verified vector
- **THEN** the computed threshold matches the published value to two decimal places
