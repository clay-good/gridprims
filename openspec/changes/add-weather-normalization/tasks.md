## 1. Data

- [x] 1.1 Build the station history pipeline (trim to station, date, maximum, minimum) and register it with the federal-works basis and requested citation; verify the registry entry and row counts against the source files
- [ ] 1.2 Ship the published 1991–2020 daily normals with the smoothed-fit caveat; verify the caveat appears wherever a normal-year figure does
- [ ] 1.3 Implement on-device degree-day computation at any base; verify the base-65 scenario and the 5-division, 24-month comparison with the publisher's published division series, and record that the normals are not a verification target
- [ ] 1.4 Pack station history and the station index into the existing state shards with on-device distance ranking; verify the request-privacy and station-receipt scenarios and that no asset URL names a station, county, or ZIP
- [x] 1.5 Implement coverage and gap reporting; verify the 9-day gap scenario

## 2. Baseline model

- [x] 2.1 Implement the four candidates with the balance-point search and rejection rules; verify the gas-heated, negative-coefficient, and selection-shown scenarios
- [x] 2.2 Implement the sufficiency rules with plain-sentence reporting; verify the short-baseline and mild-climate scenarios
- [x] 2.3 Implement fit reporting and the two disqualification thresholds; verify the fit-reported-in-words and poor-fit scenarios
- [x] 2.4 Implement baseline splitting on a stated retrofit, solar, or occupancy date; verify the heat-pump scenario and that no model spans the date
- [x] 2.5 Store reference-implementation outputs for 10 meters and run the comparison; verify model form and balance points match exactly and coefficients within 1%

## 3. Change explainer

- [ ] 3.1 Implement the three-part split including the baseline fit part; verify the three-parts-named, formulas-shown, colder-winter, parts-always-reconcile, and weather-explains-none scenarios
- [ ] 3.2 Implement weather-normalized annual use against the normal year; verify the warm-year scenario
- [x] 3.3 Implement the accuracy range and the too-small-to-call rule; verify the 3%-change scenario
- [ ] 3.4 Implement the causes checklist with no diagnosis; verify no sentence asserts a cause in a snapshot test
- [ ] 3.5 Implement the bills-only path; verify the 24-totals scenario
- [ ] 3.6 Run the five hand-computed fixtures; verify the parts sum exactly and the normalized figure is within 2%

## 4. Surfaces

- [ ] 4.1 Run every worked example through the MCP server; verify identical structured results
- [ ] 4.2 Add the "how unusual was this year" line to `household/usage-benchmark` and the rate-case impact results; verify it names the degree-day comparison and its station
- [ ] 4.3 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
