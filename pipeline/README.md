# pipeline

Dataset fetchers, validators, normalizers, and snapshot writers: the same Node scripts scheduled CI runs (`platform/data-operations`, `platform/automation`).

```sh
node pipeline/run.mjs eia-861 --year 2025                     # fetch from EIA, validate, snapshot into data/
node pipeline/run.mjs eia-861 --year 2025 --input f8612025.zip  # the same from a file already downloaded
```

| Path | What |
|---|---|
| `run.mjs` | Runs a dataset's recipe; when a validator fails, nothing is written and the previous version stays live |
| `registry/<id>.mjs` | One entry per dataset: publisher, captured terms, redistribution basis, attribution, cadence, CEII screen, owning change, pinned raw checksums, and the recipe as data |
| `normalize/` | One normalizer per table |
| `lib/registry.mjs` | Entry rules, the recipe step vocabulary, the CEII checklist, and the license matcher (mirror, derive, link) |
| `lib/shard-writer.mjs` | Writes column shards (`docs/formats/column-shard.md`) |

| Dataset | Owner | Served version |
|---|---|---|
| EIA-861 sales, revenue, and customers by utility and state (2025 final, released 2026-10-07) | `establish-platform-foundation` | `data/eia-861/2026-10/` |
