## 1. Security disclosure (phase 0)

- [x] 1.1 Publish `/.well-known/security.txt` with the RFC 9116 fields and the right content type; verify the fields-present scenario against the deployed URL
- [x] 1.2 Generate the expiry as eleven months from the build date with a CI guard; verify the expiry-regenerated and generator-broken scenarios
- [x] 1.3 Write the disclosure policy page with scope, safe harbor, and the 5-day and 90-day targets; verify the out-of-scope scenario wording
- [x] 1.4 Add security fixes to the changelog flow with optional reporter credit; verify the reporter-credit scenario

## 2. Curated contributions (phase 0, before the first curated dataset)

- [x] 2.1 Add provenance fields (source URL, publisher, retrieval date, committed capture and its checksum) to every curated schema; verify the secondary-source and stored-capture scenarios
- [x] 2.2 Implement the two-source rule as an automatic data check, with the single-source label where a second primary source is recorded unreachable; verify the two-sources, only-one-source, and unreachable-second-source scenarios and that no human review step or review-route field exists
- [x] 2.3 Publish changed numbers immediately with the old value kept visible and a comment thread open at least 30 days after; verify the correcting-upward and urgent-removal scenarios
- [x] 2.4 Add the conflict-of-interest question to the contribution template; verify it is recorded on the record
- [x] 2.5 Implement the bulk-batch label and revert path; verify the 60-guide scenario and that a bulk batch cannot change a published number

## 3. Data continuity (phase 1)

- [ ] 3.1 Deposit to the archive from the pipeline on the run that cuts a version, with series and version identifiers shown in the library and retry on the next schedule; verify the citation, deposit-is-part-of-the-run, and archive-without-an-interface scenarios
- [ ] 3.2 Add the second annual archive deposit and source-code archiving where an interface exists, with a sandbox canary for the primary archive and bundling to its per-record file limit; verify the overdue, no-interface, bundled, and canary scenarios
- [ ] 3.3 Publish running costs on About from invoices; verify the figure carries its date and source
- [ ] 3.4 Publish the continuity page with the revival steps, archive identifiers, release tags, runtime, build command, and per-dataset upstream terms; verify the revival-steps, maintainer-unreachable, and no-permission scenarios (the steps, runtime, build command, licenses, the no-handover statement, and each dataset's own terms and source file are published and tested; the research-archive identifiers wait on the deposits in 3.1)
- [ ] 3.5 Run the scheduled yearly restore test from archives alone in CI; verify checksums match the published digests and the result is published on the continuity page
- [ ] 3.6 Run DESIGN.md gates on the disclosure policy, continuity, and costs pages (both themes, 320 px sweep, keyboard pass, print); verify CI green
