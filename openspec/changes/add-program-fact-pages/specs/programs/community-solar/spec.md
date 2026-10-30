## Purpose

Answers "is there community solar in my state, and how much?" from a national laboratory's project dataset, with honest labels on what is built and what is only announced.

## ADDED Requirements

### Requirement: License confirmed on the publisher's page before shipping
These pages SHALL NOT build until the registry entry records the license of the National Laboratory of the Rockies "Sharing the Sun" community solar dataset as read on that laboratory's own landing page, with the date read and the license text quoted, because catalog records are evidence rather than the publisher's own statement. The entry SHALL also record the publisher, the snapshot date as the data period, and the required attribution.

#### Scenario: License unconfirmed
- **WHEN** the registry entry carries only a catalog record's license field
- **THEN** the build excludes the community solar pages and the state pages omit the section

### Requirement: State pages
Each state page SHALL show the number of community solar projects and their capacity (MW), split by status (operating and pending) and by program type where the dataset provides it, with the dataset's snapshot date.

#### Scenario: Status split
- **WHEN** a state has operating and pending projects
- **THEN** both are shown separately with their capacities and the snapshot date

### Requirement: Pending is labeled a market estimate
Pending project counts and capacity SHALL be labeled as market tracking rather than a registry, SHALL NOT be added to operating capacity in any headline figure, and SHALL carry a note that pending projects change without notice and many never get built.

#### Scenario: No combined headline
- **WHEN** a state has 40 MW operating and 180 MW pending
- **THEN** no figure presents 220 MW as the state's community solar capacity

### Requirement: Attribution and no subscription advice
Every page using the dataset SHALL carry its required credit. The pages SHALL NOT recommend a provider, estimate a subscriber's savings, or link to a signup; they MAY link to the state's own program page.

#### Scenario: Credit present
- **WHEN** a community solar section renders
- **THEN** the publisher's required credit appears with the snapshot date

### Requirement: Verification
State project counts and capacity SHALL be recomputed from the dataset and checked against the publisher's own published summary for the same snapshot, matching exactly, with the dataset version recorded.

#### Scenario: Summary check
- **WHEN** CI compares our state counts with the publisher's summary
- **THEN** every value matches for the recorded snapshot
