## Why

**Value up front:** anyone who depends on a US electricity tariff database, including us, can see how accurate it actually is: a published suite of test cases (a tariff, a load, an expected bill) that any bill calculator can run, and a reproducible scorecard measuring the open rate database against regulators' own published bill tables. Today nobody knows how wrong these numbers are, and every savings estimate in the industry rests on them.

Why this and not a rival database (`docs/research/14`):
- **We measured the staleness ourselves** in OpenEI's Utility Rate Database (URDB). Of 6,357 active residential rates, 4,961 (78.0%) have a start date before 2020, and only 164 of 2,686 utilities have one dated 2024 or later. The `approved` flag is empty on all 58,920 records, and the bulk export carries no ratchet and no holiday columns at all. URDB publishes no reliable last-updated field, so start date is what we can measure.
- **The only accuracy audit that exists anywhere** is the `ratebook` project's self-reported check of 28 tariffs, of which 3 were fully correct. No peer-reviewed study, no public test suite, and no scorecard exists for any tariff dataset.
- **Owning the corpus is already contested by better-funded parties** and is a continuous human-labor problem: roughly 150 utilities a year consumed the maintaining laboratory's entire budgeted effort, an earlier $500,000 grant-funded attempt did not move it, and Nectar has publicly committed to a CC0 tariff and rider database with page-level citations by the end of 2027, funded commercially and backed by real customer bills. A free static site cannot win that race and should not enter it.
- **But measurement is unfilled and sized for us.** State commissions (Florida's comparative rate reports, Indiana's residential bill survey, Texas's monthly reports, and Illinois's mandated 100–3,000 kWh comparisons) publish bill figures computed from the filed tariffs themselves, as free dated national ground truth that nobody has extracted. That is computation over published files: static-site native, small JSON output, client-side engine.

So we become the referee rather than the fourth registry, and the asset every corpus builder consumes instead of competing with. We emit URPX, the LF Energy tariff interchange format (v0.5.1, RDF/OWL/SHACL with JSON-LD, built with the maintaining laboratory), rather than inventing a schema, and we hand corpus maintenance to the projects doing it: URDB, `ratebook`, and Nectar. Our cross-checks use PySAM's `Utilityrate5` and REopt.jl as secondary oracles where they model the charge type, and we say where they cannot (neither models power factor or demand windows other than 15 minutes).

## What Changes

- **Bill test vectors:** a published, versioned suite of cases, each a tariff in the open interchange format, an interval or monthly load, and an expected bill broken out by line, with the provenance of the expected value and its tolerance. Any engine in any language can run it; ours runs it in CI and in the browser.
- **Regulator ground truth:** extracted bill-comparison tables from state commission publications, with every figure traced to its source document and page, as the free national reference the vectors are built from.
- **Accuracy scorecard:** a reproducible, dated measurement of the open rate database against that ground truth, published per utility and per rate with the method, the sample, and every disagreement itemized, shipping checks rather than a score.

## Capabilities

### New Capabilities

- `conformance/bill-test-vectors`: The published suite of tariff, load, and expected-bill cases.
- `conformance/regulator-ground-truth`: Extracted regulator bill tables with per-figure provenance.
- `conformance/accuracy-scorecard`: The dated, reproducible accuracy measurement and its method.

### Modified Capabilities

- `load/bill-explainer`: its verification gains the vector suite as a required gate, run by that capability.

These are declarations, not spec deltas: the requirements here state what this change must supply, the owning capability renders or runs it, and the owning change is applied first.

## Non-goals

- Maintaining a national tariff corpus, or competing with the projects that are. We consume theirs and measure it.
- Inventing a tariff schema. We emit the existing open interchange format and contribute gaps upstream instead.
- Ranking utilities, scoring vendors, or publishing a league table of databases.
- Claiming a tariff is wrong without showing the filed tariff sheet and the arithmetic.
- Holding real customer bills. Field verification uses figures a user reads off their own bill and types in, never the bill itself.
- Charging for the suite, gating it behind an account, or restricting its reuse.

## Impact

- Phase 2, per `plan-launch-and-value-proof`, and early within it: this is how the bill engine earns the validation level it will otherwise have to admit it lacks.
- Adds two datasets we own: the extracted regulator ground truth and the vector suite, both CC BY 4.0 with upstream credits carried.
- Raises `load/bill-explainer`, `load/tariff-comparison`, and `household/plan-finder` from self-checked toward cross-checked, and gives the limits page a real number to print.
