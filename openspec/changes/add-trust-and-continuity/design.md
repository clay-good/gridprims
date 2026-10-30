## Context

Practices and sources are in `docs/research/13` (verified 2026-10-29): RFC 9116 requires exactly two fields and treats a stale `Expires` as invalid; data-journalism and COPE practice converge on labeling a correction and keeping the old value readable; archive practice is a concept identifier for the series plus one per version; HIFLD Open's discontinuation is the cautionary case; realistic running cost is roughly $80–$140 a year.

## Goals / Non-Goals

**Goals:** make the four trust questions answerable from static files; make a curated fact's provenance checkable by a stranger; make the data survive the maintainer.

**Non-Goals:** process for its own sake, or promises one person cannot keep.

## Decisions

### D1. Two required fields, and an expiry that cannot rot
`security.txt` carries `Contact`, `Expires` (under one year), `Policy`, `Preferred-Languages`, and `Canonical`, and CI fails when the expiry is within 30 days, so the file cannot quietly become invalid.

| Alternative | Why not |
|---|---|
| No `security.txt` | Researchers then guess where to write, or post publicly first. |
| Add `Encryption` with a PGP key | A key one maintainer must hold, rotate, and actually read; the research found it is commonly stale and unused. |

### D2. Public archive mirror, not our own backup
Each permanent dataset version is deposited to a public research archive that mints a persistent identifier: one identifier for the series and one per version, with the version identifier used in citations. A second, independent deposit is made annually, and the source is archived to a code archive.

| Alternative | Why not |
|---|---|
| Our own object storage | Dies with the account and the card that pays for it. |
| Only the git host | Not an archive; a terms change or account closure removes it. |
| One archive | A single point of failure for the thing whose whole point is survival. |

### D3. Succession with a dead-man rule
The continuity page names successors who have agreed, states that if the maintainer is unreachable for 180 days the named successors may take over the domain and repository, and records where the archive deposits and the domain registration sit. The domain is registered well ahead of expiry.

Alternative: an informal "someone will pick it up". Rejected: that is what every abandoned public dataset assumed.

### D4. Provenance beats seniority
A curated fact ships only with a primary source URL, publisher, retrieval date, and an archive link, and a change to any published number waits out a public comment window. Where a second reviewer is not available, two independent primary sources substitute, because the point is checkability, not authority.

| Alternative | Why not |
|---|---|
| Trust a maintainer's review alone | With one maintainer, that is no review at all. |
| Block on a second human always | Nothing would ever ship; the two-source rule keeps the bar without the bottleneck. |

### D5. Publish the costs
The About page carries the actual annual running cost from invoices, and the continuity page explains what happens if it goes unpaid. Alternative: say nothing about money. Rejected: "who pays for this, and what happens when they stop" is the first question a careful reader asks of a free public utility.

### D6. Corrections live with the trust pages
Correction tiers and the keep-the-old-value rule are written into `site/trust-pages` in `add-site-experience` rather than duplicated here, so one capability owns the corrections log. Alternative: a `trust/corrections` capability here. Rejected: two owners for one page.

## Risks / Trade-offs

- **Safe harbour wording is a legal statement.** Mitigation: use plain language, keep scope narrow, and say it is not legal advice.
- **A comment window slows urgent fixes.** Mitigation: a correction that removes a wrong number may ship at once; the window applies to changing a number to a new claimed value.
- **Named successors may lapse.** Mitigation: the continuity page carries a yearly re-confirmation date and CI flags it when stale.
