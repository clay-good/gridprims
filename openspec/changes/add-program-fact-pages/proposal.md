## Why

**Value up front:** a homeowner, co-op board member, or reporter can ask "how much rooftop solar is already on my utility's system, and is it growing?", "is there community solar in my state and how big is it?", and "do I need to certify my small generator with the federal regulator?" and get a cited, dated answer instead of a vendor's landing page.

These are the highest-search, lowest-cost pages left on our list, and the licensing questions that blocked them are now answered (`docs/research/13`):
- **Net metering and distributed generation** come straight from the federal utility survey, which publishes capacity, customer counts, and energy by state, utility, sector, and technology, in the public domain. The state-rules database we previously considered carries a share-alike license, so we take the quantities from the federal file and link out for the rules.
- **Community solar** comes from a national laboratory's project dataset, which catalog records now show under an attribution-only license, not the restrictive one earlier research feared.
- **Qualifying-facility self-certification** has no filing fee, so a plain-language checklist is useful and safe precisely because it decides nothing.
- **Hosting capacity maps** have a federal index, but checking it directly found it unmaintained and partly broken (`docs/research/12`), so we link it with that condition stated and keep the dated per-utility directory in `add-interconnection-screens` as the thing we actually maintain.

## What Changes

- **Net metering and distributed generation pages** per state and per utility: capacity, customers, and energy by sector and technology, with trends for every year we hold, and a link out to the state's rules.
- **Community solar pages** per state: project count, capacity, and status from the national laboratory dataset, with pending projects labeled as a market estimate rather than a registry.
- **Qualifying-facility checklist:** who needs a certification, the size thresholds, the no-fee self-certification path, what the form asks, and where to file. Strictly descriptive.
- **Program link index:** a curated, dated index of the things we deliberately do not rebuild, each with what it is and who maintains it.

## Capabilities

### New Capabilities

- `programs/net-metering`: Distributed generation and net metering by state and utility, from federal data.
- `programs/community-solar`: Community solar projects by state, with honest status labels.
- `programs/qualifying-facility`: A descriptive checklist for small-generator self-certification.
- `programs/program-links`: The curated index of tools and maps we link to instead of rebuilding.

### Modified Capabilities

- `data/utility-pages`: gains the net metering section this change's data feeds, rendered by that capability.

The owning change is applied first; the requirements here describe what this change must supply.

## Non-goals

- Reproducing a share-alike policy database, or restating any state's rules as our own text; we link to the authoritative source.
- Eligibility determinations, fuel-use or efficiency calculations, or anything that tells a user they qualify for a federal certification.
- Per-utility fuel-mix or power-content pages: no state publishes a reusable national file, so `add-learn-and-data-guides` carries an explainer instead (`docs/research/13`).
- A national hosting-capacity map or an index that competes with the federal one.
- Solar quotes, installer referrals, incentive estimates, or any lead generation.

## Impact

- Phase 3 for the net metering, community solar, and qualifying-facility pages, per the plan's phase table. `docs/research/13` recommended the first two for phase 2; the plan holds them to phase 3 because they are reading pages rather than tools and must earn their place against phase 2's evidence. The link index ships with phase 1's Learn section so the "link, don't rebuild" promise is visible at launch.
- Adds two datasets to the registry: the federal survey's net metering and non-net-metering distributed generation files (public domain), which this change owns, distinct from the survey's sales, customers, revenue, reliability, and service-territory files owned by `add-public-grid-data`; and the national laboratory's community solar dataset (attribution license, to be re-confirmed on the publisher's own page before shipping).
