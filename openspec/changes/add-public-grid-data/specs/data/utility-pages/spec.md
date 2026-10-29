## Purpose

Gives every US electric utility one readable, cited page so customers, city staff, reporters, and advocates can see what it charges, how reliable it is, and what generation it owns.

## ADDED Requirements

### Requirement: One page per utility with sourced facts
The site SHALL generate one page per utility in EIA-861 (keyed by EIA utility id) showing: name, ownership type (investor-owned, cooperative, municipal, other public, federal, retail power marketer), states served, customers, sales (MWh), and revenue by sector, and the data year, from EIA-861 (EIA, public domain; as-of = EIA's release date). Every fact SHALL carry a source stamp.

#### Scenario: Source stamp
- **WHEN** a utility page shows residential customers
- **THEN** the stamp reads EIA-861, the data year, EIA's release date, and our retrieved date

### Requirement: Average price only where it means price
The page SHALL show average price by sector (revenue ÷ sales, in cents per kWh, to 0.01) only for bundled service (EIA-861 Part A). For delivery-only service (Part C, such as Texas wires utilities and choice-state delivery), it SHALL show average delivery revenue per kWh labeled "delivery only, not your full price" and SHALL NOT compare it with bundled averages.

#### Scenario: Average price computed, not copied
- **WHEN** a utility reports $50,000,000 residential revenue and 400,000 MWh residential sales
- **THEN** the page shows 12.50 cents per kWh and "How we got this" shows the division

#### Scenario: Texas wires utility
- **WHEN** a visitor opens Oncor's page
- **THEN** no "average price" appears; delivery revenue per kWh is labeled delivery only, with a link to the household plan finder

#### Scenario: Independent check
- **WHEN** CI compares computed state average residential prices with EIA's published average price table for the same year
- **THEN** every state matches within 0.01 cents per kWh

### Requirement: Annual peak where reported
The page SHALL show the utility's annual peak demand (MW) from FERC Form 714 via PUDL (Catalyst Cooperative, CC BY 4.0; the PUDL release pinned in the registry; FERC filing year as the data period) where the utility files it, matched through PUDL's respondent-to-EIA-id crosswalk, and SHALL say "not reported to FERC" otherwise.

#### Scenario: Co-op without Form 714
- **WHEN** a distribution co-op files no Form 714
- **THEN** the peak section says it is not reported to FERC and names its balancing authority's peak instead, labeled as such

### Requirement: Reliability where reported
The page SHALL show SAIDI and SAIFI with and without major event days where the utility reports them to EIA-861, with the standard used (IEEE 1366 or other). Where not reported, the page SHALL say so rather than leave a blank.

#### Scenario: No reliability data
- **WHEN** a utility did not report reliability metrics
- **THEN** the section says "Not reported to EIA for <year>" and explains that small utilities are often exempt

### Requirement: Trends and comparisons
The page SHALL chart average price and customers for every year we hold (at least 5 years) and SHALL compare the latest average price with the state average for the same sector.

#### Scenario: State comparison
- **WHEN** a co-op's residential price is 14.4 cents and the state average is 12.0 cents
- **THEN** the page says it is 20% above the state average for residential customers

### Requirement: Owned generation by fuel
The page SHALL show the generating capacity (MW) and latest annual net generation (MWh) of plants the utility operates, by fuel, from EIA-860 and EIA-923, and SHALL state that this is owned or operated generation, not the full mix of power the utility buys, which EIA does not publish per utility.

#### Scenario: Distribution co-op with no plants
- **WHEN** a co-op operates no plants
- **THEN** the section says it buys all of its power and links to its balancing authority's generation mix

### Requirement: Connections to other pages and tools
The page SHALL link to the utility's owned plants, its balancing authority, its service-area counties, its URDB rates (with count and newest update date), its get-your-data guide (or the generic guide when none exists), the household bill check and plan finder, and the load and bill workbench, each preset to this utility through the URL fragment (never a query string).

#### Scenario: Rates link
- **WHEN** URDB has 23 rates for the utility
- **THEN** the page shows "23 rates in the OpenEI database, newest updated <date>" and a link that opens the bill tools with this utility selected

### Requirement: Content minimum
A utility page SHALL be generated only if it has at least four sourced facts for the latest data year; otherwise the utility appears in its state's list without its own page.

#### Scenario: Thin record
- **WHEN** a retail marketer reports only one sales figure
- **THEN** no page is generated and the state page lists it with that figure
