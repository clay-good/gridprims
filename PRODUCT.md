# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain JavaScript ES modules with JSDoc, web platform APIs, and Node.js built-ins only. No packages, frameworks, CDNs, or third-party scripts. Own static site generator; static assets on Cloudflare Workers. Source of truth: `openspec/changes/establish-platform-foundation`.

## Users

One lead question, then everything else:

- **People siting load or generation** (lead audience, confirmed 2026-11-01): data center and manufacturing siting teams, solar and storage developers, fleet and facility electrification planners, co-op and municipal utility engineers, economic development staff, commission staff, and reporters covering load growth. Their question is "where can this connect, how much, and how long will it take?" They arrive with a place and a size, not a file.
- **Everyone else the same data serves**: facility and fleet managers, ratepayer advocates, students, and households (about 143M residential customers) asking "is my bill normal? which plan is cheapest? who is my utility?" These keep every tool already built, reached through the search bar and the tool catalog rather than the front page.

## Product Purpose

Answer, from public data alone, where new load or generation can connect to the US grid, how much, and how long it is likely to take. Give a place and a size and get the utility and balancing authority that would serve it, that size against the utility's own peak and sales, what is already queued nearby, how long those projects have taken, how many withdrew, and which federal interconnection process applies, every figure cited and dated.

Behind that one question sits everything else already built: meter-file analysis, bill and tariff pricing, coincident peaks, hourly emissions, battery and solar screens, household bill checks, and a cited page for every utility, plant, and grid region. They are reached through the search bar and the tool catalog, not the front page. Developers get the same tools offline through a local MCP server.

Success: people cite gridprims numbers in siting decisions, interconnection filings, rate cases, council meetings, and news stories, and come back.

## Positioning

Nobody free assembles the public record into one answer to "where can this connect, how much, and how long?" The inputs exist and are public (LBNL's queue data, FERC Form 714 peaks, EIA-861 territories and sales, the federal interconnection procedures), but they sit in separate files that each take a day to join. We join them, by place and by size, and say plainly where the public record runs out: feeder and substation headroom is CEII, so we answer at utility, balancing-authority, and county level and never at the parcel.

We also answer, privately and with sources, "what is my own meter data and bill actually saying, and is the number right?" gridprims computes on the device, shows its work and the as-of date of every number, and keeps a versioned public copy of federal grid data as it gets harder to find. It hands off to REopt, Interconnection.fyi, GridStatus, and roughlogic.com rather than rebuilding them.

## Operating Context

- Inputs people already have: a place and a size (a ZIP or county, and a load or project in MW) for the lead question; Green Button XML or CSV exports, utility interval CSVs, Excel workbooks, monthly bill totals for everything else.
- Outputs people take away: a cited siting read-out they can paste into a memo or a filing, a copied result card, a one-page printed report, a CSV export for REopt, a citation, a factual public-comment draft.
- Settings: office desks in daylight, phones on the go, projectors in hearing rooms, printed handouts.

## Capabilities and Constraints

- Zero ads, accounts, cookies, tracking, and server compute. Inputs and files never leave the device; the only exception is a problem report the user previews and sends.
- Screening estimates, labeled as such. Never a utility study, legal or investment advice, or grid control.
- Every tool declares a validation level (unvalidated, self-checked, cross-checked, field-verified) with committed evidence, shown beside its answer and listed on a generated limits page. A tool may ship as stable only at cross-checked or above; anything at unvalidated or self-checked ships labeled experimental or not at all. At launch we expect stable tools cross-checked and **none field-verified**, because real bills, utility studies, and practitioner checks only arrive once people use the site. That is why we build before we can fully validate, and why user reports are the validation pipeline.
- We refuse the numbers public data cannot support, and say why: no loss-of-load or adequacy figures, no nodal prices, no pass-or-fail interconnection verdicts, no forecasts.
- Public data only; never CEII; only data we may redistribute.
- English at launch with all copy held in one place (manifests and string files) so Spanish can follow in phase 2.
- Licensing: code MIT; gridprims' own page text and derived data CC BY 4.0, except tables whose inputs require otherwise (ISO-published data keeps its publisher's terms; share-alike inputs keep share-alike), with each upstream credit carried through.

## Brand Commitments

- Name: gridprims (lowercase in running text). Domain gridprims.com.
- Sister sites share the ethos: sophiewell.com, geoprims.com, roughlogic.com, enklayve.com, vaulytica.com, encryptalotta.com.
- Voice: plain words from the user's side, grade 8 or below for result sentences, no superlatives, no emoji, numbers in US style.

## Evidence on Hand

- Research briefs: `docs/research/01`–`17`. Each tags facts verified or unverified; where two briefs disagree, the later, more specific direct check wins and the conflict is recorded in the affected change's design.
- No users, testimonials, endorsements, or accuracy benchmarks exist yet. Never fabricate them; accuracy claims come only from CI results.

## Product Principles

1. Answer first, then show the work.
2. Your data stays yours, and the page says so when it matters.
3. Every number has a unit, a source, and a date.
4. Honest about limits: say what is excluded, approximate, or stale, and publish our own error where we can measure it.
5. Link, don't rebuild.
6. Stay small on the surface. Capability grows behind a search box and a catalog; the page a visitor lands on does not.
7. One front page, one question. The home page answers where new load or generation can connect, how much, and how long. Everything else is reached by asking for it.
8. Say where the public record stops. Feeder and substation headroom is CEII; we answer at utility, balancing-authority, and county level and never pretend to parcel resolution.

## Accessibility & Inclusion

WCAG 2.2 AA in both themes, full keyboard use, 320 px wide without sideways scroll, a text summary and table for every chart, entity pages readable with JavaScript off, phone-first performance budgets, and plain language for non-experts.
