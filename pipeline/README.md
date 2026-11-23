# pipeline

Dataset fetchers, validators, normalizers, and snapshot writers: the same Node scripts scheduled CI runs (`platform/data-operations`, `platform/automation`).

```sh
node pipeline/run.mjs eia-861 --year 2025                     # fetch from EIA, validate, snapshot into data/
node pipeline/run.mjs eia-861 --year 2025 --input f8612025.zip  # the same from a file already downloaded
node --max-old-space-size=12288 pipeline/run.mjs eia-930 --year 2026-10  # 68 hourly workbooks (about 4 GB), read one at a time
```

| Path | What |
|---|---|
| `scheduled.mjs` | One scheduled run: self-heal, check each dataset, refresh what changed, open issues for failures, update the health record |
| `check.mjs` | The release watch for one dataset: a new data year or a revised file, refreshed in the same run |
| `link-check.mjs` | The weekly outbound link check |
| `workflows.mjs` | Every scheduled workflow with its interval and staleness threshold |
| `lib/health.mjs` | The health record at `data/health/pipeline.json`, published at `/health/pipeline.json` |
| `lib/github.mjs` | Re-enabling disabled workflows and opening issues through the host's API |
| `get-data.mjs` | Downloads dataset files from gridprims.com and keeps each only if it matches the digest committed in the clone |
| `build-data.mjs` | Rebuilds every dataset from the publisher's own file and reports any checksum that differs |
| `run.mjs` | Runs a dataset's recipe; when a validator fails, nothing is written and the previous version stays live |
| `registry/<id>.mjs` | One entry per dataset: publisher, captured terms, redistribution basis, attribution, cadence, CEII screen, owning change, pinned raw checksums, and the recipe as data |
| `normalize/` | One normalizer per table |
| `lib/registry.mjs` | Entry rules, the recipe step vocabulary, the CEII checklist, and the license matcher (mirror, derive, link) |
| `lib/shard-writer.mjs` | Writes column shards (`docs/formats/column-shard.md`) |

| Dataset | Owner | Served version |
|---|---|---|
| EIA-861 sales, revenue, and customers by utility and state (2025 final, released 2026-10-07) | `establish-platform-foundation` | `data/eia-861/2026-10/` |
| EIA-930 hourly demand, generation by fuel, and CO₂ by balancing authority, from July 2018 (68 regions, one shard per region and year) | `add-hourly-carbon` | `data/eia-930/2026-10/` |
| EPA CAMPD measured emissions from continuous monitors, 2024 and 2025: monthly per unit, hourly per balancing authority, and unit by unit in each region's ten busiest hours | `add-measured-plant-emissions` | `data/epa-camd/2026-11/` |

EPA's hourly files are about 6.5 GB a data year, so the recipe streams them and the refresh reads each one twice (once per streamed table). Download them once and run from disk when rebuilding:

```sh
for y in 2024 2025; do for s in al ak az ...; do
  curl -sO "https://api.epa.gov/easey/bulk-files/emissions/hourly/state/emissions-hourly-$y-$s.csv"; done; done
node pipeline/run.mjs epa-camd --year 2026-11 --input f2024=facility-2024.csv --input h2024-al=emissions-hourly-2024-al.csv ...
```
