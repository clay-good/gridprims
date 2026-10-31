# Reference artifacts

Third-party files we read or compare against but never execute (`platform/zero-dependency`): self-hosted fonts, published schemas, and stored reference outputs from other engines. The dependency gate fails on any font file, or any file under `verify/reference/` or `site/fonts/`, that is not listed here with a matching SHA-256.

| Path | Source | License | Version | SHA-256 |
|---|---|---|---|---|
| `verify/reference/mcp/schema-2026-07-28.json` | MCP JSON schema 2026-07-28, `modelcontextprotocol/modelcontextprotocol` `schema/2026-07-28/schema.json` at commit `68619e4e8bb7ae11f1aa3872a27ee06f352b9d28`, retrieved 2026-10-30 | Apache-2.0 (contributions not yet relicensed remain MIT) | 2026-07-28 | ef70b61f99b6d2e5e3b46863822eab08dff6a45bedc7a08914e0e5b133f40203 |
| `verify/reference/mcp/schema-2025-11-25.json` | MCP JSON schema 2025-11-25, `modelcontextprotocol/modelcontextprotocol` `schema/2025-11-25/schema.json` at commit `68619e4e8bb7ae11f1aa3872a27ee06f352b9d28`, retrieved 2026-10-30 | Apache-2.0 (contributions not yet relicensed remain MIT) | 2025-11-25 | 268a5f82ba70fd7e4b6dc4aa1e64f116f74b4d0edcb69dc046829c79dd4e97e7 |
| `verify/reference/mcp/schema-2025-06-18.json` | MCP JSON schema 2025-06-18, `modelcontextprotocol/modelcontextprotocol` `schema/2025-06-18/schema.json` at commit `68619e4e8bb7ae11f1aa3872a27ee06f352b9d28`, retrieved 2026-10-30 | Apache-2.0 (contributions not yet relicensed remain MIT) | 2025-06-18 | af845e7e5b9d27107d1690f0936022546177a1403e63ffb11470135b296a2e01 |
| `verify/reference/espi/openespi-test_usage_data.xml` | OpenESPI-GreenButton-Java `openespi-common/src/test/resources/fixtures/test_usage_data.xml` at commit `06666dc82396b53ed14e7a5c45266ed54015c1ce`, retrieved 2026-10-30; the file carries its own Apache-2.0 header (Green Button Alliance, EnergyOS.org) | Apache-2.0 | 2026-10-30 | 42aaaa5edee61663a32a9376c642410f7d40c5f0cf202935a8e767abd6ef0623 |
| `verify/reference/espi/openespi-test_usage_data.expected.json` | gridprims: the receipt facts for the file above, computed with Python `xml.etree` from the ESPI 4.0 field definitions, independent of gridprims code | CC BY 4.0 (gridprims) | 2026-10-30 | 43228a8ea58400f1d84090278b27b5ca7cb3034ad5d56422e370e02e4e5ddfc2 |
| `verify/reference/nist-sp811-b8-energy.json` | NIST SP 811 Appendix B.8 energy rows, copied from https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8, retrieved 2026-10-31 | U.S. federal government work, public domain | SP 811 (2008) | 6220ae8e09c7151842d3de3336154762e7c5dc11d83465ece0d9f8a8ac1ebe8f |
| `verify/reference/eia-electric-power-annual-2025.json` | EIA Electric Power Annual 2025, Tables 1.1, 2.2, 4.2.A, and 11.1 (https://www.eia.gov/electricity/annual/), national 2025 values copied from the Excel files retrieved 2026-10-31, each file's SHA-256 recorded inside | U.S. federal government work, public domain | 2025 (files of 2026-10-19) | 36279919287a6cebb8d55dc3c9426a10995002a80f227fe3df0adbf250499652 |
| `verify/reference/pudl-v2026.10.0-2025.json` | PUDL v2026.10.0 (Catalyst Cooperative, released 2026-10-14), report year 2025 figures from six tables, computed with pyarrow 26 by `verify/tools/pudl-2025.py`, each source file's SHA-256 recorded inside | CC BY 4.0 (Catalyst Cooperative) | v2026.10.0 | d7b7edc66f067b2f268c92e4e0de7d5b72dae3887e47903b1005a33bdfb47421 |
| `verify/reference/pudl-v2026.10.0-ferc714-peaks.json` | Ten FERC Form 714 annual peaks (the highest reported hour PUDL did not flag) computed with pyarrow 26 from PUDL v2026.10.0 `out_ferc714__hourly_planning_area_demand` by `verify/tools/pudl-ferc714-peaks.py`; the source file's SHA-256 is recorded inside | CC BY 4.0 (Catalyst Cooperative) | v2026.10.0 | 48ad49f1f50b0ceb8e44d893c1fb240a4e89dbc96d91e0ddaf1f0b9a11dd5e50 |

Overpass and Overpass Mono (SIL OFL 1.1 or LGPL 2.1, `RedHatOfficial/Overpass`) are added with the shell (task 8.3); until then pages use the system font stack DESIGN.md names as fallback.

## Checks against EIA's published totals

`verify/tests/pipeline/published-totals.test.mjs` sums the committed snapshots the way EIA does and compares with the values above.

| Check | How we sum | Result on the 2025 data |
|---|---|---|
| Retail sales (EIA-861 `sales`) | Parts A, B, and D only, as EIA's footnote says: part C (delivery only) repeats part B's energy | Matches to the MWh, total and residential |
| Net generation (EIA-923 `generation`) | Every row, state-fuel increments included | Matches to the thousand MWh |
| Net summer capacity (EIA-860 `generators`) | Operable generators' summer MW | Within 0.1 MW (1,283,803.75 against EIA's rounded 1,283,803.8) |
| SAIDI and SAIFI (EIA-861 `reliability`) | Customer-weighted over the utilities that report that index; "any method" uses IEEE where reported, else the utility's own standard | Matches every published value |
| CAIDI | EIA's is the national SAIDI ÷ SAIFI, not a weighted average of utilities' CAIDI | Matches within EIA's rounding |

## Checks against PUDL

`verify/tests/pipeline/pudl-cross-check.test.mjs` compares the same snapshots with PUDL's cleaned tables. Any difference not listed here fails.

| Table | Difference | Why |
|---|---|---|
| EIA-860 plants | PUDL has 45 more (17,394) | PUDL also takes plants from EIA-923's plant frame, such as 8825; ours are EIA-860's Plant sheet exactly |
| EIA-860 operable generators | Same set after PUDL's ID cleanup; PUDL has 2 fewer | PUDL strips leading zeros from all-digit IDs ("001" is "1"), reads the ID "NA" as missing (plant 62844, 150 MW), and so merges plant 56032's "0001" and "001", leaving that summer MW blank |
| EIA-861 reliability | Same 976 utility-state pairs | PUDL keeps one row per standard (1,952 rows) |
| EIA-861 sales | PUDL is 5.17 TWh lower | PUDL keeps one of the three Texas "Withheld" (88888) rows; EIA's own Table 2.2 total matches ours |
| EIA-923 net generation | PUDL is 12.48 TWh lower; within 0.01 TWh once increments are removed | PUDL drops EIA's state-fuel increments (plant 99999) |
