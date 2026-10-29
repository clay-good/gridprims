## Purpose

Computes how much current an overhead conductor can carry under given weather by the IEEE 738 heat-balance method, and builds conductor-only ambient-adjusted rating tables of the kind Order 881 requires, free in the browser and through the MCP server.

## ADDED Requirements

### Requirement: Steady-state ampacity
From conductor properties (diameter, AC resistance at two temperatures, emissivity, absorptivity, maximum temperature) and weather and site inputs (ambient temperature, wind speed and angle, elevation, latitude, line azimuth, date, hour), the tool SHALL compute the steady-state current at which cooling equals resistive and solar heating, following IEEE 738-2023 (clauses cited, text not reproduced), reported in amps and, for an entered line-to-line voltage, three-phase MVA (√3 × kV × kA).

#### Scenario: Higher wind raises the rating
- **WHEN** wind speed rises from 2 ft/s to 4 ft/s with all else equal
- **THEN** the ampacity increases and the sentence explains that cooling rose

#### Scenario: MVA
- **WHEN** ampacity is 1,000 A on a 230 kV line
- **THEN** the rating is 398.4 MVA

#### Scenario: Matches reference implementations
- **WHEN** CI runs the 50 stored reference cases computed with `linerate` and `pypacity`
- **THEN** every ampacity is within 1% of both, or the case is documented as a known method difference

### Requirement: Ambient-adjusted rating table
The tool SHALL generate a conductor thermal-limit table, labeled as excluding terminal equipment and emergency ratings that a facility's Order 881 rating must also consider, across a user-set ambient temperature range (default −20 °C to 45 °C in 1 °C steps, which the user must widen to cover the site's historical extremes) for day (with solar heating at the chosen date and hour) and night (no solar) using the user's chosen fixed wind assumption, and SHALL offer it as CSV.

#### Scenario: Table export
- **WHEN** a user exports the table
- **THEN** the CSV has one row per temperature with day and night amps and the assumptions in a header comment

### Requirement: Conductor library from public sources only
The tool SHALL include a starter library of conductor names, stranding, and diameters only from public-domain or openly licensed sources (initially USDA RUS Bulletin 1724E-200, edition and date recorded in the registry; public domain), each with its source, and SHALL require the user to enter AC resistance at two temperatures, since no public-domain resistance table exists. Values from copyrighted manufacturer catalogs or IEEE tables SHALL NOT ship.

#### Scenario: Library conductor still needs resistance
- **WHEN** a user picks 795 kcmil 26/7 ACSR "Drake" from the library
- **THEN** diameter is filled with its RUS citation and the resistance fields ask for the manufacturer's values

#### Scenario: Unknown conductor
- **WHEN** a user's conductor is not in the library
- **THEN** the tool asks for its diameter and resistances and links to guidance on where to find them

### Requirement: Inputs in US and SI units
Every input SHALL accept US customary and SI units with conversion at the boundary; results SHALL show the units used.

#### Scenario: Metric inputs
- **WHEN** a user enters diameter in mm and wind in m/s
- **THEN** results equal those from the equivalent US inputs within 0.01%
