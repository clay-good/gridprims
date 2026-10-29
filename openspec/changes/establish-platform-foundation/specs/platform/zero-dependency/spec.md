## Purpose

Keeps gridprims free of third-party code so it cannot break, change terms, or leak data because of someone else's package, and so anyone can audit and run the whole thing with only a browser or Node.js.

## ADDED Requirements

### Requirement: No third-party packages
The repository SHALL declare no runtime or development package dependencies. The website, the local MCP server, the data pipeline, and the test suite SHALL use only the JavaScript language, web platform APIs, and Node.js built-in modules. The only third-party files allowed are self-hosted font files under the SIL Open Font License, listed with their license and SHA-256.

#### Scenario: Dependency added
- **WHEN** a change adds any entry to a package dependency field or commits a `node_modules` directory
- **THEN** the dependency gate fails the build

#### Scenario: Fresh clone works
- **WHEN** a user clones the repository on a machine with only the supported Node.js version installed
- **THEN** the build, the tests, and the MCP server's worked examples all run without a package install step, using the committed fixture data subset

### Requirement: Declared runtime versions
The repository SHALL declare a minimum Node.js version, the LTS lines CI tests on, and the minimum browser versions, and SHALL state for each platform API it relies on the version that introduced it and its stability status. APIs marked experimental or release candidate SHALL NOT be required.

#### Scenario: Experimental API used
- **WHEN** code depends on a Node.js API whose documentation marks it experimental in the supported version
- **THEN** the platform-API gate fails and names the API

### Requirement: No runtime third-party services
At runtime the website SHALL depend only on its own origins, and the MCP server SHALL make no network requests at all. Cloudflare is the host for the website and report endpoint; no other service (CAPTCHA, analytics, fonts, CDNs, map tiles, error reporting) SHALL be used. Data collection by the pipeline from public publishers is allowed and happens only at build time.

#### Scenario: MCP offline
- **WHEN** the MCP server runs every tool's examples with networking disabled
- **THEN** every example succeeds

#### Scenario: Development-time services listed
- **WHEN** a contributor reads `docs/platform-apis.md`
- **THEN** it lists every service used during development (git host, local browsers, Cloudflare deploys, public data publishers) and states that none is used at runtime

### Requirement: Own implementations are tested like dependencies
Each in-house replacement for a common library (CSV, XML, `.xlsx`, ZIP inflate wrapper, date and time-zone math, charts, search, static site generation, test harness, browser driver) SHALL have its own test suite with fixtures, and SHALL be listed in `docs/own-implementations.md` with its scope and known limits.

#### Scenario: Unlisted helper
- **WHEN** a new general-purpose module is added without an entry in the own-implementations list
- **THEN** the review checklist flags it before merge
