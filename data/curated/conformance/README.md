# data/curated/conformance

Bill test vectors (`vectors/*.json`, one per file, in the format of [docs/formats/bill-test-vector.md](../../../docs/formats/bill-test-vector.md)) and the findings that a vector is wrong (`findings.json`: `{vector, finding, date}`).

The gate in `verify/gates/vectors.mjs` checks every vector, then runs it through the bill engine: a vector the engine misses by more than its tolerance blocks the release until the engine is fixed or a finding shows the vector is wrong. None are published yet; the first come from regulator bill tables (`add-tariff-conformance-suite` task 2.3).

Regulator ground truth (`ground-truth/*.json`) holds the typical bills a state commission published, each figure read twice by independent methods, with its page. Which commissions publish one, under what terms, and why each state is used, excluded, not yet extracted, or has no publication is in [`../conformance-publications.mjs`](../conformance-publications.mjs), one record per state and DC. The site publishes both at `/data/ground-truth/`, with the limits of these figures stated before every table and in every download.
