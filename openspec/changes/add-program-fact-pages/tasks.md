## 1. Program links (with phase 1 Learn)

- [ ] 1.1 Define the index record schema with last-checked dates; verify an entry missing a maintainer or reason fails the check
- [ ] 1.2 Write the launch entries and group them by question; verify the completeness check against every manifest handoff
- [ ] 1.3 Add the weekly link check and the 12-month review chip; verify the moved-target scenario and that no URL carries a tracking parameter

## 2. Net metering (phase 3)

- [x] 2.1 Add the net metering and non-net-metering distributed generation files to the registry and pipeline; verify the source stamp and row counts against the publisher's files
- [x] 2.2 Render state pages with sector and technology breakouts and the pre-breakout note; verify the technology-split and pre-2010 scenarios
- [x] 2.3 Add the utility page section and the rules links; verify the reported-none and no-rule-text scenarios
- [x] 2.4 Run the 5-state, 2-year check against the publisher's summary tables; verify every value matches or is documented

## 3. Community solar (phase 3)

- [x] 3.1 Capture the publisher's landing page automatically and record the license, date, and quoted text in the registry, downgrading the posture to link-only when no terms are found, with no human confirmation step and nothing blocked; verify the capture and downgrade scenarios
- [x] 3.2 Render state pages with status and program-type splits; verify the status-split and no-combined-headline scenarios
- [x] 3.3 Add the required credit everywhere the dataset appears; verify the credit scenario
- [x] 3.4 Run the summary check; verify counts and capacity match for the recorded snapshot

## 4. Qualifying facility (phase 3)

- [x] 4.1 Write the checklist from the current form, its instructions, and the regulation, with per-statement citations and check dates; verify the no-determination, no-calculator, and exemption scenarios

## 5. Surfaces

- [x] 5.1 Serve the net metering and community solar figures through `gridprims_query_data`; verify they match the pages
- [ ] 5.2 DESIGN.md gates (both themes, 320 px sweep, keyboard pass, print, performance budget); verify CI green
