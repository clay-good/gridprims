## Context

Screen text, thresholds, state divergence, and data availability are in `docs/research/12` (verified 2026-10-29 against an accepted utility tariff and state rules).

**One conflict between briefs, resolved here.** `docs/research/13` reports that a national hosting-capacity index exists and recommends linking it; `docs/research/12`, checking the pages directly later the same day, finds that index unmaintained, dated mid-2025, and already returning errors on some entries. We take the later, more specific finding: the federal atlas is linked with a note that it is unmaintained, and the per-utility directory in `interconnect/feeder-data-paths` is the thing we keep current, because a decaying index is exactly the case where a dated, checked list earns its keep.

**Four utilities do publish per-feeder minimum load** on open endpoints, which changes the tool from "nobody can tell you" to "here is where yours may already be published" for part of the country. We link and explain rather than copy, per D5. Two screens commonly attributed to the federal procedures do not exist in them: there is no starting-voltage-drop screen and no screen named a penetration test; both belong to particular states. Tariff copies of different vintages circulate on utility sites, so every citation records the vintage it was read from.

## Goals / Non-Goals

**Goals:** make the process and the screens legible; teach the minimum-load uncertainty instead of hiding it; convert a dead end into a purchasable next step.

**Non-Goals:** a pass/fail oracle; anything needing a circuit model; any infrastructure dataset.

## Decisions

### D1. An explainer and self-assessment, not an oracle
Each screen carries a label: answerable by the applicant, answerable by the installer, or answerable only by the utility. Screens whose inputs are entirely user-owned are evaluated and reported. The rest are explained with their threshold and left explicitly open.

| Alternative | Why not |
|---|---|
| Estimate the utility-only screens from assumptions | A confident wrong verdict on a screen that decides a project, and it reads as the study we must not imply. |
| Omit the screens we cannot evaluate | The applicant then does not know what is coming, which is most of the value of reading the screens at all. |

### D2. A band for the load-ratio screens, never a point
The two screens that compare proposed generation with line-section load are computed across the minimum-load assumption band the utilities themselves use, from 15% to 40% of peak, and the result states the assumption at which the answer flips. Where a state codifies a fallback, that value is shown as the state's own and marked separately from the band.

| Alternative | Why not |
|---|---|
| Use the common 30%-of-peak proxy as a single number | It hides a near-threefold spread that changes the answer, and two states' rules set a different value. |
| Refuse to compute without real minimum load | The band is exactly what tells an applicant whether the question is close or settled, which is actionable. |

### D3. State thresholds as a curated, cited dataset
Screen thresholds by jurisdiction live as one reviewed record per jurisdiction and screen, every field cited to the tariff or rule and carrying the vintage read, under the contribution rules. The comparison view is generated from it.

| Alternative | Why not |
|---|---|
| Prose per state | Drifts immediately and cannot be compared side by side. |
| Scrape utility tariff libraries | Vintages differ, formats vary, and an out-of-date screen threshold is worse than none. |

### D4. The standard is cited, never reproduced
Inverter settings are stated as facts with a citation to a government or state-rule source that publishes the value, in our own structure. The standard's tables and its organization are never reproduced.

Alternative: reprint the standard's tables for convenience. Rejected: copyright, and state rule text is the better citation anyway because it is what the utility enforces.

### D5. Where minimum load is published, point at it; never host it
Where a utility publishes per-feeder minimum load openly, the directory records that, explains how to find a feeder's value, and accepts the value the user reads off it as a utility-published input. We do not copy, cache, or republish per-feeder values.

| Alternative | Why not |
|---|---|
| Mirror the four utilities' feeder values so the tool can look them up | Feeder-level load data is the part of this domain closest to protected infrastructure information, the values go stale, and the terms differ per utility. |
| Ignore that they publish it and always show the band | Throws away a real answer for several million customers because the rest of the country lacks it. |

### D6. Maps are linked and described, never mirrored
The hosting-capacity directory records, per utility, whether a map exists, whether data can be downloaded, what the terms say, and when we last checked. No map data is copied, and no value from one is republished.

Alternative: mirror downloadable hosting-capacity data. Rejected: per-utility terms vary and are often restrictive, the values go stale fast, and feeder-level capacity data is the part of this domain closest to protected infrastructure information.

### D7. The pre-application report is the product's best answer
Where the applicant's question turns on data only the utility holds, the tool explains the tariff's pre-application report: what it costs, how long the utility has to return it, and the items it contains. That turns "nobody can tell you" into a concrete, cheap step.

Alternative: leave the dead end unaddressed. Rejected: the report is the mechanism the rules provide, and most applicants do not know it exists.

### D8. Vintage is part of every citation
Every quoted threshold records the document, its jurisdiction, and the vintage read, because superseded copies of the federal procedures remain in circulation on utility sites and differ materially.

Alternative: cite the document without the vintage. Rejected: our research found an obsolete copy first; a reader following our citation could land on the same one.

## Risks / Trade-offs

- **Users will want a verdict.** Mitigation: the process router and the locally-answerable screens give real answers, and the band shows whether the open question is close or settled.
- **Thresholds change with each rulemaking.** Mitigation: last-checked dates, a "needs review" chip after 12 months, and the vintage on every citation.
- **Hosting-capacity terms differ per utility.** Mitigation: the directory records terms and we host nothing.
