# County outage events from EAGLE-I

Used by `electrify.backup-power.size` (the county picker), `pipeline/normalize/eaglei-events.mjs`, and `core/lib/backup-power.mjs`.

**What it gives you:** how long power outages in your county have lasted, so a battery or generator can be sized to ride through most of them.

## Source

ORNL's EAGLE-I recorded electricity outages, 2014 to 2025, figshare version 4 ([doi:10.6084/m9.figshare.24237376.v4](https://doi.org/10.6084/m9.figshare.24237376.v4), CC BY 4.0). It gathers customers out per county every 15 minutes from utilities' public outage maps. The 12 yearly files total about 11.6 GB, so the pipeline streams them a line at a time and ships only the derived events.

| File | What we use |
|---|---|
| `eaglei_outages_YYYY.csv` | `fips_code`, `customers_out`, `run_start_time` (read as UTC; the 2014 file starts at 04:00, midnight Eastern daylight time) |
| `MCC.csv` | Modeled customers per county, 2022: the denominator for the 1% rule |
| `coverage_history.csv` | The share of each state's customers EAGLE-I covered, 2018 to 2022 |

## The rule

| Step | Rule |
|---|---|
| Event | A run of 15-minute records with at least 1% of the county's modeled customers out |
| Bridging | A gap of missing records up to 1 hour inside a run is bridged. A record under 1% ends the run |
| Duration | From the first record's start to the last record's end: intervals × 15 minutes, counting bridged ones |
| Percentiles | Nearest rank: the 50th, the 90th, and the longest |
| Years used | A year is left out when its state's published coverage (the highest share that year) is below 50% |

## Where the data and the spec part ways

- **Coverage is by state, and only for 2018 to 2022.** The spec asks to drop years when EAGLE-I covers less than 50% of the *county's* customers, but no county figure is published. We use the state's figure where there is one. Years with no figure (2014 to 2017, and 2023 to 2025) are kept, and the result names them.
- **The denominator is a 2022 snapshot.** MCC.csv gives each county's customers once, for 2022. A county that grew or shrank a lot has a 1% threshold that's slightly off in other years.
- **A missing record is not a zero.** EAGLE-I mostly writes no row when no customers are out, so bridging a missing hour can join two outages less than an hour apart. That follows the spec; it lengthens some events.

## What a county event means

A county event means some customers in the county were out, not that your address was. Durations are a typical guide, not a worst case: the last customers restored can be out after the county share falls below 1%. Every result carries this label.

## Checked against

`verify/tools/eaglei-events-check.py` recomputes the events for three counties (Travis, TX; Miami-Dade, FL; Orleans, LA) from the raw files with Python's `csv` module, apart from our JavaScript. The stored result is `verify/reference/eaglei-events-3-counties.json`. CI requires the same count of events, and every duration within 15 minutes.
