## Purpose

Answers the questions people actually ask about bills, rates, emissions, and the grid in short, cited explainers that hand the reader straight to a tool with a worked example.

## ADDED Requirements

### Requirement: Launch explainers
At launch the Learn section SHALL publish these explainers: Why is my bill so high; Flat versus time-of-use rates; Demand charges explained; Coincident peaks (4CP, 5CP, and capacity tags); How to read your meter data; What a rate case is and how to comment; How big is a data center request; Hourly versus annual emissions; What a balancing authority is; Where does my power come from (power content labels and fuel mix); How gridprims keeps public data.

#### Scenario: Learn index
- **WHEN** a visitor opens Learn
- **THEN** all eleven explainers, the glossary, the get-your-data index, and the program link index are listed

### Requirement: Summary first, then detail
Each explainer SHALL open with a summary of at most three sentences at reading grade 8 or below, then sections of at most 300 words each, and SHALL end with a "Try it" link that opens a launched tool or page with the explainer's example prefilled through the URL fragment (the rate case explainer opens the household bill check with a current and an edited tariff; the data center explainer opens the requested utility's page with its annual peak and sales).

#### Scenario: Try the demand charge example
- **WHEN** a reader follows "Try it" on Demand charges explained
- **THEN** the bill tools open with the explainer's sample file and tariff, labeled "Example values"

### Requirement: Numbers are cited, dated, and generated where possible
Every number in an explainer SHALL either be generated at build from a registered dataset (with its source stamp) or carry a citation and date. Hand-typed numbers older than 24 months SHALL be flagged for review in CI.

#### Scenario: Data center scale
- **WHEN** "How big is a data center request" states a utility's annual peak
- **THEN** the number comes from the Form 714 snapshot owned by `add-public-grid-data` with its source stamp, not typed by hand

### Requirement: Neutral and factual
Explainers SHALL describe how things work and show the math. They SHALL NOT take positions on rate cases, projects, companies, or policy, and SHALL present every side's stated rationale only with citations.

#### Scenario: Data center explainer
- **WHEN** the explainer discusses who pays if a large customer leaves
- **THEN** it explains minimum bills and exit fees with tariff citations and does not characterize any company or project

### Requirement: Review date
Each explainer SHALL show its last-reviewed date and SHALL show a yellow "Needs review" chip after 12 months.

#### Scenario: Year-old explainer
- **WHEN** an explainer was last reviewed 12 months and 1 day ago
- **THEN** a yellow "Needs review" chip shows with the date
