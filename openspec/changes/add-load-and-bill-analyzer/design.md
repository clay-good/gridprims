## Context

Methods, formulas, and tariff examples are in `docs/research/03`; competitor gaps in `docs/research/02`; data licenses in `docs/research/01`. This change builds one page, the load workbench (the DESIGN.md "File workbench" archetype), with six tool families behind tabs that share one loaded file.

Key facts that shape the design:
- Green Button ESPI XML stores UTC epoch seconds and integer values scaled by `powerOfTenMultiplier`; the full NAESB REQ.21 standard costs $250.
- URDB is CC0 with bulk downloads (`usurdb.json.gz`, about 15 MB; API v8 needs a free key and is not used at runtime); it encodes 12 × 24 period schedules, tiers, flat and TOU demand, ratchets, coincident demand, fixed and minimum charges in several units ($/day, $/year, kVA, daily demand). Only about 150 utilities are re-checked yearly.
- REopt.jl (now v1.0.1 under the `NatLabRockies` GitHub org) ignores `demandwindow` and coincident charges; PySAM Utilityrate5 is the second reference engine; neither models power factor (`docs/research/07`). REopt's load file is exactly 8,760, 17,520, or 35,040 kW values, no header, dropping December 31 in leap years.
- ERCOT allows redistribution of 4CP data; PJM, NYISO, and ISO-NE do not.
- The PUCT has proposed replacing 4CP with 12CP on 30-minute intervals (Project 58000; SB 6 requires adoption by 2026-12-31); PJM winter changes start with delivery year 2027/28. ERCOT 4CP intervals for 2018–2025 are verified from ERCOT's files, except 2021 times (`docs/research/06`).

## Goals / Non-Goals

**Goals:**
- Every result from one file in under 1 s for a year of 15-minute data; slider recompute at 10 Hz or better.
- A bill engine we can defend line by line against two independent engines.

**Non-Goals:**
- Optimization, forecasting, or export-compensation modeling (see proposal).

## Decisions

### D1. One canonical interval series
Intake produces one series per meter: UTC start instants, interval length, demand in kW, plus a local-time view under an explicit IANA zone. Every tool reads this series; none re-parses the file. Changing a receipt choice rebuilds the series and re-runs all tools.

Alternative: let each tool parse what it needs. Rejected: results would disagree when assumptions differ.

### D2. Bill engine as data plus rules
Tariffs normalize from URDB JSON (or the manual form) into one internal tariff record: periods, tiers, demand windows, ratchet terms, PF rule, fixed and minimum charges, and a list of unmodeled items. The engine computes billing determinants per month, then charges. Unmodeled charge types are carried as named, excluded lines, never silently dropped.

| Alternative | Why not |
|---|---|
| Call PySAM or REopt.jl at runtime | Server or heavy Wasm; uploads or slow load. Used as CI references instead. |
| Support only flat and TOU energy | Misses demand charges, the main pain point. |

### D3. Billing months
v1 uses calendar months unless the user enters meter-read dates, because real billing periods are not in interval files. The bill comparison names this as the most common cause of mismatch.

Alternative: infer read dates from the file. Rejected: interval files carry no read dates, and a wrong guess shifts demand peaks between months.

### D4. Peak-shaving method
Per billing month, binary-search the lowest threshold the battery can hold with perfect foresight (`docs/research/03` §5), 40 iterations or 0.1 kW resolution, whichever comes first. For a single flat monthly demand charge this is the optimum, so it bounds REopt's demand savings from above; CI checks it against stored demand-only REopt runs. REopt may save less on demand when it also optimizes energy arbitrage. Degradation in v1 is equivalent full cycles per year with a note; BLAST-Lite capacity fade is phase 2.

Alternative: daily threshold (as in the concept mockup). Rejected: demand charges are monthly, so daily thresholds understate savings.

### D5. Coincident-peak programs as versioned definitions
Each program is a dated definition (number of peaks, months, interval length, hour-label convention, time basis, charge basis) keyed by rule year, so a method change such as 4CP to 12CP is a new version, not an edit. ERCOT intervals ship from our snapshot (ERCOT's terms allow it); other operators' intervals are user-entered with links until a legal review says otherwise (`docs/research/01` open question 2).

Alternative: one definition per operator with year parameters. Rejected: the Texas proposal changes the count and interval length, not just dates.

### D6. Green Button support
Parse ESPI XML `IntervalBlock`s and Green Button CSV per foundation spec `platform/file-intake` (unit multipliers, flow direction, file-declared time rules). Validate against the ESPI schema (Apache-2.0) and our own synthetic files only; no Green Button Alliance sample files are committed, because the Alliance's site terms limit use to private, non-commercial purposes (`docs/research/08`). Buy NAESB REQ.21 ($250; ESPI 4.0, with 4.1 listed) before declaring the parser stable.

Alternative: rely on public samples alone. Rejected: their license is unclear and they miss the utility CSV shapes people actually download.

### D7. Fixtures
Alternative considered: anonymized real customer files. Rejected: re-identification risk and consent burden.

A fixture library of at least 20 real-shaped exports (utility CSVs, Green Button XML and CSV, hour-ending stamps, both DST changes, gaps, duplicates, multi-meter, kWh vs kW). Values are synthetic, generated by our own scripts in the shapes real utilities export; public sample files are used only where their license allows redistribution, recorded per file. NLR End-Use Load Profiles are confirmed CC BY 4.0 (`docs/research/08`) and may seed realistic shapes with credit; `add-household-bill-check` owns the registered shapes. The foundation owns the fixture library (foundation task 5.1); this change adds its bill and coincident-peak cases. No customer data from real people.

## Risks / Trade-offs

- **URDB errors.** A wrong rate gives a confident wrong bill. Mitigation: show URDB id, last-updated date, source link, and the actual-bill comparison; link to report errors upstream.
- **Billing-period mismatch.** Calendar months differ from meter-read cycles. Mitigation: optional read dates (D3).
- **Rule changes in 4CP and PJM.** Mitigation: versioned definitions (D5) and a review date on each.
- **Over-trust in savings.** Mitigation: perfect-foresight label, excluded-effects list, and REopt handoff.
