# Community solar

Used by the `nlr-sharing-the-sun` dataset and the community solar section of state pages (add-program-fact-pages).

**What it gives you:** how much community solar serves customers in your state, and how much the laboratory tracks as coming, kept apart.

## Source and posture

NLR's Sharing the Sun project list, September 2026 ([doi:10.7799/2438583](https://doi.org/10.7799/2438583)). Catalog records call it CC BY 4.0, but the publisher's own license page says otherwise. It grants use and copying with the notice in every copy, and it bars use of the laboratory's name to endorse anything "unless specific written permission is obtained." The license matcher reads that clause as restrictive and sets the posture to **derive**. That decision is automatic: no person confirms or overrides it. So we publish only our own sums by state, with the credit and a link, and never a copy of the project list.

## What we compute

| Table | What |
|---|---|
| `state_projects` | Projects serving customers and their MW-AC, by state and by who markets the subscriptions |
| `state_years` | MW-AC serving customers by state and year of interconnection |
| `state_queue` | The "In Queue" MW-AC from the laboratory's State Summary (awarded, under construction, or likely soon), key states only, with no project count |

Capacity in queue is never added to capacity serving customers, in any figure.

## Checked against

The laboratory's own State Summary (`verify/reference/nlr-sts-summary-2026-09.json`, read with openpyxl). Every state's capacity, in every year of interconnection, matches our sums, and so does every state's total but one.

| Known difference | Size | Why |
|---|---|---|
| `ME-total` | 0.0033 MW | The summary's Maine total leaves out its own 2003 figure (0.0033 MW); the year column and our sum include it. |

States the summary marks with an asterisk (AR, GA, TX) "include solar projects with partial community solar capacity." Their figures match once the asterisk is dropped from the name.

The summary publishes capacity only, so project counts cannot be checked against it.
