## Why

gridprims.com promises that anyone can check their meter data, read public grid data, and run grid math in a browser tab, for free, without uploading anything, with the source next to every number. That promise holds only if every tool shares one contract: files stay on the device, data carries its publisher, license, and as-of date, results show their method, and nothing pretends to be a utility study.

Existing tools each break one part of it. REopt (from NLR, formerly NREL) is free and thorough but sends your load file to a server and takes minutes. Paid platforms (EnergyCAP, Energy Toolbase) need an account. Public data lives in dozens of agency portals with different formats, and some of it (the federal HIFLD Open map layers) has already gone offline. This change builds the floor every gridprims tool stands on.

This is phase 0. Every other change depends on it.

## What Changes

- **Zero dependencies.** No third-party packages at runtime or in development. Only the JavaScript language, web platform APIs, and Node.js built-ins. Cloudflare hosts; public agencies supply data at build time.
- **Two surfaces, one core.** The static website for humans and a local-only MCP server for developers' agents (`add-local-mcp-server`) run the same modules.
- **Tool contract.** One manifest per tool (id, inputs, outputs, units, method, citations, worked examples, related tools) that generates the page, the command-bar entry, the MCP tool description, and the docs.
- **Privacy and security.** No accounts, cookies, analytics, or third-party requests. Files and inputs never leave the tab. Strict CSP.
- **File intake.** One safe front door for local files: format detection, size limits, a parse receipt the user can correct, and no network access from parsers.
- **Data snapshots.** A registry of every public dataset we ship: publisher, license, redistribution basis, as-of date, retrieved date, checksum, and a CEII screen. Users can download the exact files.
- **Citations and verification.** Every result cites a standard or dataset by edition and section. Every tool passes worked examples from an independent source.
- **App shell.** The command bar, the four page archetypes from `DESIGN.md` (road-sign direction, chosen 2026-10-29), light and night themes that follow the device setting, offline install, and performance budgets.
- **Problem reports.** The family's opt-in report button: the user previews the full payload and sends it; the server stores it and computes nothing.
- **Data operations.** A daily publisher release watch, per-dataset runbooks, validators that block partial updates, post-deploy smoke tests with rollback, and weekly link checks.

## Capabilities

### New Capabilities

- `platform/zero-dependency`: No third-party code; one supported Node.js line; own implementations tested like dependencies.
- `platform/tool-contract`: The manifest and behavioral contract every tool satisfies.
- `platform/privacy-and-security`: Local-only processing, no tracking, strict CSP, supply-chain integrity.
- `platform/file-intake`: Safe local parsing of user files with a correctable parse receipt.
- `platform/data-snapshots`: Versioned, licensed, dated public datasets with a CEII screen and downloads.
- `platform/citations-and-verification`: Citations, worked examples, and the honesty rules for claims.
- `platform/app-shell`: Command bar, page archetypes, themes, offline use, and performance budgets.
- `platform/problem-reports`: The opt-in, user-previewed problem report, protected without third-party CAPTCHAs.
- `platform/data-operations`: Release watching, safe refreshes, live-site checks, and link checks, so one maintainer can keep data fresh.

### Modified Capabilities

None. This is a greenfield repository.

## Non-goals

- No accounts, saved cloud workspaces, sync, or paid tiers.
- No server-side computation, proxies, or hosted APIs beyond static files and the report endpoint. No hosted MCP endpoint.
- No third-party packages, SDKs, frameworks, CDNs, or CAPTCHAs.
- No real-time operational data in tools in v1. The grid pulse in the top bar may show a recent public value with its timestamp, or nothing.
- No CEII, no non-public utility data, and no data we lack a license to redistribute.
- Not a utility interconnection study, not engineering sign-off, not investment or legal advice.

## Impact

- Creates the repository layout, build, data pipeline, and release process that every later change uses.
- Requires a Cloudflare Workers paid plan ($5/month) once the site passes 20,000 static files, which the entity pages in `add-public-grid-data` will.
- Sets privacy, performance, and honesty gates in CI that block releases.
