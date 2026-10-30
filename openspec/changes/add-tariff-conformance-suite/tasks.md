## 1. Ground truth

- [ ] 1.1 Identify every state commission bill-comparison publication, record its terms per state, and exclude any whose terms restrict reuse; verify the redistribution-basis-per-state scenario
- [ ] 1.2 Extract rows with per-figure provenance (document, date, page, utility, consumption level, stated assumptions); verify the row-provenance, unstated-taxes, and ambiguous-figure scenarios
- [ ] 1.3 Extract every figure twice by two independent methods, exclude and count disagreements automatically, and publish the rate each release; verify the error-rate scenario
- [ ] 1.4 Publish coverage by state, commission, utility, and consumption level, with absences and reasons; verify the missing-state scenario
- [ ] 1.5 State what the regulator figures do and do not prove before every table and download; verify the limits-stated scenario

## 2. Test vectors

- [ ] 2.1 Define the vector format and its validator, emitting tariffs in the open interchange format with its structural validation in CI; verify the vector-fields and charge-types-declared scenarios
- [ ] 2.2 Implement the provenance rules, including the refusal of self-generated expected values and the no-personal-data rule for user-supplied bill figures; verify both scenarios
- [ ] 2.3 Build the first release from the ground-truth dataset; verify its coverage table names every charge type with no coverage
- [ ] 2.4 Publish versioned releases under CC BY 4.0 with a changelog and no account; verify the anyone-can-run-it scenario
- [ ] 2.5 Gate the bill engine on the suite in CI; verify the our-own-failure scenario blocks a release
- [ ] 2.6 Run the suite on the device from the conformance page; verify the visitor-runs-the-suite scenario

## 3. Scorecard

- [ ] 3.1 Implement the per-rate comparison with arithmetic shown and untestable rates counted; verify the disagreement-reported and untestable-rate scenarios
- [ ] 3.2 Implement counts and distributions with no composite index; verify the no-composite scenario and that no ranking appears
- [ ] 3.3 Implement the disagreement wording rules and the confirmed-error record; verify the unresolved and confirmed scenarios
- [ ] 3.4 Publish disagreements immediately and record any upstream report afterwards; verify the published-immediately and reported-later scenarios
- [ ] 3.5 Publish the method, versions, checksums, rate list, and results as files; verify an independent rerun reproduces the numbers
- [ ] 3.6 Include our own engine in the table; verify the our-result-shown scenario
- [ ] 3.7 Wire the scorecard into validation levels and the limits page; verify the validation-level-raised scenario

## 4. Upstream and surfaces

- [ ] 4.1 File every schema gap found against the open interchange format upstream, recording the date and reference; verify each namespaced extension has a filed upstream issue
- [ ] 4.2 Run the suite through the MCP server; verify identical structured results and that the validation level accompanies every bill result
- [ ] 4.3 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
