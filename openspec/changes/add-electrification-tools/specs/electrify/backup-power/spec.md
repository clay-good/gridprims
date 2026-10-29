## Purpose

Turns a site's own critical load and its county's real outage history into a first-pass battery or generator size, so a clinic, school, or household can ask an installer an informed question.

## ADDED Requirements

### Requirement: Critical load
The user SHALL define critical load either as a list of loads (name, running kW, hours per day) or as a share of the interval file's load by hour, and the tool SHALL show the critical load profile in kW by hour and its daily energy in kWh.

#### Scenario: Load list
- **WHEN** a user lists a refrigerator (0.2 kW, 24 h), a well pump (1.5 kW, 2 h), and lights (0.3 kW, 6 h)
- **THEN** daily critical energy is 9.6 kWh (4.8 + 3.0 + 1.8)

### Requirement: County outage history
For the user's county, the tool SHALL derive outage events from EAGLE-I county customers-out data (ORNL, CC BY 4.0, version 4 covering 2014–2025, registered with credit): an event is a run of 15-minute intervals with at least 1% of the county's tracked customers out, its duration is the number of intervals × 15 minutes, and missing records of up to 1 hour inside a run are bridged. Durations SHALL use nearest-rank percentiles. County data SHALL be packed in state shards.

#### Scenario: Short event
- **WHEN** a single 15-minute interval has 2% of customers out
- **THEN** it is one event lasting 0.25 hours

### Requirement: Event summary and coverage
The tool SHALL show the count of events and the 50th, 90th, and longest durations in hours, and SHALL exclude years in which EAGLE-I covers less than 50% of the county's customers, listing the years used.

#### Scenario: Event summary
- **WHEN** a county had 40 events from 2014 to 2025
- **THEN** the tool shows 40 events and the median, 90th-percentile, and longest durations with the data period

### Requirement: Honest about what county data means
Every outage result SHALL state that a county event means some customers in the county were out, not that the user's address was, and that durations are a typical, not worst-case, guide: the last customers restored can be out after the county share falls below 1%.

#### Scenario: Label present
- **WHEN** any duration is shown or copied
- **THEN** the county-proxy label is included

### Requirement: Battery size to cover a share of events
Given a target share of historical events to ride through (default 90%), the tool SHALL compute the critical energy over the matching duration, starting at the hour of day with the highest critical load, and report usable kWh and nameplate kWh at a stated usable window (default 80%). It SHALL show the result for each duration percentile.

#### Scenario: 12-hour target
- **WHEN** critical load is a constant 5 kW and the 90th-percentile duration is 12 hours
- **THEN** usable energy is 60 kWh and nameplate is 75 kWh at an 80% usable window

### Requirement: Generator size
The tool SHALL size a generator as the peak critical kW minus the largest motor's running kW plus that motor's starting kW, which the user enters from the motor nameplate or manufacturer data, and SHALL NOT assume a starting multiplier. It SHALL note that generator ratings are usually stated at 0.8 power factor and that motor starting should be checked against the generator's motor-starting data.

#### Scenario: Motor start
- **WHEN** peak critical load is 4.0 kW, including the well pump's 1.5 kW running load, and the pump's starting load is 4.5 kW
- **THEN** the generator size shown is at least 7.0 kW (4.0 − 1.5 + 4.5), with the formula visible

### Requirement: Verification and handoff
Event extraction SHALL match an independent script's output for at least 3 counties (stored with the fixture) exactly in event count and within 15 minutes in each duration; sizing SHALL match hand-computed fixtures exactly. Results SHALL hand off to REopt's resilience mode for solar-plus-storage design.

#### Scenario: Independent events
- **WHEN** CI compares event lists for a fixture county
- **THEN** counts match exactly and every duration is within 15 minutes
