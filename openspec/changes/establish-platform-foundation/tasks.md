## 1. Repository and zero-dependency gates

- [x] 1.1 Create the layout from design D17 with a README in each top-level directory; verify `ls` shows every directory and README
- [x] 1.2 Add the dependency gate (no dependency fields, no `node_modules`, only listed font files) and record each shipped font's license and SHA-256 (Overpass and Overpass Mono are dual-licensed SIL OFL 1.1 and LGPL 2.1; `RedHatOfficial/Overpass`); verify it fails on a fixture that adds a package and on a font file with no license record
- [x] 1.3 Add the platform-API gate and `docs/platform-apis.md` (API, version introduced, stability); verify it fails on a fixture that uses an experimental Node API
- [x] 1.4 Pin Node 24.12+ and run CI on Node 24 and 26; verify a clean clone builds and tests with no install step
- [x] 1.5 Start `docs/own-implementations.md` with a build check that every general-purpose module has an entry; verify the check fails on an unlisted module rather than relying on a review
- [ ] 1.6 Commit the phase-0 fixture subset: EIA-861 (the one dataset phase 0 builds) plus synthetic fixtures for every other shape, and record that the full three-state, three-balancing-authority subset in D11 is a phase-1 exit item; verify every phase-0 worked example runs offline from a fresh clone
- [x] 1.7 Add the deployable file-count gate (80,000); verify it fails on a fixture build over the limit

## 2. Measure before committing the risky numbers

- [x] 2.1 Spike the delimited-text parser in a worker and measure a real year of 15-minute data on the reference profile before the 1 s budget becomes a CI gate; verify the measured figure is recorded in `docs/decisions-day-one.md` and the budget set from it
- [ ] 2.2 Build one real EIA-861 shard end to end and freeze the packed binary column format from what that dataset actually needs (mixed types, nullability); verify the format document names the cases the fixture exercised
- [ ] 2.3 Run the EIA-861 and EIA-923 recipes against the last three published vintages and set the row-count bounds from the observed deltas; verify the recorded bounds and the vintages they came from
- [ ] 2.4 Fetch the live agent-protocol specification and its published schema, record one real handshake from a client, and amend `agent/mcp-server` where the live spec differs from what `docs/research/04` assumed; verify the recorded handshake and any amendment
- [ ] 2.5 Set each launch dataset's posture by hand in the registry and run the license matcher as an advisory check beside it; verify the matcher agrees with every hand-set posture before it is made authoritative

## 3. Tool contract

- [x] 3.1 Write `docs/decisions-day-one.md` fixing the artifacts everything else generates from, and review it before any other task: the manifest file format and location with every field's type and cardinality and the archetype enumeration; the dataset registry and refresh-recipe format with its step vocabulary; the build output layout (what lands in the deploy root versus `data/`, and how the deploy manifest is derived); the test layout and the one command a contributor runs; the CI workflow inventory with each workflow's trigger and interval; the report endpoint's payload and storage schema; nothing further for the reference machine, which is the throttled reference profile in `platform/app-shell` everywhere, including the parse budget; and the report proof-of-work difficulty (target about 300 ms on a mid-range phone). Verify every later phase-0 task cites this file rather than inventing its own shape
- [x] 3.2 Define the manifest schema from that decision record; verify it accepts a sample manifest and rejects each missing required field
- [ ] 3.3 Generate tool pages, command-bar entries, MCP descriptions and schemas, and docs from manifests; verify snapshot tests show identical labels, units, and citations everywhere
- [x] 3.4 Implement fragment-encoded share state; verify a copied link reproduces inputs and result in a fresh browser profile
- [x] 3.5 Implement tool versioning and the public changelog; verify a fixture result change without a version bump fails CI
- [ ] 3.6 Implement shared-quantity computation and the cross-tool agreement check; verify the peak-agrees-everywhere and receipt-change scenarios across web and MCP
- [ ] 3.7 Implement declared rounding and the significant-figures rule; verify the coarse-rate and copied-card scenarios
- [x] 3.8 Build the reference tool `calc.energy-units.convert` end to end (manifest, conversion core, golden vectors from the cited constants, page, command-bar entry, MCP parity, validation level with its evidence); verify the 12 MWh conversion, the unit-and-source display, and identical results on web and MCP
- [ ] 3.9 Verify every phase-0 tool-contract requirement has a test: worked state on first paint, refusals as answers, the screening label, handoffs carrying no user data, and the share-state round trip

