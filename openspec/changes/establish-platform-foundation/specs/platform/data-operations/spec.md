## Purpose

Keeps public data fresh and correct with one maintainer: it notices new publisher releases, refreshes safely, never publishes a broken or partial update, and checks the live site the way a visitor would.

## ADDED Requirements

### Requirement: Publisher release watch
A scheduled CI job SHALL check each registered dataset's source page or bulk file at least daily for a new release (by published date, file size, or checksum) and SHALL record the check date in the registry. A new release SHALL open a tracked refresh task naming the dataset and the change detected; it SHALL NOT publish anything by itself.

#### Scenario: New EIA-923 month
- **WHEN** EIA posts a new EIA-923 monthly file
- **THEN** the next daily check records it and opens a refresh task for EIA-923 with the new file's date and size

### Requirement: Refresh runbook per dataset
Each registry entry SHALL link a runbook listing the fetch command, validators, expected row-count range, known publisher quirks (for example EIA-930 hour-ending timestamps and its fuel columns added on 2025-01-01), and the manual checks before release.

#### Scenario: Runbook present
- **WHEN** a dataset is added to the registry without a runbook
- **THEN** the registry validator fails and names the dataset

### Requirement: Never publish a partial or suspicious update
A refresh SHALL publish only when every validator passes. Validators SHALL include schema checks, key uniqueness, and row-count change limits (fail when rows drop more than 5% or rise more than 25% from the previous version unless the runbook records an expected change). On failure the previous version SHALL stay live and the failure SHALL be logged with the validator's output.

#### Scenario: Truncated download
- **WHEN** an EIA-860 refresh yields 40% fewer generator rows than the previous version
- **THEN** the release is blocked, the previous version stays live, and the log names the row-count validator

### Requirement: Live-site checks
After every deploy, a smoke test SHALL fetch every route template and a sample of 200 entity pages from the public origin and SHALL check status codes, security headers, the absence of third-party requests, and that page source stamps match the registry. A failure SHALL roll back to the previous deploy.

#### Scenario: Header regression
- **WHEN** a deploy serves a page without the required CSP
- **THEN** the smoke test fails and the previous deploy is restored

### Requirement: Outbound link checks
A weekly job SHALL check every outbound link in manifests, guides, and citations, and SHALL report broken or redirected links (for example `reopt.nrel.gov` moving to an `nlr.gov` address) for repair, without blocking deploys.

#### Scenario: Moved handoff
- **WHEN** the REopt handoff URL returns a redirect to a new host
- **THEN** the weekly report lists the link, its new target, and every page that uses it
