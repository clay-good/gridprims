## Context

Formulas, free sources, test vectors, and benchmarking evidence are in `docs/research/11` (verified 2026-10-29). The current edition of the indices standard is paywalled at $74 to $147 and is never quoted here. The federal form's instructions give the sustained-interruption index formulas in the public domain; a free published utility-engineering deck gives the remaining indices and every step of the major-event-day threshold, and a free national-association reference guide gives the threshold's design intent and its failure mode. Two published worked examples were found to be arithmetically wrong on recomputation and are recorded as unusable.

## Goals / Non-Goals

**Goals:** compute what a utility must report, show every exclusion, and make peer comparison honest.

**Non-Goals:** ranking utilities; momentary indices the data cannot support; anything feeder-specific that leaves the device.

## Decisions

### D1. Implement from the free sources, cite them, buy nothing
Sustained-interruption indices are implemented from the federal form's public-domain instructions. The remaining indices and the major-event-day threshold are implemented from the free published deck and reference guide, cited by document, author, and date. The paywalled standard is named as the origin of the method without being quoted.

Alternative: buy the standard. Rejected: the formulas are available free and citable, and its annex examples could not be reproduced anyway.

### D2. Indices that need per-customer records ship disabled
Indices counting how many times each individual customer was interrupted need per-customer interruption records. Typical outage-management exports carry per-event customer counts only, so these indices are shown as unavailable with the reason and the data they would need, never approximated from event counts.

| Alternative | Why not |
|---|---|
| Estimate them from event counts | Produces a number that looks like the index and is not; the error is invisible to the user. |
| Omit them silently | The engineer wonders whether we forgot, and goes back to the spreadsheet. |

### D3. The sustained-interruption threshold is the form's, and it is stated
Interruptions longer than five minutes are sustained, matching the federal form's definition, and the receipt states the threshold and how many logged events fell below it. The user may change the threshold for their own state's rule, which relabels every result.

| Alternative | Why not |
|---|---|
| Fix five minutes with no override | Several states define sustained differently, and the engineer would have to leave for a spreadsheet. |
| Infer the threshold from the log's shape | An invented threshold would silently change every index. |

### D4. The major-event-day threshold, with its failure mode on the face of it
The threshold is computed as the published method states: take each day's duration index, use only days with interruption activity, take natural logarithms, compute the mean and standard deviation, and set the threshold at the exponential of the mean plus two and a half standard deviations, from five years of history, applied to the following year. Because the method assumes the daily values are log-normally distributed and a small utility's often are not, the tool runs a distribution check and warns when the assumption fails.

No free source states a minimum number of days for the method, so the tool sets its own floor, discloses it, and says it is ours rather than the standard's.

Alternative: apply the threshold without a distribution check. Rejected: the free reference guide names exactly this as when the method is unsound, and small utilities are our audience.

### D5. Cohort, then percentile, never a ratio to the national average
Peer comparison cohorts on ownership type first (medians run about 58, 205, and 232 minutes for municipal, investor-owned, and co-op utilities, a four-fold spread), then customer-count size class, then state or census division, and reports a percentile within the cohort. Two comparisons are refused outright: a figure including major events against one excluding them, and a filer using the standard method against one using a self-declared method, unless both labels are shown.

| Alternative | Why not |
|---|---|
| Compare with the national average | A rural co-op looks terrible against a number dominated by dense urban systems. |
| A single national league table | Invites a ranking we cannot defend and that the data's method differences make meaningless. |

### D6. The federal form sheet is a transcription aid, not a filing
The sheet shows each computed index against the form's line, with the instruction text beside it, for the engineer to copy. gridprims never submits anything, and the sheet says the filer is responsible for what they file.

| Alternative | Why not |
|---|---|
| Generate the filing file itself | Format and portal change yearly, and a bad file filed in our name is the filer's problem to unwind. |
| Only show indices, no form mapping | Leaves the annual chore exactly where it was; the mapping is most of the value. |

### D7. Outage logs stay on the device, and feeder detail stays out of links
Outage logs go through the existing file intake, so nothing is uploaded. Feeder and device breakdowns are offered on screen for the engineer's own use but are never encoded in a URL, never included in a copied result card, and never part of a saved report by default, because aggregated feeder outage history edges toward protected infrastructure information. Results covering fewer than a disclosed minimum number of customers are suppressed.

| Alternative | Why not |
|---|---|
| Allow feeder detail in share links | An aggregated feeder outage history in a shareable URL is the protected-infrastructure risk, and it would leave the device. |
| Omit feeder breakdowns entirely | They are the engineer's main diagnostic use; keeping them local satisfies both needs. |

## Risks / Trade-offs

- **Outage log formats vary by vendor.** Mitigation: a mapping step on the receipt, like the interval-file receipt, with fixtures for the common export shapes and a plain error when a required field is missing.
- **A utility may dislike its percentile.** Mitigation: the figure is the utility's own reported number, the cohort and method are shown, and no ranking or judgement is published.
- **Published examples are unreliable.** Mitigation: the one verified daily-table vector is the regression fixture; the two bad published examples are recorded as not usable, with the recomputed values.
