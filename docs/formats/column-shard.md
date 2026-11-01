# Column shard format, version 1

The packed binary file for chart and query data (foundation design D5, task 2.2). Frozen from what EIA-861 needed: numbers that may be missing, and text that repeats (states, ownership types, balancing authorities). Reader: `core/lib/shard.mjs`. Writer: `pipeline/lib/shard-writer.mjs`.

| Bytes | What |
|---|---|
| 0–3 | `GPC1` |
| 4–7 | Header length in bytes, little-endian uint32 |
| 8 … | JSON header, then zero padding to a multiple of 8 |
| … | Each column's bytes, each starting on a multiple of 8 from the data start |

**Header:** `{format: "gridprims-cols/1", rows, columns: [{name, type, unit?, scale?, nullable, offset, length, dictionary?}], meta?}`. `offset` counts from the data start.

| Type | Encoding | Missing value |
|---|---|---|
| `f64` | little-endian float64 per row | NaN |
| `f32` | little-endian float32 per row, seven significant digits | NaN |
| `i32` | little-endian int32 per row; the value is the integer divided by the column's `scale` | `-2147483648` |
| `str` | little-endian uint32 per row, an index into `dictionary` (first-seen order) | `0xFFFFFFFF` |

**Cases the EIA-861 shard exercised:** numbers with EIA's "." placeholder (read as missing, never zero); blank text (Ownership in 182 rows, BA Code in 6); whole numbers and decimals in one column (revenue in thousand dollars); text with up to about 1,500 distinct values (utility names). Integers are stored as float64, which is exact to 2^53.

**Added for EIA-930's hourly data:** `i32`, a scaled integer at half the size of `f64`, for EIA's hourly megawatt-hours, which are whole numbers (scale 1). The normalizer rounds each value to its scale, so a value read back equals the row it came from, and a value that does not fit fails the run before any file is written. CO₂ and intensity are `f32`, half the size of `f64` with seven significant digits (intensity within 0.0001 lb/MWh of EIA's value): EIA's files hold outliers no fixed scale fits, such as one hour of 224 million metric tons, and a float holds them. A reader refuses a column type it does not know rather than misreading it.

Same rows in, same bytes out: the writer is deterministic, so checksums reproduce.
