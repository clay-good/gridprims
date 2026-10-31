# parsers

Own parsers for user files and publisher files, shared by the website and the MCP server. None makes a network request.

| Module | What |
|---|---|
| `delimited.mjs` | Decode bytes (BOM, UTF-8, UTF-16, Windows-1252), detect the delimiter, and parse quoted CSV, TSV, semicolon, or pipe text, whole or in chunks |
| `xml.mjs` | Read well-formed XML to events or a tree; refuse any DTD or entity (Green Button) |
| `xlsx.mjs` | Read an `.xlsx` workbook's first sheet (or a named one) to typed cells: own ZIP directory reader, inflate through `DecompressionStream`, shared strings, date formats, cached formula values only |
| `time.mjs` | IANA time zones through `Intl`: wall time to UTC with the DST gap and repeat reported, transitions, ISO display |
