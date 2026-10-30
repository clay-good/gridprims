## Purpose

Keeps public data fresh and correct with nobody in the path: scheduled automation notices new publisher releases, refreshes and publishes them, never ships a broken or partial update, and checks the live site the way a visitor would.

## ADDED Requirements

### Requirement: Publisher release watch and refresh in one run
A scheduled CI job SHALL check each registered dataset's source page or bulk file at least daily for a new release (by published date, file size, or checksum) and SHALL record the check date. When it finds one, the same run SHALL fetch, validate, normalize, snapshot, rebuild, deploy, deposit, and update the ledger, per `platform/automation`. No refresh task, queue, or approval SHALL stand between finding a release and publishing it.

#### Scenario: New EIA-923 month
- **WHEN** EIA posts a new EIA-923 monthly file
- **THEN** the next scheduled run publishes it end to end and records the new version, its checksums, and its diff on the ledger

#### Scenario: Cadence per dataset
- **WHEN** a dataset refreshes monthly and another weekly
- **THEN** each is checked on its own schedule, and a check that finds nothing still records the check date

### Requirement: Machine-readable refresh recipe per dataset
Each registry entry SHALL carry a recipe the pipeline executes: source URLs, fetch and decompression steps, the normalizer to run, the validators and their bounds, expected row-count range, partition scheme, and known publisher quirks (for example EIA-930's hour-ending timestamps and the fuel columns it added on 2025-01-01). The recipe SHALL be data the pipeline reads, not prose for a person to follow.

#### Scenario: Recipe present
- **WHEN** a dataset is added to the registry without a recipe
- **THEN** the registry validator fails and names the dataset and the missing fields

#### Scenario: Quirk encoded, not described
- **WHEN** a publisher's file needs an hour-shift on import
- **THEN** that shift is a step in the recipe with a fixture pinning it, rather than an instruction in prose

### Requirement: Never publish a partial or suspicious update
A refresh SHALL publish only when every validator passes. Validators SHALL include schema checks, key uniqueness, and row-count change limits (fail when rows drop more than 5% or rise more than 25% from the previous version unless the dataset's recipe records an expected change).

#### Scenario: Validators run before anything publishes
- **WHEN** a refresh produces normalized output
- **THEN** schema, key-uniqueness, checksum, and row-count validators run first, and nothing is published unless all of them pass

### Requirement: A failed validator keeps the old version and says so
On failure the previous version SHALL stay live, the failure SHALL be published on the ledger and the limits page with the validator's output, and an issue SHALL be opened automatically. Other datasets SHALL continue to publish.

#### Scenario: Failure published, not queued
- **WHEN** a validator fails on one dataset
- **THEN** its previous version stays live, the ledger and limits page name the dataset and the validator, an issue is opened automatically, and every other dataset's refresh proceeds

#### Scenario: Truncated download
- **WHEN** an EIA-860 refresh yields 40% fewer generator rows than the previous version
- **THEN** the release is blocked, the previous version stays live, and the log names the row-count validator

### Requirement: Live-site checks
After every deploy, a smoke test SHALL fetch every route template and a sample of 200 entity pages from the public origin and SHALL check status codes, security headers, the absence of third-party requests, and that page source stamps match the registry. A failure SHALL roll back by re-publishing the previous version's asset manifest, which the deploy keeps for exactly this purpose, and the smoke test SHALL exercise that path on staging so the rollback is known to work before it is needed.

#### Scenario: Header regression
- **WHEN** a deploy serves a page without the required CSP
- **THEN** the smoke test fails and the previous version's manifest is re-published, restoring the prior site

### Requirement: Outbound link checks
A weekly job SHALL check every outbound link in manifests, guides, and citations, and SHALL publish broken or redirected links (for example `reopt.nrel.gov` moving to an `nlr.gov` address) to the ledger and open an issue, without blocking deploys.

#### Scenario: Moved handoff
- **WHEN** the REopt handoff URL returns a redirect to a new host
- **THEN** the weekly report lists the link, its new target, and every page that uses it
