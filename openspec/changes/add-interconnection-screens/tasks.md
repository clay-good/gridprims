## 1. Curated thresholds

- [ ] 1.1 Define the jurisdiction screen record schema (process, screen, threshold, test basis, who answers, citation, vintage read, last checked) under `trust/curated-contributions`; verify a record missing a citation or vintage fails the check
- [ ] 1.2 Enter the federal procedures from an accepted tariff of confirmed vintage, and the jurisdictions named in `docs/research/12`; verify each threshold against its primary document by the two-source route, or, where a second primary source is recorded unreachable, by the single-source label; no reviewer route exists
- [ ] 1.3 Record per-utility minimum-load assumptions and state codified fallbacks with citations; verify each is attributed to its own source and never presented as ours, and recheck the items `docs/research/12` tags unverified (the two states' codified fallbacks among them) automatically against their archived text, publishing each with its check result rather than holding it for a person
- [ ] 1.4 Build the misquoted-threshold correction list from rule text; verify every entry cites the rule and the vintage read

## 2. Process router

- [x] 2.1 Implement routing from size, voltage, technology, export, and jurisdiction; verify the fast-track-eligible and above-the-ceiling scenarios (federal procedures)
- [x] 2.2 Show deadlines and fees from rule text with vintages; verify the timeline scenario and that every value carries a citation (federal deadlines and the pre-application report, cited by section; state schedules come with section 1)
- [x] 2.3 Implement jurisdiction coverage and the reference-only fallback; verify the unsupported-state scenario (no state is held yet, so every state shows the federal reference with its commission)
- [x] 2.4 Add the not-an-application statement and portal links; verify the next-step scenario (no utility portals are recorded yet, so the result says to file with the utility)

## 3. Screens

- [x] 3.1 Render every screen in rule order with thresholds and citations; verify the screen-list and screens-that-do-not-exist scenarios (federal Initial Review screens, plus the screens it does not have)
- [x] 3.2 Implement the who-can-answer labels; verify every screen carries one and the utility-only scenario links the data paths (the feeder-data-paths page the utility-only screens should link waits on section 5)
- [ ] 3.3 Evaluate the locally answerable screens; verify the service-transformer backfeed scenario and the arithmetic shown (line configuration, shared secondary, and center-tap imbalance are evaluated; the transformer backfeed check is a state screen and waits on the state records)
- [x] 3.4 Block verdicts on model-dependent screens; verify the fault-current scenario produces no pass or fail
- [x] 3.5 Implement the status summary without likelihood language; verify the mixed-result scenario in a snapshot test
- [ ] 3.6 Build the state comparison view from the curated records; verify the different-load-ratio-test and hosting-capacity-is-the-screen scenarios
- [x] 3.7 Implement the storage minimum-load distinction; verify the solar-plus-storage scenario
- [ ] 3.8 Add last-checked dates and the review chip, and register the threshold dataset as downloadable under CC BY 4.0; verify the stale-jurisdiction and comparison-downloadable scenarios

## 4. Minimum-load range

- [x] 4.1 Implement the peak-ratio screen; verify the over-threshold scenario
- [x] 4.2 Implement the band computation with the flip point, the rule's own comparison direction, and the daytime-only restriction; verify the flips-inside-the-band, settled-both-ways, exactly-at-the-threshold, and storage-project scenarios (the federal rule's comparisons; state rules come with the curated thresholds, section 1)
- [ ] 4.3 Show the band's provenance, per-utility assumptions, and confirmed state fallbacks by technology; verify the per-utility-assumption, codified-fallback, and unconfirmed-fallback-withheld scenarios
- [x] 4.4 Implement the utility-provided override (including the published-feeder-value path and the measured-or-estimated flag) and the no-peak-load path; verify all three scenarios (utility value with its source and measured-or-estimated flag; no peak load refuses)
- [x] 4.5 Run the six hand-computed fixtures; verify every ratio and result matches (six hand-computed cases in interconnect.minimum-load.screen; the codified-state-fallback case waits on section 1)

## 5. Feeder data and equipment

- [ ] 5.1 Write the pre-application report walkthrough per jurisdiction with citations; verify the report-explained and no-such-report scenarios
- [ ] 5.2 Map returned items to the screens they settle; verify the what-the-fee-buys scenario
- [ ] 5.3 Build the hosting-capacity directory with terms, vintages, and per-feeder minimum-load availability, linking only; verify the viewer-only, utility-publishes-minimum-load, atlas-condition, and nothing-hosted scenarios
- [ ] 5.4 Add the map caveats and freshness chips; verify the caveat and stale-entry scenarios
- [ ] 5.5 Write the certification and settings reference with per-value citations; verify the certification-mismatch, setting-cited, and no-free-source scenarios
- [x] 5.6 Implement inverter sizing and the export-limiting explainer; verify the 1.25 ratio, benchmarks-deferred, limited-export, and busbar scenarios (EIA's inverter-loading-ratio range read from the primary, so the research's unverified tag is cleared; Texas § 25.211(g)(1) read from the rule as the export-tested provision)

## 6. Surfaces

- [x] 6.1 Run every worked example through the MCP server; verify identical structured results and that no tool returns a pass or fail for a model-dependent screen
- [ ] 6.2 Confirm the automatic CEII screen finds no infrastructure data in this change's outputs; verify the documented screen record in the registry, with no signature
- [ ] 6.3 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
