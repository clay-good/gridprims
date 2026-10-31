# verify/fixtures

Committed fixture data, so every test runs offline from a fresh clone.

| Path | What |
|---|---|
| `intake/make.mjs` | The intake fixture library's generator: 21 synthetic files shaped like real utility exports, each with its expected receipt facts |
| `intake/files/` | The generated files (the intake test fails if they drift from the generator) |
| `xlsx/workbooks.mjs` | Ten workbook shapes for the `.xlsx` reader |
| `mcp/` | Recorded MCP request and response pairs for each protocol version |

| `data/eia-861/workbook.mjs` | A small workbook shaped exactly like EIA-861's Sales_Ult_Cust sheet, for offline pipeline tests |
| `data/eia-861/withheld.json` | The real 2025 file's three Withheld rows, pinning the withheld-respondents quirk |
| `results/` | Each tool's worked-example results, snapshotted with its version |

Phase 0 builds one real dataset, EIA-861 (2025 final), committed in full under `data/eia-861/`, so every phase-0 example runs offline from a fresh clone. The full fixture subset in foundation design D11 (three states, three balancing authorities, one year, across every launch dataset) is a phase-1 exit item.
