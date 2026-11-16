# data/curated/conformance

Bill test vectors (`vectors/*.json`, one per file, in the format of [docs/formats/bill-test-vector.md](../../../docs/formats/bill-test-vector.md)) and the findings that a vector is wrong (`findings.json`: `{vector, finding, date}`).

The gate in `verify/gates/vectors.mjs` checks every vector, then runs it through the bill engine: a vector the engine misses by more than its tolerance blocks the release until the engine is fixed or a finding shows the vector is wrong. None are published yet; the first come from regulator bill tables (`add-tariff-conformance-suite` task 2.3).
