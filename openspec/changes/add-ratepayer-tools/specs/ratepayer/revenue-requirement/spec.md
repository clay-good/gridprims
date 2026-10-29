## Purpose

Explains where a utility's requested revenue comes from in plain terms, using its own public filings, so customers can follow and question a rate case.

## ADDED Requirements

### Requirement: Standard formula with the utility's figures
The explainer SHALL compute revenue requirement as O&M + depreciation + other taxes + income taxes + rate base × weighted cost of capital (equity ratio × ROE + debt ratio × cost of debt), with income taxes on the equity return equal to equity return × t ÷ (1 − t) for an editable tax rate t. Every input SHALL be user-editable.

#### Scenario: Return on rate base
- **WHEN** rate base is $2,000,000,000, equity ratio 50%, return on equity 10%, and cost of debt 5%
- **THEN** the weighted cost of capital is 7.5%, the return component is $150,000,000, and with t = 25% the income tax on the $100,000,000 equity return is $33,333,333

#### Scenario: Utility without Form 1
- **WHEN** the utility does not file FERC Form 1 (many co-ops and municipal utilities)
- **THEN** the explainer says so and starts with empty fields for the user to fill from the filing

### Requirement: Prefill from Form 1
The explainer SHALL prefill O&M, depreciation, and taxes from FERC Form 1 via PUDL (Catalyst Cooperative, CC BY 4.0, release pinned in the registry, FERC filing year as the data period) where available, and SHALL label those figures total-company.

#### Scenario: Prefilled IOU
- **WHEN** a user picks an investor-owned utility that files Form 1
- **THEN** O&M, depreciation, and taxes fill in with "total-company, FERC Form 1, <year>"

### Requirement: Rate base source
Rate base SHALL be entered by the user from the case filing, or derived from Form 1 balance-sheet lines named in `docs/derivations/rate-base.md` (plant in service minus accumulated depreciation minus accumulated deferred income taxes, plus working capital) and labeled "approximate, from Form 1".

#### Scenario: Derived rate base
- **WHEN** a user accepts the Form 1 derivation
- **THEN** the rate base field shows "approximate, from Form 1" with each line's value and the filing year

### Requirement: One-point sensitivity per bill
The explainer SHALL show how much a one-percentage-point change in return on equity changes the revenue requirement and, using the utility's residential share of revenue and customer count from EIA-861, the approximate change per average residential customer per month, labeled as an approximation.

#### Scenario: ROE sensitivity
- **WHEN** the user moves return on equity from 10% to 9%
- **THEN** with rate base $2,000,000,000, equity ratio 50%, and t = 25%, the revenue requirement falls by $13,333,333 ($10,000,000 of return plus $3,333,333 of income tax), and with a 40% residential revenue share and 500,000 residential customers the estimate is $0.89 less per customer per month, with its method shown

### Requirement: Verification
The explainer SHALL reproduce at least one revenue requirement summary from a public rate case order (components and total) within 0.5% when given that order's inputs, stored as a fixture with its citation.

#### Scenario: Order reproduced
- **WHEN** CI runs the stored rate case example
- **THEN** the computed total is within 0.5% of the order's figure
