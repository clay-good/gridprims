## Purpose

Keeps a dated, citable copy of daily temperature history and published normals, and finds a nearby weather station without telling anyone where the user is.

## ADDED Requirements

### Requirement: Station temperature history
The dataset SHALL contain, per weather station, the daily maximum and minimum temperature with their observation dates, taken from NOAA's daily global historical climatology network per-station files, trimmed to those fields. It SHALL be registered with NOAA as publisher, the redistribution basis recorded as a United States federal work not subject to domestic copyright, the dataset's own requested citation as the required attribution, and the source file's date as the as-of date.

#### Scenario: Registry entry
- **WHEN** a visitor opens the dataset in the data library
- **THEN** it names NOAA, the federal-works basis, the requested citation, the data period, and our retrieval date

#### Scenario: Only the fields we need
- **WHEN** a station file is normalized
- **THEN** only station, date, maximum, and minimum temperature are kept, with units and quality flags recorded, and the row count is reported against the source

### Requirement: Published normals
The dataset SHALL include the published 1991–2020 daily heating and cooling degree-day normals per station. Every figure derived from them SHALL state that the published normals come from a smoothed fit of daily mean temperature rather than an average of thirty years of actual degree days, so degree days we compute from station history will not match them exactly.

#### Scenario: Normal-year caveat
- **WHEN** a result compares a year with the normal year
- **THEN** the caveat sentence appears beside it

### Requirement: Degree days computed on the device
Heating and cooling degree days SHALL be computed in the browser from the daily maximum and minimum as the mean of the two compared with the chosen base temperature, the convention NOAA and EIA state, so any base in the model's search range can be used. Degree days SHALL NOT be shipped precomputed at a single base.

#### Scenario: Base 65 °F
- **WHEN** a day has a maximum of 80 °F and a minimum of 56 °F
- **THEN** the mean is 68 °F, giving 3 cooling degree days and 0 heating degree days at base 65 °F

#### Scenario: Verified against the publisher's division series
- **WHEN** CI compares our computed base-65 monthly degree days, aggregated to a climate division, with the publisher's own published monthly division series for 5 divisions and 24 months
- **THEN** every month agrees within 5% or 10 degree days, whichever is larger, and the remaining difference is documented as the publisher's population weighting rather than a defect

#### Scenario: Normals are not a check
- **WHEN** a maintainer compares our computed degree days with the published 1991–2020 normals
- **THEN** the method notes record that the normals come from a smoothed fit and are not a verification target

### Requirement: Station lookup without a request that names the user
The app SHALL ship a station index (identifier, name, coordinates, elevation, and period of record). Station history SHALL be packed into the same state shards that already serve the utility lookup, so no asset URL names a station, a county, or a ZIP code. Candidate stations for a ZIP code SHALL be ranked by distance on the device from the state shard, and the user SHALL be able to pick a different station.

#### Scenario: Request privacy
- **WHEN** a user enters a ZIP code to find a station
- **THEN** the only request is for the state shard (or the shards of the states a border ZIP touches), and neither the ZIP, the coordinates, nor the chosen station appears in any request

#### Scenario: Station receipt
- **WHEN** a station is chosen
- **THEN** the receipt names the station, its distance in miles, its elevation difference, its period of record, and the share of days present over the analysis period

### Requirement: Coverage and gaps are reported
Missing or flagged daily observations SHALL be counted and reported, never silently filled. The open method documentation sets a limit of 6 consecutive missing **hours** of temperature data for hourly models; since this change fits daily and billing-period models, the tool SHALL set its own daily floor at 7 consecutive missing days within the period, name that floor as a gridprims choice rather than the published rule, and apply the sufficiency rules in `weather/baseline-model`.

#### Scenario: Station with a gap
- **WHEN** a station is missing 9 consecutive days, more than the disclosed 7-day floor
- **THEN** the receipt reports the gap with its dates, names the floor as gridprims' own, and suggests the next nearest station
