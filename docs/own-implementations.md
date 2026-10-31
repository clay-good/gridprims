# Own implementations

Each module here replaces what would usually be a package. Each has its own tests in `verify/tests/` and is listed with its scope and known limits. The own-implementations gate (`verify/gates/own-implementations.mjs`) fails when a general-purpose module under `parsers/`, `core/lib/`, `verify/lib/`, `site/lib/`, or `pipeline/lib/` has no entry.

| Module | Replaces | Scope | Known limits |
|---|---|---|---|
| `core/lib/precision.mjs` | number-formatting libraries | Significant figures from typed text, rounding, US-style display through `Intl.NumberFormat` | Whole numbers with trailing zeros are read as not significant ("400" carries 1) |
| `verify/lib/walk.mjs` | glob libraries | Recursive file listing and Markdown table reading for the gates | Reads only tables whose first cell is backticked |
| `verify/lib/examples.mjs` | test-vector runners | Runs every manifest's worked examples within their tolerances | Numeric outputs only |