## 4. Own implementations

- [x] 4.1 Delimited-text parser with encoding, delimiter, and quote detection; verify against the fixture library
- [x] 4.2 Streaming XML parser that refuses DTDs and entities; verify an XXE fixture is refused as a whole file with no request made
- [x] 4.3 `.xlsx` reader (ZIP directory, raw inflate via `DecompressionStream` and `zlib`, shared strings, cached values); verify against 10 utility workbook fixtures in browser and Node
- [x] 4.4 Time-zone and DST helper on `Intl`; verify the DST fixture suite in Chrome, Firefox, Safari, and Node
- [ ] 4.5 Static site generator with escaped templates; verify a 20,000-page fixture builds in under 10 minutes on a CI runner of the pinned image and that unescaped input fails a test
- [x] 4.6 SVG chart components per DESIGN.md's Charts section; verify peak-preserving downsampling and table views
- [x] 4.7 Flesch-Kincaid readability module with a syllable exceptions list, used by the result-sentence gate; verify against 20 hand-scored sentences within 0.5 grade
- [x] 4.8 Browser driver over CDP (Chrome) and WebDriver BiDi (Firefox) with `safaridriver`; verify it loads a page, records requests, and resizes to 320 px in each browser

## 5. Privacy and security

- [x] 5.1 Configure CSP and security headers in the Worker; verify the header smoke test passes on every route template
- [x] 5.2 Build the sentinel egress test; verify it fails on a deliberately leaking fixture
- [x] 5.3 Build the third-party request audit; verify it fails on a fixture page that loads an external font
- [x] 5.4 Build the settings screen with "Erase all local data"; verify storage is empty after erase except the app shell cache
- [ ] 5.5 Publish digests and a zero-package SBOM per release; verify a rebuild of a tag reproduces the digests

## 6. File intake

- [x] 6.1 Own the synthetic fixture library: at least 20 real-shaped exports seeded from `docs/research/03` and `09` §1 (Green Button XML and CSV, Smart Meter Texas CSV, major utility CSV and Excel shapes, interval-ending stamps), and implement format detection and routing; verify every fixture routes and parses to its expected receipt, including the interval-ending scenario
- [x] 6.2 Implement worker parsing with progress and cancel; verify 35,040 rows parse in under 1 s on the reference profile
- [x] 6.3 Implement the editable parse receipt; verify changing the time zone recomputes every result in a fixture
- [x] 6.4 Handle DST, gaps, duplicates, multiple meters, negative values; verify the spring-forward, conflicting-duplicate, mixed-unit, two-meter, partial-year, fall-back, and gap scenarios
- [x] 6.5 Implement the unsupported-file message and the keep-this-file consent path; verify the unsupported-file and reload-forgets-the-file scenarios
- [x] 6.6 Read Green Button `uom`, `powerOfTenMultiplier`, `flowDirection`, `intervalLength`, and `LocalTimeParameters` per ESPI; verify the multiplier and export-channel scenarios on synthetic fixtures plus any OpenESPI sample or test file that carries an explicit Apache-2.0 header, recorded per file with its header (files without an open header are not committed, per `docs/research/08`)

## 7. Data snapshots

- [ ] 7.1 Define the dataset registry and validator; verify a fixture without a redistribution basis fails
- [ ] 7.2 Build fetch → validate → normalize → snapshot for EIA-861 with `fetch`, `zlib`, and the `.xlsx` reader; verify checksums and row counts match the raw file
- [ ] 7.3 Write CSV.gz downloads and binary column shards with JSON manifests, no file over 20 MiB; verify re-running with unchanged input reproduces checksums
- [ ] 7.4 Write the CEII screen checklist; verify the build fails for an infrastructure dataset without one
- [ ] 7.5 Implement source stamps and staleness notes; verify a fixture past its cadence shows the note
- [ ] 7.6 Implement per-table licenses and upstream notice files in manifests; verify the mixed-inputs and incompatible share-alike scenarios
- [ ] 7.7 Enforce the at-most-monthly permanent-version rule; verify the two-versions-in-one-month scenario

## 8. Citations, verification, app shell

