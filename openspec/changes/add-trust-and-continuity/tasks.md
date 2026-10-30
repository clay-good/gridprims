## 1. Security disclosure (phase 0)

- [ ] 1.1 Publish `/.well-known/security.txt` with the RFC 9116 fields and the right content type; verify the fields-present scenario against the deployed URL
- [ ] 1.2 Add the expiry check to CI; verify it fails at a 20-day fixture expiry
- [ ] 1.3 Write the disclosure policy page with scope, safe harbor, and the 5-day and 90-day targets; verify the out-of-scope scenario wording
- [ ] 1.4 Add security fixes to the changelog flow with optional reporter credit; verify the reporter-credit scenario

## 2. Curated contributions (phase 0, before the first curated dataset)

- [ ] 2.1 Add provenance fields (source URL, publisher, retrieval date, archive link) to every curated schema; verify the secondary-source and missing-archive scenarios
- [ ] 2.2 Implement the review-route field and the two-source rule; verify a record publishes by either route and not without one
- [ ] 2.3 Add the 7-day comment window to the change process with the corrections feed announcement; verify the correcting-upward and urgent-removal scenarios
- [ ] 2.4 Add the conflict-of-interest question to the contribution template; verify it is recorded on the record
- [ ] 2.5 Implement the bulk-batch label and revert path; verify the 60-guide scenario and that a bulk batch cannot change a published number

## 3. Data continuity (phase 1)

- [ ] 3.1 Add the archive deposit to the release process with series and version identifiers shown in the library; verify the citation and archive-pending scenarios
- [ ] 3.2 Add the second annual archive deposit and source-code archiving; verify the overdue scenario at a 13-month fixture
- [ ] 3.3 Publish running costs on About from invoices; verify the figure carries its date and source
- [ ] 3.4 Publish the continuity page with the revival steps, archive identifiers, release tags, runtime, build command, and per-dataset upstream terms; verify the revival-steps, maintainer-unreachable, and no-permission scenarios
- [ ] 3.5 Run the yearly restore test from archives alone; verify checksums match the published digests and the result is recorded
- [ ] 3.6 Run DESIGN.md gates on the disclosure policy, continuity, and costs pages (both themes, 320 px sweep, keyboard pass, print); verify CI green
