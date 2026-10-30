## Why

**Value up front:** a researcher, reporter, or commission staffer can see at a glance which US public energy datasets are current, which are late, which quietly changed their history, and which have gone away, each with the date, the authoritative notice, and an archived copy. Today that status exists nowhere, for any energy dataset, and people discover a gap only when their own analysis breaks.

Why we are the ones to do it (`docs/research/16`):
- **Nobody publishes this.** The one body chartered to review the federal energy statistical agency has no public meeting record for years, and the agency has no "changes to data" page at all. The open data project that runs hundreds of validation tests publishes none of them as a report. Archives preserve files; trackers record political actions; nothing records, per dataset, its expected cadence, its last actual vintage, how late it is, the notice that says so, whether its URL still resolves, and where the archived copy sits.
- **The continuity shock is real and dated.** The American Statistical Association rates EIA weak on resources after roughly a 35% staffing loss since the 2024 fiscal year; EPA's eGRID is still at its 2023 edition with the next about ten months late and its stated release month quietly deleted from the page; `nrel.gov` no longer resolves after the laboratory's rename; and several federal energy data pages now return errors.
- **The errors are quantified only in the literature.** A published study of hourly grid data found 2.16% of hours missing and 2.64% flagged for imputation, with one balancing authority missing a third of its hours. The agency itself acknowledges a gap between two of its own datasets without publishing a single number.
- **It is nearly free for us.** We already snapshot every dataset with checksums, as-of dates, and archived raw inputs. The ledger is the public form of what our own release process computes anyway.

We follow the precedent of the clinical-trials and prescribing trackers that earned trust: conservative rules that under-claim, open code, a correction inbox, agency replies published inline, and checks rather than scores. We deliberately do not build an index, a grade, or a ranking.

## What Changes

- **Continuity ledger:** one row per dataset with its expected cadence, last actual vintage, published next-release date, days late, the authoritative notice, canonical URL and its current status, and the archive identifier, published as a page and as JSON — plus rows for our own automation, so a stalled pipeline is visible to anyone rather than only in CI logs.
- **Snapshot diffs:** the public form of our own release computation: files added, removed, or changed; columns added or dropped; row-count deltas; checksums; and how much published history moved between releases.
- **Consistency checks:** a small set of arithmetic identities the publishers themselves assert, measured and published, starting with the hourly interchange identity that nobody has ever quantified, plus reliability reporting coverage and the liveness of every URL we cite.

## Capabilities

### New Capabilities

- `ledger/continuity`: Per-dataset cadence, vintage, lateness, notice, URL status, and archive identifier. (Distinct from the project's own continuity page in `trust/data-continuity`, which covers how anyone revives gridprims; this covers the status of the datasets we republish.)
- `ledger/snapshot-diffs`: What changed between releases, including revisions to published history.
- `ledger/consistency-checks`: Publisher-asserted identities measured and published as checks.

### Modified Capabilities

- `data/data-library`: each dataset page gains its ledger row and diff history, rendered by that capability.

These are declarations, not spec deltas: the requirements here state what this change must supply, the owning capability renders it, and the owning change is applied first.

## Non-goals

- A quality index, score, grade, ranking, or league table of agencies or datasets.
- Attributing lateness or error to any person, administration, or political cause. We publish the measurement and the notice; readers draw conclusions.
- Replacing or second-guessing a publisher's own corrections; we report, link, and publish their reply.
- Archiving the world. We deposit what we already snapshot and link the archives that do the rest.
- Loss-of-load or reliability adequacy figures, or any derived metric whose inputs are confidential.
- Presenting a dataset as untrustworthy. Most of the core electricity data is on time, and the ledger must say so.

## Impact

- Phase 2, per `plan-launch-and-value-proof`, with the snapshot diff log in phase 1 because the foundation's release process already computes it.
- Adds no new upstream dataset; it publishes measurements over the datasets we already hold, as a dataset we own under CC BY 4.0.
- Gives the limits page its staleness and known-problem rows, and gives every citation of ours a dated provenance a journal or a commission can rely on.