- [ ] 8.1 Golden-vector runner with tolerances and stored third-party reference outputs; verify a drifted fixture fails
- [x] 8.2 "How we got this" panel and the claims gate; verify an untested accuracy claim fails the build
- [x] 8.3 Shell, DESIGN.md tokens, components, light and night themes, command bar; verify "12 MWh to MMBtu" opens the reference unit converter (D10) filled in, the saved-theme and no-preference scenarios, and the contrast lint against the DESIGN.md ratios
- [x] 8.4 PWA with offline tools; verify the load workbench parses a file in airplane mode after one visit
- [ ] 8.5 Budgets on the reference profile, accessibility checks (including the screen-reader pacing and popover scenarios), and 320 px sweep through the own browser driver; verify CI fails on an oversized fixture page
- [ ] 8.6 Deploy script using Cloudflare's direct-upload API with `fetch` and `crypto`; verify a staging deploy and a digest match
- [ ] 8.7 Build the grid pulse from the latest daily values with its hidden state when no snapshot exists; verify the weekly-snapshot and no-snapshot scenarios
- [ ] 8.8 Implement validation levels in the manifest, the evidence gate, the work-zone strip for levels 0 and 1, and the level in MCP results; verify the level-shown, claimed-level-exceeds-evidence, level-0, copied-result, and agent-result scenarios

## 9. Problem reports

- [ ] 9.1 Worker route with D1, honeypot, proof-of-work, rate limiting, and size limits; verify the flood and honeypot scenarios and that no third-party script loads
- [ ] 9.2 Retention cleanup and privacy-page disclosure; verify a fixture report closed 181 days ago is deleted
- [ ] 9.3 Build the report dialog with its payload preview, the returned id, and the drag-time privacy message; verify the default-payload, submitted-report, and drag-message scenarios

## 10. Data operations and automation

- [ ] 10.1 Scheduled per-dataset check-and-refresh workflows that publish end to end with no approval step; verify the new EIA-923 month and cadence scenarios against fixture pages
- [ ] 10.2 Machine-readable refresh recipes in the registry and their validator; verify the missing-recipe and quirk-encoded scenarios
- [ ] 10.3 Row-count and schema validators that keep the previous version live, publish the failure, and open an issue; verify the truncated-download and one-dataset-fails scenarios
- [ ] 10.4 Post-deploy smoke test with rollback; verify the header-regression scenario on staging
- [ ] 10.5 Weekly outbound link check publishing to the ledger; verify the moved-handoff scenario
- [ ] 10.6 Write every workflow with only our own Node scripts and first-party actions pinned by SHA, with the lockfile committed and repository policy set; verify the marketplace-action and same-pipeline-on-a-laptop scenarios
- [ ] 10.7 Implement the three schedule defenses (commit per run, in-run re-enable of inactivity-disabled workflows, and the off-host check); verify the disabled-workflow, all-disabled, and staleness-visible scenarios
- [ ] 10.8 Set credential scopes, forbid expiring credentials and the pull-request target trigger, and scan outputs for secrets; verify the fork-pull-request, expiring-token, and secret-scan scenarios
- [ ] 10.9 Implement concurrency groups, off-the-hour schedules, idempotent re-runs, and changed-file-only deploys; verify the re-run, overlapping-schedule, and unchanged-files scenarios
- [ ] 10.10 Publish every run's actions to the ledger; verify the run-recorded scenario
- [ ] 10.11 Implement the automatic redistribution posture and terms capture, with posture shown on every dataset page and download; verify the posture-derived, unclear-terms, derive-posture, posture-shown, terms-page-changes, and publisher-objects scenarios
- [ ] 10.12 Implement the storage split (normalized plus manifests in git, raw inputs as release assets; archive deposits are added by `add-trust-and-continuity` in phase 1) and the repository-size and per-file gates; verify the large-raw-input, nothing-depends-on-an-artifact, oversized-file, and repository-budget scenarios
- [ ] 10.13 Implement view-time staleness (generated-at in every manifest and the ledger, age computed on the device) and per-workflow staleness thresholds; verify the pipeline-dead-for-a-month, computed-age, daily-stall, and weekly-within-threshold scenarios
- [ ] 10.14 Implement the watchdog handler on the existing Worker with its heartbeat, and the in-run self-heal step; verify the load-bearing, independent, best-effort, and watchdog-is-watched scenarios
- [ ] 10.15 Pin the runner label, assert the Node floor, and add the floating-label canary; verify the runner-image-changes and node-floor scenarios
