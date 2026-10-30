## Context

Sources, method, and competitor terms are in `docs/research/05` §1 (verified on eia.gov and ghgprotocol.org, 2026-10-27). EIA computes hourly CO₂ from hourly generation by fuel and annual BA-and-fuel factors, then a multiregional input-output model (de Chalendar et al., 2019) gives consumption-based intensity of load. Data posts by about 4 pm ET the next day. eGRID2024 is late; an unofficial eGRID2024 built from EPA's code is on Zenodo under CC BY 4.0.

## Goals / Non-Goals

**Goals:** hourly emissions and matching from the user's own file, public-domain data only, honest caveats.

**Non-Goals:** marginal rates, forecasts, market-based accounting.

## Decisions

### D1. Consumption-based average intensity from EIA-930
It is public domain, covers every balancing authority hourly since 2018-07-01, and accounts for imports. Alternatives: production-based intensity (ignores imports; offered as a toggle for comparison), Open Grid Emissions (CC BY 4.0, plant-level detail; used as a cross-check, not primary, to keep one public-domain primary source), commercial marginal signals (paid, no resale).

### D2. Hour matching in UTC
User intervals are summed to clock hours in UTC and joined on the UTC hour start, avoiding DST ambiguity. Display stays in the user's local time.

Alternative: join in local time. Rejected: the fall-back hour repeats and the spring hour is missing.

### D3. eGRID edition rule
Use the newest official eGRID edition (eGRID2023 as of 2026-10-29; eGRID2024 is still unreleased by EPA); if the data year is newer than the official edition and an unofficial edition built from EPA code exists (the CC BY 4.0 Zenodo build), offer it as an option labeled "unofficial, third-party build," never as the default.

Alternative: default to the unofficial edition because it is newer. Rejected: users cite eGRID by its official edition in reports.

### D4. Source files and their quirks
Per `docs/research/07`: consumption-based CO₂ intensity is published only in EIA's per-balancing-authority `.xlsx` files (60–115 MB each, from 2018-07-01), not in the API or the six-month CSVs, and every file back to 2015 is rebuilt daily. The pipeline downloads them at build time, pins the download date as the snapshot's as-of date, and precomputes compact shards. Fuel columns for battery storage and solar or wind with integrated batteries begin 2025-01-01; earlier years have no such columns, which the shards record as absent, not zero.

Alternative: the API's hourly series. Rejected: it lacks consumption-based intensity and starts in 2019.

### D5. Refresh
Alternative: refresh hourly data daily. Rejected: the file budget and monthly version cadence; weekly refresh of the last 60 days is enough for history-based tools.

Current shards refresh weekly for the last 60 days from EIA's bulk files (no API key), and a permanent version is cut monthly, both on schedules the pipeline runs unattended (`platform/automation`), with revision history kept in each version's changelog (spec `carbon/hourly-intensity-data`).

### D6. Hour convention
Alternative: keep EIA's hour-ending labels and convert in each tool. Rejected: every tool would repeat the conversion and one would get it wrong.

EIA-930 labels hours by their UTC end. The pipeline converts every row to hour-start UTC on import and pins the conversion with a fixture; tools only ever see hour-start values.

## Risks / Trade-offs

- **EIA data errors** (interchange, misassigned fuel). Mitigation: method caveat on every result and the OGE cross-check.
- **Users may treat scores as compliance.** Mitigation: draft-method label and excluded-items list.
- **The GHG Protocol may change direction.** Mitigation: tools describe the math, not compliance; labels updated when the standard is final.
