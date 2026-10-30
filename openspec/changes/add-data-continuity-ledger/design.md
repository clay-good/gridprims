## Context

Evidence, precedents, and the quantified errors are in `docs/research/16` (verified 2026-10-29). Two findings shape the design: the gap is status rather than bytes, since archives already preserve files but nothing records per-dataset cadence and lateness; and the credible precedents all ship conservative checks with open code and a correction inbox, while the cautionary precedent is a single composite index that became a weapon. One more constraint: the core electricity data we depend on is currently on time, and a ledger that implies otherwise would be both wrong and self-defeating.

## Goals / Non-Goals

**Goals:** make dataset status checkable; publish identities nobody has measured; stay useful to the publishers.

**Non-Goals:** scoring, ranking, blaming, or archiving everything.

## Decisions

### D1. Checks, never a score
Every output is a measured quantity or a status with its source. No composite index, no grade, no ranking. Where a comparison across datasets is useful, it is shown as a distribution or a group, not an ordering.

| Alternative | Why not |
|---|---|
| A single data-quality index per dataset | The cautionary precedent: a composite gets quoted as a verdict, hides which check failed, and becomes a weapon. |
| Ranking agencies | Punishes a staffing cut as if it were a choice, and burns the relationship with publishers we depend on. |

### D2. Lateness is measured against the publisher's own posted date, and marked when inferred
A dataset is late only against a date the publisher posted, cited. Where no date is posted, lateness is computed from the historical cadence and labeled inferred, with the cadence shown. A grace period of 30 days applies before anything is called late.

| Alternative | Why not |
|---|---|
| Call anything past its historical cadence late | Publishers reschedule for legitimate reasons; an unposted date is not a broken promise. |
| Only report posted dates | The most important case, a promise silently deleted from a page, would vanish from the ledger. |

### D3. Notify first, publish the reply inline
Before a dataset's first "late" or a first published consistency finding, the publisher is notified through their own contact channel, with the date recorded. Any reply is published inline beside the finding, unedited. A finding is not withheld for lack of a reply.

Alternative: publish without notice. Rejected: the precedents that earned standing all notified first, and a publisher's explanation is usually the most useful thing on the row.

### D4. The interchange identity is the flagship check
The hourly grid data asserts that interchange between two balancing authorities nets to zero, and that the pairs sum to the reported total. Both are computable from the published files and neither has ever been published. We measure them per pair, per balancing authority, and per year, in energy and percent, and state plainly that an imbalance is a reporting inconsistency rather than physics.

Alternative for D4: report only the per-balancing-authority total mismatch. Rejected: the pairwise residual localizes the disagreement to the two reporters, which is what makes it actionable for the publisher.
Published history moves for good reasons. We report how often and by how much, as a distribution per dataset and period, with the publisher's own revision policy linked, and never describe a revision as an error.

Alternative for D5: flag large revisions as suspected errors. Rejected: a revision is usually better data arriving, and mislabeling it would make the ledger adversarial for no gain.

### D6. We measure ourselves too
Our own snapshots, derived tables, and link citations are in the ledger on the same terms: our lateness, our diffs, our broken links, our corrections. A monitor exempt from its own checks has no standing.

Alternative for D6: exempt ourselves as the measurer. Rejected: a monitor that excludes itself invites exactly the charge that discredits it.

### D7. Conservative to a fault
Where a check could be read two ways, it reports the reading least damaging to the publisher and names the ambiguity. Where coverage is incomplete, the row says so rather than extrapolating. Where a finding depends on an unverified reading, it is not published.

Alternative: report the strongest defensible reading. Rejected: one overstated finding would cost the standing that makes every other finding useful.

### D8. Framed as something the publishers can use
The page states that external evidence of strain is useful to an agency arguing for its own resources, and offers the measurements for that purpose. The tone is a colleague's, not a critic's.

Alternative for D8: a neutral, impersonal tone. Rejected: the precedents that survived were explicitly useful to the bodies they measured, and a monitor with no constituency gets defunded or ignored.

## Risks / Trade-offs

- **The publisher we depend on could read this as hostile.** Mitigation: D3's notice, D8's framing, our own data in the same table, the on-time majority stated prominently, and no rankings.
- **A monitor that dies is worse than none.** Mitigation: it is computed as a byproduct of our existing release process, so it costs almost nothing to keep running, and the continuity plan covers it like any other dataset.
- **Findings may be quoted as proof of untrustworthiness.** Mitigation: every row carries the publisher's notice and reply, the on-time share is published, and the page says plainly what a residual does and does not mean.
- **Revisions could be misread as errors.** Mitigation: D5's wording and the linked revision policy.
