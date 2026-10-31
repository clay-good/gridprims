# Reference artifacts

Third-party files we read or compare against but never execute (`platform/zero-dependency`): self-hosted fonts, published schemas, and stored reference outputs from other engines. The dependency gate fails on any font file, or any file under `verify/reference/` or `site/fonts/`, that is not listed here with a matching SHA-256.

| Path | Source | License | Version | SHA-256 |
|---|---|---|---|---|
| `verify/reference/mcp/schema-2026-07-28.json` | MCP JSON schema 2026-07-28, `modelcontextprotocol/modelcontextprotocol` `schema/2026-07-28/schema.json` at commit `68619e4e8bb7ae11f1aa3872a27ee06f352b9d28`, retrieved 2026-10-30 | Apache-2.0 (contributions not yet relicensed remain MIT) | 2026-07-28 | ef70b61f99b6d2e5e3b46863822eab08dff6a45bedc7a08914e0e5b133f40203 |
| `verify/reference/mcp/schema-2025-11-25.json` | MCP JSON schema 2025-11-25, `modelcontextprotocol/modelcontextprotocol` `schema/2025-11-25/schema.json` at commit `68619e4e8bb7ae11f1aa3872a27ee06f352b9d28`, retrieved 2026-10-30 | Apache-2.0 (contributions not yet relicensed remain MIT) | 2025-11-25 | 268a5f82ba70fd7e4b6dc4aa1e64f116f74b4d0edcb69dc046829c79dd4e97e7 |
| `verify/reference/mcp/schema-2025-06-18.json` | MCP JSON schema 2025-06-18, `modelcontextprotocol/modelcontextprotocol` `schema/2025-06-18/schema.json` at commit `68619e4e8bb7ae11f1aa3872a27ee06f352b9d28`, retrieved 2026-10-30 | Apache-2.0 (contributions not yet relicensed remain MIT) | 2025-06-18 | af845e7e5b9d27107d1690f0936022546177a1403e63ffb11470135b296a2e01 |

Overpass and Overpass Mono (SIL OFL 1.1 or LGPL 2.1, `RedHatOfficial/Overpass`) are added with the shell (task 8.3); until then pages use the system font stack DESIGN.md names as fallback.
