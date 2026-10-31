# Rate base from FERC Form 1

The revenue requirement explainer (`ratepayer.revenue-requirement.explain`) can start from a utility's FERC Form 1 figures, through PUDL's `pudl-ferc1` dataset. Every prefilled figure is **total-company** for the Form 1 respondent, its electric side only, and is labeled "approximate, from Form 1".

| Explainer input | Form 1 figure (PUDL) | Note |
|---|---|---|
| Operation and maintenance | `operation_expense` + `maintenance_expense` (income statement, schedule 114) | Includes purchased power and fuel, which most rate cases pass through separately |
| Depreciation | `depreciation_expense` + `amortization_and_depletion_of_utility_plant` | |
| Taxes other than income | `taxes_other_than_income_taxes_utility_operating_income` | |
| Rate base | PUDL's `out_ferc1__yearly_rate_base`, electric rows, summed | Plant in service net of accumulated depreciation, minus net accumulated deferred income taxes (ADIT), plus net working capital, plus other deferred debits and credits and regulatory assets, as PUDL's rate-base derivation assigns them |

The rate base is shown with its lines: net ADIT, net working capital, and net plant and other items, each with the filing year.

A commission sets rate base for one state's customers, on its own adjustments, so a Form 1 figure is a starting point, not the case's number. A utility that does not file Form 1 (most co-ops and municipal utilities) starts with empty fields.

The snapshot is checked against figures computed independently from PUDL's files for three utilities, in `verify/reference/pudl-v2026.10.0-ferc1.json`.
