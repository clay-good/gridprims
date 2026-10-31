# Column shard format, version 1

The packed binary file for chart and query data (foundation design D5, task 2.2). Frozen from what EIA-861 needed: numbers that may be missing, and text that repeats (states, ownership types, balancing authorities). Reader: `core/lib/shard.mjs`. Writer: `pipeline/lib/shard-writer.mjs`.

| Bytes | What |
|---|---|
| 0–3 | `GPC1` |
| 4–7 | Header length in bytes, little-endian uint32 |
| 8 … | JSON header, then zero padding to a multiple of 8 |
| … | Each column's bytes, each starting on a multiple of 8 from the data start |

**Header:** `{format: "gridprims-cols/1", rows, columns: [{name, type, unit?, nullable, offset, length, dictionary?}], meta?}`. `offset` counts from the data start.

| Type | Encoding | Missing value |
|---|---|---|
| `f64` | little-endian float64 per row | NaN |
| `str` | little-endian uint32 per row, an index into `dictionary` (first-seen order) | `0xFFFFFFFF` |

**Cases the EIA-861 shard exercised:** numbers with EIA's "." placeholder (read as missing, never zero); blank text (Ownership in 182 rows, BA Code in 6); whole numbers and decimals in one column (revenue in thousand dollars); text with up to about 1,500 distinct values (utility names). Integers are stored as float64, which is exact to 2^53.

Same rows in, same bytes out: the writer is deterministic, so checksums reproduce.
