## 1. Pipelines

- [ ] 1.0 Extend the foundation's EIA-861 pilot pipeline (foundation task 6.2) into this change's owned registry entries; verify no dataset has two registry owners
- [ ] 1.1 Add EIA-860, 861 (its sales, customers, revenue, reliability, and service-territory files only; the net metering and distributed generation files belong to `add-program-fact-pages`), and 923 fetch, validate, normalize, snapshot; verify row counts match EIA's published totals and PUDL within documented differences
- [ ] 1.2 Derive EIA-930 daily and monthly rollups from the hourly snapshot in `add-hourly-carbon`; verify one month's rollup equals the sum of its hourly values
- [ ] 1.3 Add eGRID and its ZIP-to-subregion table, URDB (partitioned by state; this change owns it), LBNL Queued Up, FERC Form 714 annual peaks via PUDL with the respondent crosswalk, EIA-860M, and the Census ZCTA-to-county file; verify registry entries carry license and credit text and 10 sampled Form 714 peaks match PUDL
- [ ] 1.4 Build cross-source joins with an unmatched-rows report; verify no row is matched by name alone

## 2. Utility pages

- [ ] 2.1 Render utility pages with facts, bundled versus delivery-only price, annual peak, reliability, trends, and fragment-preset links; verify the 12.50-cent, 20%-above, Oncor, no-Form-714, no-plants, and EIA price-table scenarios
- [ ] 2.2 Apply the content minimum; verify the thin-record scenario

## 3. Plant pages

- [ ] 3.1 Render plant pages with generators, generation, prorated capacity factor, emissions; verify the 25.0%, mid-year start, pumped storage, and retirement scenarios
- [ ] 3.2 Confirm no coordinates appear in page HTML or downloads used by pages; verify with a page-source scan

## 4. Region pages

- [ ] 4.1 Render balancing authority, state, and eGRID subregion pages; verify the record-peak, rate-guidance, and EIA rollup-check scenarios
- [ ] 4.2 Feed the grid pulse from the latest daily value; verify the pulse matches the region page

## 5. Lookup and queue

- [ ] 5.1 Build state shards, the ZIP-prefix table, and the on-device ZIP lookup with subregions; verify the request-privacy, four-digit, two-state, and two-subregion scenarios
- [ ] 5.2 Capture LBNL Queued Up's terms from the publisher's own page each refresh and let the posture decide what ships; verify the terms-not-a-recognized-license and recognized-license scenarios
- [ ] 5.3 Build the queue explorer with credit, summaries, and handoff; verify the county view and credit scenarios

## 6. Data library

- [ ] 6.1 Render library pages with versions, checksums, changelogs, and citations; verify the copied citation text and a re-downloaded checksum match
- [ ] 6.2 Serve versioned file URLs with a `latest` redirect and open CORS, and document them on the Developers page; verify the notebook scenario from a second origin and the per-file license scenario

## 7. Launch readiness

- [ ] 7.0 Serve every entity and lookup through `gridprims_query_data` from the same shards; verify 100 sampled answers match the pages

- [ ] 7.1 Run the CEII screen checklist on every dataset; verify signed checklists in the registry
- [ ] 7.2 Run budgets, 320 px sweep, no-JavaScript fact check, and accessibility on a sample of 200 entity pages; verify CI green
