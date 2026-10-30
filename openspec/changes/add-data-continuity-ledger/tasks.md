## 1. Continuity ledger

- [ ] 1.1 Define the ledger row schema and generate rows from the dataset registry and release records; verify the row-fields and posted-versus-inferred scenarios
- [ ] 1.2 Implement the 30-day grace period and the due-versus-late distinction; verify the within-grace scenario
- [ ] 1.3 Capture posted release dates each check and record changes with archived copies; verify the promise-removed scenario
- [ ] 1.4 Implement the standing invitation to reply with inline published replies and no pre-publication step; verify the reply-published and nothing-is-held-back scenarios
- [ ] 1.5 Publish the on-time counts above the table; verify the mostly-current scenario
- [ ] 1.6 Handle discontinued and moved datasets; verify the discontinued scenario
- [ ] 1.7 Include our own datasets on the same terms; verify the our-lateness scenario
- [ ] 1.8 Implement weekly link-liveness checks over every cited URL; verify the dead-citation scenario
- [ ] 1.9 Publish the page and the JSON and serve both to the MCP server; verify the machine-readable scenario
- [ ] 1.10 Publish the automation's own health rows (last successful run per workflow and per dataset, enabled state, disable and re-enable events, last deposit and restore test) with view-time ageing; verify the automation-rows, pipeline-stalled, stale-ledger, and host-disabled scenarios

## 2. Snapshot diffs (phase 1, from the foundation's release process)

- [ ] 2.1 Publish per-version diffs of files, columns, row counts, and keyed row changes; verify the column-dropped and largest-changes scenarios
- [ ] 2.2 Implement revision reporting with magnitude distributions and neutral wording; verify the history-revised and neutral-wording scenarios
- [ ] 2.3 Keep every version's diff at a stable URL linked from the library and the ledger; verify the historical-diff scenario
- [ ] 2.4 On a breaking change to a depended-on column or unit, pin the dataset to its last good snapshot, publish with that pin shown, and open an issue, without failing the build or blocking other datasets or the deploy; verify the breaking-change scenario
- [ ] 2.5 Publish diffs as JSON with both versions and checksums; verify the diff-JSON scenario

## 3. Consistency checks

- [ ] 3.1 Implement the pair and total interchange residuals with hours tested and unavailable; verify the pair-residual and what-a-residual-means scenarios
- [ ] 3.2 Implement the reliability coverage and missing-field share tables; verify both scenarios
- [ ] 3.3 Implement the conservative-reading rule; verify the ambiguous-identity scenario
- [ ] 3.4 Keep checks individual with no composite; verify the no-index scenario
- [ ] 3.5 Publish each check's method, versions, and results as files; verify an independent rerun reproduces them
- [ ] 3.6 Publish the deferred-checks list with reasons; verify the deferred-reconciliation scenario
- [ ] 3.7 Cite the publisher's own documentation for every identity tested; verify the identity-cited scenario

## 4. Surfaces

- [ ] 4.1 Add ledger rows and diff history to each data library page; verify they match the ledger
- [ ] 4.2 Feed the limits page's staleness and known-problem rows from the ledger; verify the late-dataset scenario there
- [ ] 4.3 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
