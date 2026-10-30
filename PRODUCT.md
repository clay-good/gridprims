# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain JavaScript ES modules with JSDoc, web platform APIs, and Node.js built-ins only. No packages, frameworks, CDNs, or third-party scripts. Own static site generator; static assets on Cloudflare Workers. Source of truth: `openspec/changes/establish-platform-foundation`.

## Users

Two doors, one product:

- **Households** (about 143M residential customers): "Is my bill normal? Which plan is cheapest for how I use power? Who is my utility? When is the grid cleanest?" Usually on a phone, often with only monthly bill totals. Confirmed 2026-10-29 as a first-class launch audience.
- **Professionals**: facility and fleet managers, co-op and municipal utility engineers, solar and storage developers, data center siting teams, city and utility commission staff, ratepayer advocates, reporters, and students. Usually at a desk with a meter export, a bill PDF, and a spreadsheet; sometimes preparing for a meeting or deadline.

## Product Purpose

The US power grid's math, files, and public data in one free tab. Drop a meter file and get peaks, a line-by-line bill, cheaper rates, coincident-peak exposure, hourly emissions, and a battery and solar screen in under a second, without uploading anything. Read one cited, dated page for every utility, plant, and grid region. Developers get the same tools offline through a local MCP server.

Success: people cite gridprims numbers in bills disputes, rate cases, council meetings, news stories, and coursework, and come back.

## Positioning

Nobody free answers "what is my own meter data and bill actually saying, and is the number right?" privately and with sources. gridprims computes on the device, shows its work and the as-of date of every number, and keeps a versioned public copy of federal grid data as it gets harder to find. It hands off to REopt, Interconnection.fyi, GridStatus, and roughlogic.com rather than rebuilding them.

## Operating Context

- Inputs people already have: Green Button XML or CSV exports, utility interval CSVs, Excel workbooks, monthly bill totals, a ZIP code.
- Outputs people take away: a copied result card, a one-page printed report, a CSV export for REopt, a citation, a factual public-comment draft.
- Settings: office desks in daylight, phones on the go, projectors in hearing rooms, printed handouts.

## Capabilities and Constraints

- Zero ads, accounts, cookies, tracking, and server compute. Inputs and files never leave the device; the only exception is a problem report the user previews and sends.
- Screening estimates, labeled as such. Never a utility study, legal or investment advice, or grid control.
- Public data only; never CEII; only data we may redistribute.
- English at launch with all copy held in one place (manifests and string files) so Spanish can follow in phase 2.
- Licensing: code MIT; gridprims' own page text and derived data CC BY 4.0, except tables whose inputs require otherwise (ISO-published data keeps its publisher's terms; share-alike inputs keep share-alike), with each upstream credit carried through.

## Brand Commitments

- Name: gridprims (lowercase in running text). Domain gridprims.com.
- Sister sites share the ethos: sophiewell.com, geoprims.com, roughlogic.com, enklayve.com, vaulytica.com, encryptalotta.com.
- Voice: plain words from the user's side, grade 8 or below for result sentences, no superlatives, no emoji, numbers in US style.

## Evidence on Hand

- Research briefs: `docs/research/01`–`13`. Each tags facts verified or unverified; where two briefs disagree, the later, more specific direct check wins and the conflict is recorded in the affected change's design.
- No users, testimonials, endorsements, or accuracy benchmarks exist yet. Never fabricate them; accuracy claims come only from CI results.

## Product Principles

1. Answer first, then show the work.
2. Your data stays yours, and the page says so when it matters.
3. Every number has a unit, a source, and a date.
4. Honest about limits: say what is excluded, approximate, or stale.
5. Link, don't rebuild.

## Accessibility & Inclusion

WCAG 2.2 AA in both themes, full keyboard use, 320 px wide without sideways scroll, a text summary and table for every chart, entity pages readable with JavaScript off, phone-first performance budgets, and plain language for non-experts.
