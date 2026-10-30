## 1. Data

- [ ] 1.1 Build the build-time pipeline from the agency's bulk files to monthly per-unit and hourly per-region-year shards; verify no file exceeds the per-file budget and the total stays inside the file-count gate
- [ ] 1.2 Register the dataset with EPA's own stated terms captured verbatim, the suggested citation, and the posture derived from those terms rather than an assumed public-domain or federal-works basis; verify the registry and open-item scenarios
- [ ] 1.3 Keep the agency key out of every shipped artifact; verify the key-absent scan and that the no-network tests still pass
- [ ] 1.4 Build unit-to-plant, unit-to-region, and unit-to-fuel crosswalks with an unmatched-rows report; verify no row is matched by name alone
- [ ] 1.5 Run the 10-unit, 3-state, 2-year check against the agency's published summaries; verify every value matches or is documented

## 2. Plant and region views

- [ ] 2.1 Add the plant page measured section beside the estimated figures; verify the measured-beside-estimated and not-monitored scenarios
- [ ] 2.2 Show coverage share on every measured figure; verify the partial-coverage scenario
- [ ] 2.3 Flag apportioned units; verify the shared-stack scenario
- [ ] 2.4 Build the peak-hour generation detail view; verify the peak-hour scenario

## 3. Estimated against measured

- [ ] 3.1 Implement the like-for-like comparison with its matching rules; verify the scoped-comparison scenario
- [ ] 3.2 Publish the difference by region, year, month, and hour of day; verify the summer-evenings scenario
- [ ] 3.3 Implement the 40% coverage floor, named as ours; verify the mostly-unmonitored scenario
- [ ] 3.4 Link the comparison from every hourly carbon result and caveat; verify the caveat-carries-a-number scenario
- [ ] 3.5 Publish the method and downloadable inputs; verify the reproduce-the-figure scenario within 0.1 percentage point
- [ ] 3.6 Store the 3-region, 2-year independent recomputation; verify within 0.5 percentage points

## 4. Surfaces

- [ ] 4.1 Serve measured plant and region figures through `gridprims_query_data`; verify they match the pages
- [ ] 4.2 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
