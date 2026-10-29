## Purpose

Uses a customer's own interval data to estimate remaining capacity on their existing electric service by the measured-demand method, as a starting point for their electrician.

## ADDED Requirements

### Requirement: Data sufficiency check
The tool SHALL accept either 12 months of 15-minute interval data or of monthly maximum demand (kW) from demand-metered bills, or at least 30 consecutive days of 15-minute data, matching the data periods the cited NEC section allows. It SHALL say which condition the data meets, or why it meets neither.

#### Scenario: Gappy month
- **WHEN** one month of a 12-month file has 90% of its intervals
- **THEN** the tool says that month does not qualify and names it

### Requirement: Resolution and completeness
Files coarser than 15 minutes SHALL be refused for headroom, because hourly averages understate 15-minute maximum demand. Months with less than 95% of intervals, or a 30-day window with any gap over 1 hour, SHALL not qualify.

#### Scenario: Hourly file
- **WHEN** a household file has 12 months of hourly data
- **THEN** the tool explains that hourly data understates maximum demand, offers the 12-month bill entry if the account is demand-metered, and produces no headroom figure from the hourly file

#### Scenario: Too little data
- **WHEN** a file has 20 days of 15-minute data
- **THEN** the tool says at least 30 days of 15-minute data or 12 months are needed and does not produce a headroom figure

### Requirement: Headroom calculation
The tool SHALL take the maximum demand in the qualifying data as fixed 15-minute averages (re-averaging 5-minute data first) in kW, convert it to kVA using a file-measured power factor or a user-entered one (default 1.0, shown with the headroom at 0.90 for comparison), multiply by 125%, convert to amps at the service voltage and phase (single-phase: kVA × 1,000 ÷ V; three-phase: kVA × 1,000 ÷ (√3 × V)), and subtract from the service rating in amps to report headroom in amps and kVA.

#### Scenario: Three-phase service
- **WHEN** maximum demand is 120 kW, power factor 0.95, service 480 V three-phase rated 400 A
- **THEN** demand is 126.3 kVA, ×125% is 157.9 kVA, 189.9 A, and headroom is 210.1 A (174.7 kVA)

### Requirement: Meter totals and phases
The tool SHALL state that utility meter data is the service total and assumes balanced phases, that the 30-day method in the code is based on the highest-loaded phase, and that per-phase recordings, when the user has them, replace the meter total. When a file holds several meters, the user SHALL pick the meters on the service being checked.

#### Scenario: Balanced-phase note
- **WHEN** a three-phase report uses utility meter data
- **THEN** the balanced-phase assumption appears beside the maximum demand

### Requirement: Sites with generation or peak shaving
When the file shows exported energy, or the user says the site has solar, wind, a battery, or any peak shaving, the tool SHALL say that the cited section restricts the measured-demand method for such sites, SHALL NOT produce a 30-day-based headroom figure, and SHALL defer to the authority having jurisdiction.

#### Scenario: Solar home
- **WHEN** a 15-minute file contains received-energy (export) intervals
- **THEN** the tool explains the restriction with the section citation and offers the 12-month figure only if the cited edition allows it, with the inspector note

### Requirement: Verification
The calculation SHALL reproduce at least two worked existing-load examples from published electrician training or inspection guidance (cited, not copied beyond the numbers; for example the EC&M worked example in `docs/research/07`) and the 480 V scenario, within 0.1 A.

#### Scenario: Published example
- **WHEN** CI runs a stored published example
- **THEN** the headroom in amps matches within 0.1 A

### Requirement: Code citation without NFPA text
The report SHALL cite the NEC edition and section the user selects, with no default (the section is 220.87 in the 2023 NEC and 120.87 in the 2026 NEC), paraphrase the method, and state that the authority having jurisdiction decides which edition applies and whether the method may be used. It SHALL NOT reproduce NFPA text.

#### Scenario: Edition shown
- **WHEN** a report is generated
- **THEN** it names the edition and section, the paraphrased method, and the inspector disclaimer

### Requirement: Printable report and handoff
The tool SHALL produce a one-page printable report with the data period, maximum demand and when it occurred, the calculation steps, and the headroom, and SHALL link to roughlogic.com for conductor and full load calculations.

#### Scenario: Report for an electrician
- **WHEN** a user prints the report
- **THEN** every input and step is shown so the electrician can check it by hand
