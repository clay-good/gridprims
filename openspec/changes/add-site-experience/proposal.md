## Why

**Value up front:** a household on a phone and an engineer at a desk both land on gridprims and, within one screen, find the tool that answers their question, see that it is free and private, and know why they can trust the number. Search engines and reporters can find and cite every page.

Every tool and data page is specified, but nothing yet says how people arrive, choose a door, move between sections, or judge whether a free site deserves trust. Research (`docs/research/09`) shows record bill anxiety in 2026, 16% of adults (28% of Hispanic adults) online only by smartphone, and journalists and councils needing citable numbers on data-center requests. A public utility needs a front door, a map, and its credentials on display.

We deliberately do not rebuild what sister sites and partners do: building wiring links to roughlogic.com, live queues to Interconnection.fyi, market data to GridStatus, full storage design to REopt.

## What Changes

- **Home and navigation:** a command-first home page with two doors (For your home, For your work), section landing pages, a full tool catalog, stable URLs with redirects, and a helpful 404.
- **Discoverability:** unique titles and descriptions, canonical URLs, structured data for datasets and glossary terms, sitemaps dated by data rather than by build, Atom feeds for the changelog and data releases, and one static social card per section.
- **Trust pages:** about, methods, privacy, accessibility statement, corrections policy and log, changelog, license and how to cite, sources, review status, and a developer page.
- **Translation-ready:** every string in string files, locale-aware number and date formatting, layouts tested with 35% longer text, and a reserved `/es/` path. Spanish itself is phase 2.

## Capabilities

### New Capabilities

- `site/home-and-navigation`: The home page, section pages, tool catalog, URL scheme, and 404.
- `site/discoverability`: Search, sharing, and feed metadata generated from manifests and the data registry.
- `site/trust-pages`: The pages that show who runs gridprims, how it works, how it handles data and errors, and how to reuse it.
- `site/translation-ready`: String externalization and locale handling so translation needs no code change.

### Modified Capabilities

None. (Builds on `platform/app-shell` and `platform/tool-contract`, which this change does not alter.)

## Non-goals

- A blog, newsletter, email list, or comments.
- Per-page generated social images (needs a font rasterizer we would have to write), share widgets, or tracking pixels.
- Spanish pages at launch (phase 2, chosen 2026-10-29; see design D6).
- Paid search, ads, or any growth tactic that needs tracking.

## Impact

- Phase 0 (shell, URL scheme, string files, trust page templates) and phase 1 (home content, catalog, feeds) per `plan-launch-and-value-proof`.
- Adds a redirects file, sitemaps, feeds, and string files to the build; adds a literal-copy lint and a pseudo-locale layout test to CI.
