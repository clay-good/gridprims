## Purpose

Answers "is there community solar in my state, and how much?" from a national laboratory's project dataset, with honest labels on what is built and what is only announced.

## ADDED Requirements

### Requirement: Terms captured automatically, posture decides
The pipeline SHALL capture the National Laboratory of the Rockies "Sharing the Sun" dataset's terms from the publisher's own landing page on each refresh, record the text, the date, the publisher, the snapshot date as the data period, and the required attribution, and let `platform/data-snapshots` derive the posture. The pages SHALL build under whichever posture applies, with no human confirmation step.

#### Scenario: Only a catalog record available
- **WHEN** the publisher's own page states no license and only a catalog record does
- **THEN** the posture is `derive`, the pages show our own computed project counts and capacity with the credit and a link to the dataset, and no copy of the file is published

#### Scenario: Publisher's page states the license
- **WHEN** the captured page text matches a recognized reusable license
- **THEN** the posture is `mirror`, the quoted text and its capture date are recorded, and downloads are offered

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
