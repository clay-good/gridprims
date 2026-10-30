## Purpose

Publishes a suite of test cases any electricity bill calculator can run, so a claim that a bill engine is correct becomes something anyone can check.

## ADDED Requirements

### Requirement: What a vector contains
Each vector SHALL contain: a tariff in URPX (LF Energy, version recorded), a load (interval series or monthly totals with their period dates), the expected bill total and expected amount per charge line, the unit of each figure, a tolerance with its unit, the provenance of the expected value, and the list of charge types the vector exercises.

#### Scenario: Vector fields present
- **WHEN** a vector is validated
- **THEN** every listed field is present, and a vector missing a tolerance, a provenance record, or its charge-type list fails the check

#### Scenario: Charge types declared
- **WHEN** a vector exercises a fixed charge and tiered energy only
- **THEN** it declares those two types and no others, so a reader cannot mistake it for evidence about demand charges

### Requirement: Provenance of every expected value
The expected bill SHALL come from one of four sources, recorded per vector with its own citation: a state commission bill-comparison publication (document, date, page, utility, consumption level); a utility's own published typical-bill table; a figure a user read off their own bill and typed in, with no bill document retained; or a hand computation from the filed tariff sheet by a named reviewer on a recorded date. A vector whose expected value came from our own engine SHALL NOT be published.

#### Scenario: Self-generated expected value refused
- **WHEN** a contributor submits a vector whose expected bill our engine produced
- **THEN** the check fails and explains that a vector must have independent provenance

#### Scenario: User-supplied bill figure
- **WHEN** a user contributes the totals from their own bill
- **THEN** the vector records the amounts, the tariff, and the period, and contains no account number, address, meter identifier, or bill document

### Requirement: Published, versioned, and reusable
The suite SHALL be published as files at stable versioned URLs under CC BY 4.0, with a documented format, a changelog, and no account or key required. Each release SHALL state its vector count and its coverage by charge type and by state.

#### Scenario: Anyone can run it
- **WHEN** a developer of another bill engine downloads a release
- **THEN** they receive the vectors, the format documentation, and the coverage summary, with no registration

### Requirement: Independent reference engines where they apply
Where a charge type an existing engine models is exercised, the suite SHALL also record that engine's output as a secondary reference, naming the engine and its version (PySAM `Utilityrate5` or REopt.jl), and SHALL record for each charge type whether those engines model it at all, since neither models power factor or demand windows other than 15 minutes.

#### Scenario: Secondary reference recorded
- **WHEN** a vector exercises tiered energy only
- **THEN** it records a PySAM `Utilityrate5` output with that engine's version as a secondary reference beside the regulator figure

#### Scenario: Charge type the engines cannot check
- **WHEN** a vector exercises a power-factor adjustment
- **THEN** it records that neither reference engine models it, and its only reference is the regulator figure or a hand computation

### Requirement: Our engine is gated on it
The bill engine SHALL run the entire suite in continuous integration, and any vector failing outside its tolerance SHALL block release until the engine is fixed or the vector is shown to be wrong, with that finding recorded.

#### Scenario: Our own failure
- **WHEN** our engine misses a vector by more than its tolerance
- **THEN** the release is blocked, and the failure appears in the public scorecard like any other

### Requirement: Runs in the browser
The suite SHALL be runnable on the device from the site, so a visitor can see the cases pass or fail themselves rather than trusting our report.

#### Scenario: Visitor runs the suite
- **WHEN** a visitor opens the conformance page and runs the suite
- **THEN** every case executes on their device and shows pass, fail, or skipped with the expected and computed values

### Requirement: Coverage is stated, not implied
Each release SHALL publish how many vectors exercise each charge type (fixed, tiered energy, seasonal energy, time-of-use energy, flat demand, time-of-use demand, ratchet, power factor, minimum bill, rider) and SHALL state plainly which types have no coverage.

#### Scenario: Uncovered charge type
- **WHEN** no vector exercises a ratchet
- **THEN** the coverage table shows zero for ratchets and the page says the suite proves nothing about them
