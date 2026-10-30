## Context

Licenses, file names, and 2026 status are in `docs/research/13` (verified 2026-10-29), with two open items it names: the community solar dataset's license is taken from catalog records and must be re-read on the publisher's own landing page, and the federal transmission geometry dataset is a separate deferred question. The hosting-capacity question is resolved against a later, more specific check: `docs/research/13` found a federal index and recommended linking it, while `docs/research/12`, opening the pages directly the same day, found it unmaintained and partly unresolvable. We link it with that condition stated, and the dated per-utility directory that we do maintain lives in `add-interconnection-screens`.

## Goals / Non-Goals

**Goals:** cited, dated answers to three common questions at near-zero data cost; a visible, honest list of what we do not build.

**Non-Goals:** policy text, eligibility rulings, or any map we would have to maintain.

## Decisions

### D1. Quantities from the federal file, rules by link
Capacity, customers, and energy come from the federal utility survey's net metering and distributed generation files. The rules themselves (what a state allows, caps, successor tariffs) are linked to the state's own commission and to the policy database, never restated as our text.

| Alternative | Why not |
|---|---|
| Copy the policy database's rule summaries | Its share-alike license would spread to anything we publish beside it, and the rules change faster than we could track. |
| Write our own 50-state rule summaries | A standing accuracy liability with one maintainer, and the first thing a reader should check against the regulator anyway. |

### D2. Pending projects are a market estimate, not a registry
The community solar dataset distinguishes operating from pending projects. Operating counts are reported; pending counts come from market tracking and change without notice, so every pending figure carries that label and is never summed with operating capacity into one headline number.

| Alternative | Why not |
|---|---|
| Publish one combined capacity figure | It would be quoted as built capacity and would be wrong in every state with a large pipeline. |
| Drop pending projects entirely | The pipeline is the question people actually ask; labeling it is better than hiding it. |

### D3. The qualifying-facility page is a checklist, never a determination
It describes who the certification applies to, the size thresholds, the fee-free self-certification path, the form's questions in our own words, and where to file. It computes nothing, offers no efficiency or fuel-use test, and says the filer and the regulator decide.

Alternative: a calculator that tests the operating and efficiency standards. Rejected: the result would read as an eligibility ruling, which is exactly the thing we must not give.

### D4. The link index is a dated dataset, not a blogroll
Every entry in the index records what the thing is, who maintains it, what it covers, what it costs, when we last checked it, and why we link rather than rebuild. CI checks the links resolve. It is the visible form of the "link, don't rebuild" rule.

Alternative: scatter links across pages only. Rejected: nobody can audit the promise, and dead links accumulate invisibly.

### D5. The license is captured automatically, and the posture decides
The pipeline fetches the publisher's own landing page on each refresh, records its terms text and the date, and `platform/data-snapshots` derives the posture from that. Catalog metadata has already been wrong about this publisher once, so it is never the basis on its own; but an unrecognized license downgrades what we publish rather than stopping the build, so the pages always ship in some form.

| Alternative | Why not |
|---|---|
| Block the pages until a person confirms the license | A human gate that stalls indefinitely, on a project with one maintainer, for a page that could have shipped as our own aggregates all along. |
| Ship the file on the catalog record's license field | Catalog metadata was wrong about this publisher once already. |
| Drop the pages entirely while the license is unclear | Throws away the state-level facts, which we may compute and publish whatever the file's terms turn out to be. |

## Risks / Trade-offs

- **The community solar license may turn out to be restrictive.** Mitigation: D5 gates the build; if it fails, the pages become a link and the state fact pages drop that section.
- **Net metering data lags by about a year.** Mitigation: the as-of date and staleness note that every dataset already carries.
- **A checklist can still be read as advice.** Mitigation: no computation, a plain statement of who decides, and links to the form and the regulation.
