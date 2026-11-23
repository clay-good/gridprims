# Measured plant emissions, and what they are not

Used by the `epa-camd` dataset (`pipeline/registry/epa-camd.mjs`) and the plant and region views built on it.

**What it gives you:** what large fossil units actually measured at the stack, hour by hour, instead of what an annual average implies. It covers part of the fleet, and every figure says how much.

## Where the numbers come from

EPA's Clean Air Markets Program Data publishes hourly, unit-level records from the continuous emission monitors on units in the federal trading programs. We read EPA's keyless bulk files, about 6.5 GB a data year, a line at a time, and ship only our own aggregates:

| Table | One row is | Partitioned by |
|---|---|---|
| `units` | a monitored unit in a data year | state |
| `units_monthly` | a monitored unit in a month | state |
| `region_hourly` | a balancing authority in an hour | region and year |
| `peak_hour_units` | a monitored unit in one of its region's ten highest-demand hours of the year | region and year |

Raw hourly per-unit records are never shipped: they are hundreds of files past our per-file budget, and EPA publishes them itself. The one exception is narrow and deliberate: the ten hours a year per region that people ask about, where the unit-by-unit detail is the answer.

## The conversions and conventions

| What | Rule | Why |
|---|---|---|
| Carbon dioxide | EPA's short tons × **0.90718474** = metric tons | EPA reports short tons; the rest of gridprims states carbon in metric tons, and this is the factor EPA states |
| Sulfur dioxide, nitrogen oxides | kept in the pounds the hourly files report | Converting twice invites a unit error; EPA's own daily files use short tons, and our cross-check converts at 2,000 lb per short ton |
| Gross load | each hour's average load in MW × the fraction of the hour the unit operated | How EPA's own daily files total it; an hour a unit ran for twelve minutes is not a full megawatt-hour. It is **gross** load, not net generation: the unit's own auxiliary load is still in it |
| Hours | EPA's date and hour, local standard time, with no daylight saving | The monitors report that way. Comparing with a series in UTC means applying the region's standard-time offset; nothing in the pipeline shifts them |
| Operating time | summed hourly operating fractions | An hour may be partly operated |
| Region | eGRID's balancing-authority code for the plant, matched on EPA's facility id (the ORISPL id), never on a name | It is the same key our hourly carbon figures use. In the 2026-11 build eGRID places all but 273 of 8,149 unit-years, 60 plants, most of them industrial sources or plants newer than eGRID2023; their hours go to an `unmatched` shard rather than being dropped, and their unit rows carry `egrid_match = no`. eGRID writes "NA - AK" where it places a plant in no balancing authority at all; those plants are treated as unplaced too |

## What the data does not cover

Monitors are required of large fossil units in the acid rain and interstate trading programs, mostly 25 MW and above. Nuclear, hydro, wind, solar, and small fossil units are not in it. A regional total from this dataset is **not** that region's emissions; it is the monitored part of it, and `units_reporting` says how many units stood behind each hour.

Units that share a stack carry values EPA **apportions** between them. Their unit-level figures are a division of one measured total, not a direct measurement, so every such row is flagged `apportioned = yes` and the plant pages say so.

## How it is checked

`verify/tools/camd-published-summaries.py` reads EPA's own **daily** bulk files for Alabama, Delaware, and Pennsylvania, 2024 and 2025, with Python's `csv` module, and sums them to months for the twelve largest monitored units in those states. `verify/tests/pipeline/camd-cross-check.test.mjs` compares every one of those months with our shipped monthly rows, in all six measures.

EPA's daily files are EPA's own aggregation of the same hourly records, so a month that agrees means our reading of the hourly file agrees with EPA's. Values must land within a part in a million; our sum adds about 8,760 hourly values where EPA's adds 365 daily ones already rounded, so they agree closely rather than bit for bit.

## Terms

EPA states a suggested citation and a disclaimer for this data, not a license, and only EPA's geospatial data is stated public domain. The registry records the disclaimer verbatim; the posture matcher reads its non-commercial wording as restrictive, so the dataset ships on `derive`: only values we computed are published, and EPA's own files are linked, not republished. That open item stays on the entry until EPA states otherwise.
