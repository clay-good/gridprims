## Purpose

Guarantees that gridprims needs no account, collects no personal data, and never sends user inputs or files off the device, so a facility manager or developer can use it without an IT review or an NDA.

## ADDED Requirements

### Requirement: No accounts, cookies, or identifiers
The product SHALL NOT offer or require accounts, SHALL NOT set cookies, and SHALL NOT create persistent identifiers. Local storage SHALL hold only preferences, recent tools, and inputs the user chose to save, all viewable and erasable from one settings screen.

#### Scenario: Fresh visit stores nothing
- **WHEN** a new visitor loads any page
- **THEN** no cookie is set and no storage key is written until the user changes a preference or chooses to save inputs or keep a file; the service worker's cache of the public app shell is the only exception

#### Scenario: Erase everything
- **WHEN** the user chooses "Erase all local data" and confirms
- **THEN** all app-written storage except the cached app shell is removed and a reload shows defaults

### Requirement: Inputs and files never leave the device
User inputs, loaded files, and results SHALL NOT be transmitted over the network, except in a problem report the user previews and sends. Network requests SHALL be limited to static assets from gridprims origins, and asset URLs SHALL NOT depend on user input except for shards partitioned by state, by balancing authority, or by year. Per-utility data (rates, filings, peaks) SHALL be fetched as the whole state shard that contains the utility.

#### Scenario: Sentinel egress test
- **WHEN** the end-to-end test loads a sentinel-filled interval file and runs every tool on it
- **THEN** no request URL, header, or body seen by the test proxy contains any sentinel value

#### Scenario: Picking a utility's rates
- **WHEN** a user selects a utility in the bill tools
- **THEN** the browser fetches the rate shard for that utility's whole state, and no request names the utility

#### Scenario: Utility lookup by ZIP
- **WHEN** a user looks up their utility by ZIP code
- **THEN** the only request is for the state-level shard that contains the ZIP, and the ZIP itself appears in no request

### Requirement: Privacy promise at the moment of the drop
Every dropzone SHALL state, while the file is being dragged and on the parse receipt, that the file is read on the device and is not uploaded.

#### Scenario: Drag message
- **WHEN** a user drags a file over a dropzone
- **THEN** the overlay text includes the words "Nothing leaves this tab" or an equivalent plain statement

### Requirement: No third-party requests
Pages SHALL make no requests to third-party origins: no analytics, fonts, CDNs, ads, CAPTCHAs, error reporting, maps, or embeds. There are no exceptions.

#### Scenario: Third-party audit
- **WHEN** CI loads every route template and records network requests
- **THEN** every request targets an allow-listed gridprims origin, else the build fails

### Requirement: Aggregate, cookieless usage counts only
If usage is measured, it SHALL be limited to aggregate counts from the hosting provider's request logs and search-console data, with no client-side script. The privacy page SHALL say exactly what is and is not collected.

#### Scenario: No analytics script
- **WHEN** any page source is inspected
- **THEN** it contains no analytics or telemetry script

### Requirement: Strict Content Security Policy
Every page SHALL be served with a CSP that sets at least `default-src 'self'`, `script-src 'self'`, `connect-src 'self'` plus gridprims asset origins, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, and `form-action 'none'`, and SHALL send `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff`.

#### Scenario: Header check
- **WHEN** the deployment smoke test fetches any route
- **THEN** the CSP and security headers match the required policy

### Requirement: Supply-chain integrity
Each release SHALL be built from a tagged commit with the supported Node.js version, SHALL derive every date the build generates from that commit's timestamp so the output is reproducible, SHALL publish SHA-256 digests of every deployed file and of the MCP release archive, and SHALL publish a software bill of materials listing zero third-party packages and every self-hosted font with its license (per `platform/zero-dependency`).

#### Scenario: Reproducible release
- **WHEN** anyone rebuilds a release tag with a supported Node.js version and the archived raw data inputs for that release
- **THEN** every deployed file's SHA-256 matches the published digest list

#### Scenario: Build-time dates come from the tag
- **WHEN** a build writes a date it generated (a generated-at time, a disclosure expiry, a copyright year)
- **THEN** it derives that date from the tagged commit's own timestamp rather than the wall clock, so two rebuilds of one tag are byte-identical
