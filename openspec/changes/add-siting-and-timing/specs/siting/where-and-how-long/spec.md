## Purpose

Answers, from public data only, where new load or generation can connect to the US grid, how much, and how long it has taken others nearby. One place and one size in; a cited read-out out, with the limits of the public record stated at the answer rather than in a footnote.

## ADDED Requirements

### Requirement: A place and a size return one cited read-out
The siting read-out SHALL take a place (a 5-digit ZIP code or a county FIPS) and a size in MW with a direction of load or generation, and SHALL return the serving utilities, the balancing authority, the size against that utility's peak and sales, and the county's queue figures. Every figure SHALL carry its publisher and as-of date, and SHALL be computed on the device from static JSON so that nothing the visitor types leaves it.

#### Scenario: A data center request in Travis County, Texas
- **WHEN** a visitor enters ZIP 78701 and 300 MW of load
- **THEN** the read-out names Oncor, Austin Energy, Pedernales and Bluebonnet as serving utilities, ERCO as the balancing authority, states 300 MW against the serving utility's own peak as a percentage, and shows Travis County's active queued MW, its mix by type, its median years in queue, and its withdrawal share, each with a source and an as-of date

### Requirement: A missing utility peak falls back to the balancing authority
Where the serving utility files no FERC Form 714 annual peak, the read-out SHALL compare the size against that utility's balancing authority's peak instead, and SHALL name the balancing authority and say the comparison is to its peak rather than the utility's.

#### Scenario: A size with no utility peak on file
- **WHEN** the serving utility reports no Form 714 peak
- **THEN** the read-out uses the balancing authority's peak, says which balancing authority it is and that the comparison is to its peak rather than the utility's, and does not present the share as the utility's own

#### Scenario: A county with too few requests to generalize
- **WHEN** a county's historic cohort holds fewer than the minimum number of requests the withdrawal statistic requires
- **THEN** the read-out omits the withdrawal share, says the county has too few requests to generalize, and offers the state figure instead

### Requirement: Resolution is stated where the answer is
The read-out SHALL state, beside its answer and not only on the limits page, that feeder and substation headroom is Critical Energy/Electric Infrastructure Information, that gridprims therefore answers at utility, balancing-authority, and county level, and that the serving utility's own hosting-capacity map is where per-feeder figures live. It SHALL NOT publish, estimate, or imply a feeder or substation hosting-capacity value.

#### Scenario: A visitor expects a parcel answer
- **WHEN** the read-out returns
- **THEN** a plain sentence states the resolution limit and names the next place to look, and no figure on the page is presented as feeder or substation headroom

### Requirement: Median time in queue is history, never a forecast
Where the read-out reports how long requests have waited, it SHALL present the median years that the measured cohort has been in the queue as of the data's own period end, SHALL name the cohort and its size, and SHALL NOT present any figure as an expected or predicted time for a new request.

#### Scenario: A reader quotes the number
- **WHEN** the median years figure is shown
- **THEN** it is labelled with the cohort it measures and its as-of date, and the page states that it describes projects already in the queue rather than predicting a new one

### Requirement: Which federal interconnection process applies
For a generation size, the read-out SHALL name the federal interconnection process that size falls under, using the existing Small Generator Interconnection Procedures ladder, and SHALL link to the screens tool rather than reproducing a verdict. It SHALL state that state-jurisdictional projects follow their own state's procedures where those differ.

#### Scenario: A 3 MW solar project
- **WHEN** a visitor enters a generation size within the Fast Track ceiling
- **THEN** the read-out names the applicable process, links to the screens tool, and says which screens only the utility can settle

### Requirement: Queue summaries are published as fetchable JSON
The build SHALL emit, per state, a JSON file holding that state's queue summary and one summary per county, each carrying active MW, active count, mix by type, median years, and the withdrawal share with its cohort size, plus the dataset's release and as-of date. The file SHALL be served with open-data headers like the rest of the data library, and SHALL NOT carry any point-of-interconnection or substation name.

#### Scenario: The browser reads one state
- **WHEN** the read-out needs Travis County's figures
- **THEN** it fetches only that state's file and the ZIP lookup shard it already uses, and the file contains no substation or point-of-interconnection field
