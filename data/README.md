# data

Built dataset versions, committed so a fresh clone runs offline (foundation design D5 and D16). Raw publisher files are not committed: each manifest records their URL, size, and SHA-256.

| Path | What |
|---|---|
| `<dataset>/current.json` | The version being served |
| `<dataset>/<YYYY-MM>/manifest.json` | Publisher, captured terms, posture, attribution, as-of and retrieved dates, raw file checksums, and every table's columns, shards, and download, each with its SHA-256 |
| `<dataset>/<YYYY-MM>/<table>/<partition>.bin` | Column shards for the website and the MCP server |
| `<dataset>/<YYYY-MM>/<table>.csv.gz` | The table as gzip CSV, ISO dates and `.` decimals |
| `curated/` | Hand-maintained records (the public changelog) |
