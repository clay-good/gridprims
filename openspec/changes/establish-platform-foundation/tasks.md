## 1. Repository and zero-dependency gates

- [ ] 1.1 Create the layout from design D15 with a README in each top-level directory; verify `ls` shows every directory and README
- [ ] 1.2 Add the dependency gate (no dependency fields, no `node_modules`, only listed font files) and record each shipped font's license and SHA-256 (Overpass and Overpass Mono are dual-licensed SIL OFL 1.1 and LGPL 2.1; `RedHatOfficial/Overpass`); verify it fails on a fixture that adds a package and on a font file with no license record
- [ ] 1.3 Add the platform-API gate and `docs/platform-apis.md` (API, version introduced, stability); verify it fails on a fixture that uses an experimental Node API
- [ ] 1.4 Pin Node 24.12+ and run CI on Node 24 and 26; verify a clean clone builds and tests with no install step
- [ ] 1.5 Start `docs/own-implementations.md`; verify every general-purpose module has an entry
- [ ] 1.6 Commit the fixture data subset (D11); verify every worked example runs offline from a fresh clone
- [ ] 1.7 Add the deployable file-count gate (80,000); verify it fails on a fixture build over the limit

## 2. Tool contract

- [ ] 2.1 Define the manifest schema; verify it accepts a sample manifest and rejects each missing required field
- [ ] 2.2 Generate tool pages, command-bar entries, MCP descriptions and schemas, and docs from manifests; verify snapshot tests show identical labels, units, and citations everywhere
- [ ] 2.3 Implement fragment-encoded share state; verify a copied link reproduces inputs and result in a fresh browser profile
- [ ] 2.4 Implement tool versioning and the public changelog; verify a fixture result change without a version bump fails CI
- [ ] 2.5 Implement shared-quantity computation and the cross-tool agreement check; verify the peak-agrees-everywhere and receipt-change scenarios across web and MCP
- [ ] 2.6 Implement declared rounding and the significant-figures rule; verify the coarse-rate and copied-card scenarios

## 3. Own implementations

- [ ] 3.1 Delimited-text parser with encoding, delimiter, and quote detection; verify against the fixture library
- [ ] 3.2 Streaming XML parser that refuses DTDs and entities; verify an XXE fixture is refused as a whole file with no request made
- [ ] 3.3 `.xlsx` reader (ZIP directory, raw inflate via `DecompressionStream` and `zlib`, shared strings, cached values); verify against 10 utility workbook fixtures in browser and Node
- [ ] 3.4 Time-zone and DST helper on `Intl`; verify the DST fixture suite in Chrome, Firefox, Safari, and Node
- [ ] 3.5 Static site generator with escaped templates; verify a 20,000-page fixture builds in under 10 minutes on the reference laptop and that unescaped input fails a test
- [ ] 3.6 SVG chart components per DESIGN.md's Charts section; verify peak-preserving downsampling and table views
- [ ] 3.7 Browser driver over CDP (Chrome) and WebDriver BiDi (Firefox) with `safaridriver`; verify it loads a page, records requests, and resizes to 320 px in each browser

## 4. Privacy and security

- [ ] 4.1 Configure CSP and security headers in the Worker; verify the header smoke test passes on every route template
- [ ] 4.2 Build the sentinel egress test; verify it fails on a deliberately leaking fixture
- [ ] 4.3 Build the third-party request audit; verify it fails on a fixture page that loads an external font
- [ ] 4.4 Build the settings screen with "Erase all local data"; verify storage is empty after erase except the app shell cache
- [ ] 4.5 Publish digests and a zero-package SBOM per release; verify a rebuild of a tag reproduces the digests

## 5. File intake

- [ ] 5.1 Own the synthetic fixture library: at least 20 real-shaped exports seeded from `docs/research/03` and `09` §1 (Green Button XML and CSV, Smart Meter Texas CSV, major utility CSV and Excel shapes, interval-ending stamps), and implement format detection and routing; verify every fixture routes and parses to its expected receipt, including the interval-ending scenario
- [ ] 5.2 Implement worker parsing with progress and cancel; verify 35,040 rows parse in under 1 s on the reference profile
- [ ] 5.3 Implement the editable parse receipt; verify changing the time zone recomputes every result in a fixture
- [ ] 5.4 Handle DST, gaps, duplicates, multiple meters, negative values; verify the spring-forward, conflicting-duplicate, mixed-unit, two-meter, partial-year, fall-back, and gap scenarios
- [ ] 5.5 Read Green Button `uom`, `powerOfTenMultiplier`, `flowDirection`, `intervalLength`, and `LocalTimeParameters` per ESPI; verify the multiplier and export-channel scenarios on synthetic fixtures plus any OpenESPI sample or test file that carries an explicit Apache-2.0 header, recorded per file with its header (files without an open header are not committed, per `docs/research/08`)

## 6. Data snapshots

- [ ] 6.1 Define the dataset registry and validator; verify a fixture without a redistribution basis fails
- [ ] 6.2 Build fetch → validate → normalize → snapshot for EIA-861 with `fetch`, `zlib`, and the `.xlsx` reader; verify checksums and row counts match the raw file
- [ ] 6.3 Write CSV.gz downloads and binary column shards with JSON manifests, no file over 20 MiB; verify re-running with unchanged input reproduces checksums
- [ ] 6.4 Write the CEII screen checklist; verify the build fails for an infrastructure dataset without one
- [ ] 6.5 Implement source stamps and staleness notes; verify a fixture past its cadence shows the note
- [ ] 6.6 Implement per-table licenses and upstream notice files in manifests; verify the mixed-inputs and incompatible share-alike scenarios

## 7. Citations, verification, app shell

- [ ] 7.1 Golden-vector runner with tolerances and stored third-party reference outputs; verify a drifted fixture fails
- [ ] 7.2 "How we got this" panel and the claims gate; verify an untested accuracy claim fails the build
- [ ] 7.3 Shell, DESIGN.md tokens, components, light and night themes, command bar; verify "12 MWh to MMBtu" opens the reference unit converter (D10) filled in, the saved-theme and no-preference scenarios, and the contrast lint against the DESIGN.md ratios
- [ ] 7.4 PWA with offline tools; verify the load workbench parses a file in airplane mode after one visit
- [ ] 7.5 Budgets on the reference profile, accessibility checks (including the screen-reader pacing and popover scenarios), and 320 px sweep through the own browser driver; verify CI fails on an oversized fixture page
- [ ] 7.6 Deploy script using Cloudflare's direct-upload API with `fetch` and `crypto`; verify a staging deploy and a digest match

## 8. Problem reports

- [ ] 8.1 Worker route with D1, honeypot, proof-of-work, rate limiting, and size limits; verify the flood and honeypot scenarios and that no third-party script loads
- [ ] 8.2 Retention cleanup and privacy-page disclosure; verify a fixture report closed 181 days ago is deleted

## 9. Data operations

- [ ] 9.1 Daily publisher release watch that opens refresh tasks; verify the new EIA-923 month scenario against a fixture page
- [ ] 9.2 Runbook links in the registry and the runbook validator; verify the missing-runbook scenario
- [ ] 9.3 Row-count and schema validators that keep the previous version live; verify the truncated-download scenario
- [ ] 9.4 Post-deploy smoke test with rollback; verify the header-regression scenario on staging
- [ ] 9.5 Weekly outbound link check; verify the moved-handoff scenario
