# verify/fixtures

Committed fixture data, so every test runs offline from a fresh clone.

| Path | What |
|---|---|
| `intake/make.mjs` | The intake fixture library's generator: 21 synthetic files shaped like real utility exports, each with its expected receipt facts |
| `intake/files/` | The generated files (the intake test fails if they drift from the generator) |
| `xlsx/workbooks.mjs` | Ten workbook shapes for the `.xlsx` reader |
| `mcp/` | Recorded MCP request and response pairs for each protocol version |

The phase-0 EIA-861 subset (foundation task 1.6) is not here yet.
