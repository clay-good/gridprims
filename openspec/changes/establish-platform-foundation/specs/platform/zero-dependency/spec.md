## Purpose

Keeps gridprims free of third-party code so it cannot break, change terms, or leak data because of someone else's package, and so anyone can audit and run the whole thing with only a browser or Node.js.

## ADDED Requirements

### Requirement: No third-party packages
The repository SHALL declare no runtime or development package dependencies. The website, the local MCP server, the data pipeline, and the test suite SHALL use only the JavaScript language, web platform APIs, and Node.js built-in modules.

#### Scenario: Dependency added
- **WHEN** a change adds any entry to a package dependency field or commits a `node_modules` directory
- **THEN** the dependency gate fails the build

#### Scenario: Fresh clone works
- **WHEN** a user clones the repository on a machine with only the supported Node.js version installed
- **THEN** the build, the tests, and the MCP server's worked examples all run without a package install step, using the committed fixture data subset

### Requirement: Reference artifacts are allowed, third-party code is not
Third-party **code** is forbidden. Third-party **reference artifacts** are allowed: files we read or compare against but never execute. Each SHALL be listed in `docs/reference-artifacts.md` with its source, license, version, and SHA-256, and the dependency gate SHALL fail on any third-party file not in that list.

#### Scenario: The allowed artifact kinds
- **WHEN** a third-party file is proposed as a reference artifact
- **THEN** it qualifies only as a self-hosted font, a published schema (for example the ESPI XML schema or the agent protocol's JSON schema), or stored reference output from another engine used as a test vector

#### Scenario: Schema committed as a reference artifact
- **WHEN** the published ESPI schema is committed so fixtures can be checked against it
- **THEN** the gate passes because it is listed with its source, license, version, and checksum, and it is never executed

#### Scenario: Unlisted third-party file
- **WHEN** any third-party file is committed without a list entry
- **THEN** the dependency gate fails and names the file

### Requirement: Declared runtime versions
The repository SHALL declare a minimum Node.js version, the LTS lines CI tests on, and the minimum browser versions, and SHALL state for each platform API it relies on the version that introduced it and its stability status. APIs marked experimental or release candidate SHALL NOT be required.

#### Scenario: Experimental API used
- **WHEN** code depends on a Node.js API whose documentation marks it experimental in the supported version
- **THEN** the platform-API gate fails and names the API

### Requirement: No runtime third-party services
At runtime the website SHALL depend only on its own origins, and the MCP server SHALL make no network requests at all. Data collection by the pipeline from public publishers is allowed and happens only at build time.

#### Scenario: Page makes no third-party request
- **WHEN** CI records every request a page makes
- **THEN** all of them target gridprims origins, and none reaches a publisher, an analytics host, or the watchdog handler

### Requirement: The allowed services, and no others
Cloudflare is the host for the website, the report endpoint, and the one scheduled watchdog handler that keeps the CI schedules alive (foundation design D15). The git host provides the repository, its CI runners, and its actions API. Two independent public research archives hold durable deposits, and a public code archive holds the source at each release tag, as `trust/data-continuity` requires. No other service (CAPTCHA, analytics, fonts, CDNs, map tiles, error reporting) SHALL be used.

#### Scenario: A new service proposed
- **WHEN** a change would add any service beyond those named
- **THEN** the dependency gate fails and names the service, unless the change amends this requirement on its own merits

#### Scenario: MCP offline
- **WHEN** the MCP server runs every tool's examples with networking disabled
- **THEN** every example succeeds

#### Scenario: Development-time services listed
- **WHEN** a contributor reads `docs/platform-apis.md`
- **THEN** it lists every service used during development (the git host, its CI runners and actions API, local browsers, Cloudflare hosting, deploys and the watchdog handler, the two public research archives, the public code archive, public data publishers) and states that none is called by a page at runtime

#### Scenario: CI uses no third-party code either
- **WHEN** CI workflows are audited
- **THEN** every step is a Node script from this repository or a runner-preinstalled `node` or `git` invocation, any action used is the git host's own and pinned to a full-length commit SHA, and the workflow lockfile is committed

### Requirement: Own implementations are tested like dependencies
Each in-house replacement for a common library (CSV, XML, `.xlsx`, ZIP inflate wrapper, date and time-zone math, charts, search, static site generation, test harness, browser driver) SHALL have its own test suite with fixtures, and SHALL be listed in `docs/own-implementations.md` with its scope and known limits.

#### Scenario: Unlisted helper
- **WHEN** a new general-purpose module is added without an entry in the own-implementations list
- **THEN** the build check fails and names the module and the missing entry
