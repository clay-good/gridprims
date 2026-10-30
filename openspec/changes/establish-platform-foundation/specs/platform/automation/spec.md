## Purpose

Runs everything recurring on the git host's CI with nobody in the path: fetching public data on its own cadence, validating it, building, deploying, depositing durable copies, and noticing when any of that stops.

## ADDED Requirements

### Requirement: The whole pipeline is scheduled and unattended
Fetching, validating, normalizing, snapshotting, building, deploying, depositing to the archive, and regenerating the ledger SHALL run as scheduled CI workflows that publish without human approval. No workflow SHALL wait for a review, an issue to be closed, a label, or any manual trigger as a condition of publishing.

#### Scenario: New publisher release
- **WHEN** a dataset's scheduled check finds a new release upstream
- **THEN** the same run fetches, validates, normalizes, snapshots, rebuilds, deploys, deposits, and updates the ledger, with no issue opened for a person to act on

#### Scenario: Nothing changed upstream
- **WHEN** a scheduled check finds no new release
- **THEN** the run records the check date in the ledger, makes no release, and still counts as a successful run

### Requirement: Only our own scripts run in CI
Workflows SHALL call only Node scripts from this repository and runner-preinstalled `node` and `git`. No marketplace action, and no action that is not published by the git host itself, SHALL be used. Repository policy SHALL restrict actions to local and first-party only and SHALL require full-length commit SHA pinning. With no actions in use there is nothing to pin; if an action is ever added it SHALL be SHA-pinned and recorded in a committed lockfile.

#### Scenario: Marketplace action added
- **WHEN** a workflow references a third-party action
- **THEN** the policy blocks it and the dependency gate fails naming the workflow and the action

#### Scenario: Same pipeline on a laptop
- **WHEN** a contributor runs the pipeline's scripts locally with the supported Node version
- **THEN** every step runs identically with no CI-only step, and the only difference is which credentials are present

### Requirement: The runner is pinned and the runtime is asserted
Workflows SHALL name a pinned runner image label rather than a floating one, and each job SHALL assert at startup that the runner's Node version meets the project's floor, failing with a clear message if the image changes under it. One scheduled canary job SHALL run the test suite on the floating label so an upcoming image change is seen before it breaks the pipeline.

#### Scenario: Runner image changes
- **WHEN** the floating label moves to a new image whose Node version is below the floor
- **THEN** the pinned jobs keep working and the canary fails, naming the version it found

#### Scenario: Node floor asserted
- **WHEN** a job starts
- **THEN** it checks the runtime version against the declared floor before doing any work

### Requirement: Repository size stays inside the host's guidance
CI SHALL assert, on every run that commits, that no committed file exceeds the host's per-file warning size and that the repository's packed size stays under a declared budget with headroom beneath the host's guidance. Exceeding the budget SHALL fail that run with the largest contributors named, rather than being discovered years later as a rejected push.

#### Scenario: Oversized file
- **WHEN** a normalized output would be committed above the per-file warning size
- **THEN** the run fails, names the file and its size, and directs it to the release assets instead

#### Scenario: Repository approaching the budget
- **WHEN** packed size passes the declared budget
- **THEN** the run fails and lists the largest paths by size

### Requirement: Validators are the only gate, and failure is public
A refresh SHALL publish only when its structural validators pass: schema, key uniqueness, checksum, and the row-count bounds in `platform/data-operations`. On failure the previous version SHALL stay live, the run SHALL open an issue automatically with the validator's output, and the failure SHALL appear on the ledger and the limits page. A validator failure SHALL NOT block other datasets, the build, or the deploy of unchanged data.

#### Scenario: One dataset fails, the rest ship
- **WHEN** one dataset's row-count validator fails while four others pass
- **THEN** the four publish, the failing one keeps its previous version live, an issue is opened with the output, and the ledger shows it as failing with the date

#### Scenario: Failure is visible without logging in
- **WHEN** a refresh has been failing for a week
- **THEN** the ledger and the limits page say so with the dataset, the first failure date, and the reason

### Requirement: Credentials are least-privilege
Each credential SHALL hold the minimum scope for its one job: deploy to the one hosting target, deposit to the archive, or write to this repository, and nothing wider.

#### Scenario: Deploy credential scope
- **WHEN** the deploy credential is created
- **THEN** it can edit only the one hosting target this site deploys to, and cannot read or change anything else in the account

### Requirement: No credential that expires on a date
Every credential a scheduled workflow uses SHALL be configured without an expiry date, and SHALL be scoped to its one target rather than to an account. A startup check in each workflow SHALL assert that each credential it is about to use reports no expiry, and SHALL fail loudly and publish the finding if one does, so nothing stops silently a year later because a token lapsed.

#### Scenario: Credential reports an expiry
- **WHEN** a configured credential reports an expiry date
- **THEN** the workflow fails at its startup check, names the credential, publishes the finding on the ledger, and opens an issue

#### Scenario: Scoped to one target
- **WHEN** the deploy credential is configured
- **THEN** it is scoped to the single deploy target and carries no expiry, and the startup check confirms both

### Requirement: Forked pull requests reach no secret
Workflows SHALL NOT use the pull-request target trigger, SHALL NOT expose secrets to workflows triggered by forked pull requests, and SHALL pass any untrusted input through an environment variable rather than interpolating it into a shell command.

#### Scenario: Fork pull request
- **WHEN** a contributor opens a pull request from a fork
- **THEN** its checks run with a read-only token and no secret, and the data checks that need no credential still run

