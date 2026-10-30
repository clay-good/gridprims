## Purpose

Turns "only the utility can tell you" into a concrete next step: the report the rules let you buy, and the maps that already publish some of it.

## ADDED Requirements

### Requirement: Pre-application report walkthrough
Where the applicable rules provide a pre-application report, the tool SHALL explain it: what it costs, how long the utility has to return it, what the applicant must supply to request it, and the items the rules say it contains, each cited to the rule with the vintage read. It SHALL state that the report is not a study and does not reserve capacity.

#### Scenario: Report explained
- **WHEN** a user hits a utility-only screen under the federal procedures
- **THEN** the tool names the pre-application report, its fee and its deadline in business days as the rule states, lists the items it returns, and cites the provision

#### Scenario: No such report in this jurisdiction
- **WHEN** a jurisdiction's rules provide no pre-application report
- **THEN** the tool says so and names whatever request path the rules do provide, or says there is none

### Requirement: Which screens the report can settle
The tool SHALL map each item the report returns to the screens it would let the applicant evaluate, so the applicant knows what the fee buys.

#### Scenario: What the fee buys
- **WHEN** the walkthrough is shown
- **THEN** each returned item is listed against the screens it informs, and screens the report cannot settle are named as still needing the utility's model

### Requirement: Hosting-capacity directory, linked not mirrored
The directory SHALL record per utility: whether a hosting-capacity map exists, whether its data can be downloaded, whether it publishes per-feeder minimum load, what its terms say about reuse, what vintage it shows, and the date we last checked. It SHALL link to each map, and SHALL NOT copy, mirror, or republish any value from any map or endpoint.

#### Scenario: Utility publishes minimum load
- **WHEN** a utility publishes per-feeder minimum load on an open endpoint
- **THEN** the entry says so, explains how to find a feeder's value, links the endpoint, and holds no value itself

### Requirement: The federal atlas is linked with its condition
The directory SHALL link the federal hosting-capacity atlas and SHALL state its last-updated date and that it is a link table we found unmaintained, with entries that may not resolve, so a reader knows why our own directory exists.

#### Scenario: Atlas condition stated
- **WHEN** a visitor opens the directory
- **THEN** the federal atlas is linked with its date and a note that we found it unmaintained, alongside our own last-checked dates

#### Scenario: Viewer-only map
- **WHEN** a utility publishes a map that cannot be downloaded and whose terms forbid reuse
- **THEN** the entry says so, links the viewer, and offers no data

#### Scenario: Nothing hosted
- **WHEN** CI scans our shipped data for hosting-capacity values
- **THEN** none is present, and the directory contains only descriptions and links

### Requirement: What a map value means, and does not
The directory SHALL explain that a hosting-capacity figure is the utility's own modeled estimate for a point in time under its own assumptions, that it is not a reservation, and that it can change with other projects in the queue.

#### Scenario: Caveat shown
- **WHEN** a user follows a map link
- **THEN** the page states these three limits before the link

### Requirement: Freshness
Each directory entry unchecked for 12 months SHALL show a "needs review" chip, and a weekly job SHALL report broken links.

#### Scenario: Stale entry
- **WHEN** an entry was last checked 13 months ago
- **THEN** it shows the chip with its last-checked date
