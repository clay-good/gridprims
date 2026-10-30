## Context

Measurements, competing efforts, schema status, and ground-truth sources are in `docs/research/14` (verified 2026-10-29, including a direct analysis of all 58,920 records in the open database's bulk export). Three things changed in 2026 that shape this: LF Energy published URPX (v0.5.1), an open tariff interchange format with SHACL structural validation and regulatory versioning, built with the laboratory that maintains URDB; the `ratebook` project (Apache-2.0 engine, CC0 data) already ships shared cross-language bill vectors with PySAM as a test oracle; and Nectar has publicly committed to the full open corpus by the end of 2027. The honest conclusion is that the corpus is contested and the measurement is not.

## Goals / Non-Goals

**Goals:** a suite anyone can run, ground truth anyone can check, and a number where there is currently none.

**Non-Goals:** owning the corpus; inventing a schema; scoring anyone.

## Decisions

### D1. Referee, not registry
We publish the measurement and the test suite; we consume whichever corpus is best. Our own tariff records stay limited to what our tools need, and every gap we find is reported upstream rather than forked.

| Alternative | Why not |
|---|---|
| Build the canonical corpus | Continuous human labor a static site cannot sustain; two better-funded parties are already at it with data we cannot hold. |
| Fork the open database and maintain our copy | Doubles the staleness problem and splits the community's effort. |
| Do nothing and inherit the errors silently | Every savings figure we publish would carry an unmeasured error we had the means to measure. |

### D2. Emit URPX
Tariff records are emitted in URPX (LF Energy, v0.5.1), with its SHACL structural validation run in CI. Where it cannot express something our engine needs, we record the gap, implement an extension in a clearly namespaced field, and file it upstream.

Alternative: our own schema. Rejected: it would be strictly worse than a format designed with a national laboratory, and it would isolate the vectors from everyone who could use them.

### D3. Ground truth comes from regulators, extracted with per-figure provenance
Expected bills come first from state commission bill-comparison publications, which commissions compute from the filed tariffs. Every extracted figure records the document, its date, the page, the utility, and the consumption level, and extraction is reviewed under the curated-contribution rules.

| Alternative | Why not |
|---|---|
| Generate expected bills with our own engine | Circular: the suite would prove only that we agree with ourselves. |
| Use a third-party engine as the oracle | Useful as a cross-check, but it inherits the same database's gaps and cannot model ratchets, holidays, or power factor. |
| Collect real customer bills | The one thing a site that never receives user data cannot do. |

### D4. Honest about what the ground truth proves
Regulator tables cover flat residential consumption levels. They prove energy and fixed charges at a few points, and prove nothing about time-of-use, demand charges, ratchets, holidays, or power factor. Each vector records which charge types it exercises, and the scorecard reports coverage by charge type so nobody reads a residential result as a commercial one.

Alternative for D4: present the regulator figures as general-purpose accuracy evidence. Rejected: they cover a few residential consumption points, so quoting them as evidence about demand or time-of-use tariffs would overstate exactly where tariff engines most often fail.

### D5. Checks, not scores
The scorecard publishes per-utility and per-rate disagreements with the arithmetic and the source, counts by disagreement type, and the share of rates it could test at all. It publishes no composite index, no ranking of databases or utilities, and no grade. A disagreement is reported as a disagreement, with both numbers and both sources, until someone resolves it.

| Alternative | Why not |
|---|---|
| A single accuracy score per database | Invites exactly the misuse that composite indices get, and hides which charge types fail. |
| Rank utilities by tariff data quality | The utility did not write the database entry; the ranking would punish the wrong party. |

### D6. A disagreement is a question, not an accusation
Every disagreement entry names the filed tariff sheet, our arithmetic, the regulator's figure, and the database's figure, and invites correction. Confirmed database errors are reported upstream through the maintainer's own process before we publish them as errors, with the report date recorded.

Alternative for D6: publish disagreements as database errors immediately. Rejected: in a sample of our own early checks the filed tariff sometimes vindicated the database, and an accusation retracted later costs more standing than a question answered slowly.

### D7. The suite is the gate for our own engine
Our bill engine runs the whole suite in CI, and a failure blocks release. We are the first subject of our own measurement, and our own failures are published in the same table as anyone else's.

Alternative for D7: exempt our own engine from the suite while it matures. Rejected: the suite's whole claim is that a bill engine's correctness should be checkable, and exempting ours would make the scorecard advocacy rather than measurement.

## Risks / Trade-offs

- **Extraction from published documents is laborious and error-prone.** Mitigation: per-figure provenance, two-source or second-reviewer rules, and a published extraction error rate from a hand-checked sample.
- **We may be wrong and the database right.** Mitigation: D6's wording, upstream reporting first, and our own engine subject to the same suite.
- **Coverage will look thin at first.** Mitigation: publish coverage as a first-class number rather than hiding behind a headline accuracy figure.
- **Upstream projects may see us as competing.** Mitigation: emit their format, consume their corpus, credit them, and file every gap we find.