#### Scenario: First-time contributor
- **WHEN** a first-time contributor opens a fork pull request and the host holds its workflows for approval
- **THEN** the contributing guide states that this approval is the host's behavior and affects only that contributor's checks, never the scheduled pipeline or anything that publishes

#### Scenario: Secret never lands in an artifact
- **WHEN** CI scans build outputs, logs, and release assets
- **THEN** no credential value appears in any of them

### Requirement: Staleness is computed in the browser, not at build time
Every shipped data manifest and the ledger JSON SHALL carry the time it was generated. Pages SHALL compute data age in the browser against the visitor's own clock and display it, so a stalled pipeline shows as stale to every visitor without a rebuild. No staleness, freshness, or "last updated" statement SHALL depend on a build having run recently.

#### Scenario: Pipeline dead for a month
- **WHEN** the pipeline has not run for 30 days and no new build has been deployed
- **THEN** every page still shows its data as 30 days old, computed on the device, and the limits page says the automation appears stalled

#### Scenario: Freshness is a computed age, not a stored label
- **WHEN** a page states how current its data is
- **THEN** it states an age derived from the generated-at time and the current clock, never a phrase baked in at build time

### Requirement: Each workflow declares its interval and its staleness threshold
Each scheduled workflow SHALL declare, in data the site ships, its interval and a staleness threshold of three times that interval with a floor of 48 hours. A workflow whose last successful run is older than its threshold SHALL be shown as stalled wherever its freshness appears.

#### Scenario: Daily workflow stalls
- **WHEN** a workflow scheduled daily has not succeeded for 4 days
- **THEN** it exceeds its 3-day threshold and every surface that reports its freshness shows it as stalled

#### Scenario: Weekly workflow within threshold
- **WHEN** a weekly workflow last succeeded 9 days ago
- **THEN** it is shown as due rather than stalled, because its threshold is 21 days

### Requirement: Schedules survive the host's inactivity rule
Because the git host disables scheduled workflows in a public repository after a period of inactivity, without notifying anyone and without re-enabling them, the pipeline SHALL defend itself three ways, none of which depends on a person noticing.

#### Scenario: The load-bearing defense
- **WHEN** a scheduled workflow runs
- **THEN** its first step reads every workflow's state through the host's API, using a token granted permission to write to the host's actions API, and re-enables any the host disabled for inactivity

#### Scenario: The independent defense
- **WHEN** every scheduled workflow is disabled, so nothing inside the host can run
- **THEN** the scheduled handler on the Cloudflare Worker this project already runs re-enables them through the host's API and starts a run

#### Scenario: The best-effort defense, marked as such
- **WHEN** a scheduled run commits the ledger's check timestamps
- **THEN** that commit may also count as repository activity and postpone the host's inactivity timer, which `docs/research/17` could not verify, so it is recorded as best-effort and the other two defenses are the ones relied on

#### Scenario: A workflow is disabled for inactivity
- **WHEN** the host disables a scheduled workflow for inactivity
- **THEN** the next run of any other workflow detects the state and re-enables it, recording the event on the ledger

#### Scenario: The watchdog is itself watched
- **WHEN** the Worker's scheduled handler stops running
- **THEN** its heartbeat in the ledger goes stale, the in-host self-heal step reports it, and visitors see the staleness through the view-time age, so no single watchdog is the only thing standing

#### Scenario: Staleness is visible to visitors
- **WHEN** no successful refresh has run for longer than the published interval
- **THEN** the ledger and the limits page show the pipeline as stalled with the last successful run's date, without anyone being told privately first

### Requirement: Schedules are spread and runs do not overlap
Scheduled workflows SHALL avoid the top of the hour, SHALL be spread across the hour, and SHALL use a concurrency group per dataset so two runs never refresh the same dataset at once. A run SHALL be idempotent: re-running it with unchanged inputs SHALL produce identical outputs and no new release.

#### Scenario: Re-run changes nothing
- **WHEN** a successful run is re-run with the same upstream inputs
- **THEN** checksums match, no new version is cut, and no duplicate deposit is made

#### Scenario: Overlapping schedules
- **WHEN** a long refresh is still running when its next schedule fires
- **THEN** the second run waits or is skipped by the concurrency group rather than racing the first

### Requirement: Budgets are respected by construction
Workflows SHALL stay inside the host's and the hosting provider's documented limits: per-job and per-run duration, API request rates for both the host and the deploy target, and the deploy target's per-version file-count and per-file size caps. The deploy SHALL upload only files whose content changed, using the provider's manifest flow, so a routine deploy costs a small, bounded number of requests.

#### Scenario: Unchanged files are not re-uploaded
- **WHEN** a build changes 40 pages out of 20,000
- **THEN** the deploy uploads only the changed files and reports the count

#### Scenario: Job approaching the limit
- **WHEN** a dataset's refresh would exceed the per-job duration limit
- **THEN** it is split into per-partition jobs rather than being allowed to time out

### Requirement: Everything the pipeline does is published
Each run SHALL record, in the ledger, what it checked, what it changed, what it published, what it deposited, what failed, and how long it took, so the pipeline's own behavior is public data rather than private logs.

#### Scenario: Run recorded
- **WHEN** a scheduled run completes
- **THEN** the ledger gains an entry naming the datasets checked, those refreshed, the versions cut, the deposits made, any failures, and the run's duration
