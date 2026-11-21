## 1. Data

- [ ] 1.1 Derive typical residential hourly shapes by county from NLR ResStock baseline (CC BY 4.0) with heating-fuel variants, packed into state shards; register with credit and the pinned release; verify each shape sums to 1.0 per month within 0.0001 and no request names a county (blocked on a design choice, checked 2026-11-21: no ResStock release since 2022 publishes county aggregates; the 2025 and 2024 AMY releases aggregate only by state, building type, climate zone, and ISO region, 15-minute, with no heating-fuel split, so county shapes would mean aggregating individual building timeseries; design D3 needs to choose state-by-building-type or climate-zone shapes, with fuel variants from the end-use columns, or the individual-building route; 3.3 waits on this)
- [x] 1.2 Add residential tariff filters (sector, delivery versus bundled, conditions) over the URDB snapshot; verify 20 sampled tariffs classify correctly by hand
- [ ] 1.3 Add TDU delivery tariffs for Texas competitive areas from PUCT-approved tariffs, versioned by effective date, and a CCA-served ZIP flag from public CCA service-area lists; verify against each TDU's published rate sheets for two effective dates
- [ ] 1.4 Add discount-program modifiers (CARE, FERA, medical baseline) from tariff text; verify the CARE scenario

## 2. Bill totals

- [x] 2.1 Period entry with validation flags and TOU kWh by period; verify the overlapping, duplicate, typing-error, and net-metered scenarios
- [x] 2.2 Totals pricing with day proration; verify the $115.00 and the 480/420 kWh scenarios
- [x] 2.3 Paid-amount comparison and effective price; verify the +$16.40 and 14.38-cent scenarios
- [x] 2.5 Mid-cycle forecast with the weekday-scaled method; verify the fourteen-days-in, demand-not-final, and too-little-data scenarios
- [x] 2.4 Store five published bill examples and three EFLs; verify to the cent and 0.1 cent per kWh (the five published bills: verify/fixtures/bill/published-examples.mjs names five Louisiana PSC bills, five schedules at the commission's own levels, from the bill test vectors, and verify/tests/core/published-bills.test.mjs runs each through household.bill-totals.check with the tariff as entered JSON, matching to the cent; the three EFLs: verify/fixtures/bill/efls.mjs holds Budget Power on Oncor, Reliant on CenterPoint, and Infuse on AEP Texas Central, read from each EFL with its date, version, address, and SHA-256 and the TDU charges it passes through, and verify/tests/core/efl-average.test.mjs gives each printed average to 0.1 cent at 1,000 kWh and within 0.05 cent at 500 and 2,000 kWh, the edge where 16 TAC § 25.475 rounds unrounded charges and a bill rounds each line first)

## 3. Benchmark and plan finder

- [x] 3.1 Benchmark with annualization and the pattern checklist; verify the 20%, 213-day, and 2.6× scenarios
- [x] 3.2 Plan finder ranking with conditions and URDB metadata; verify the $128 and EV scenarios
- [ ] 3.3 Totals-based TOU estimate and its error report; verify the published estimate error on three fixtures
- [x] 3.4 Texas EFL and CCA entry with supply-plus-delivery pricing; verify the $163.34 and CCA scenarios
- [x] 3.5 Shift what-if; verify the EV-shift scenario

## 4. Surfaces

- [x] 4.1 Run worked examples through the MCP server; verify identical structured results
- [x] 4.2 DESIGN.md gates on a 360 px phone first, then desktop, both themes, keyboard; verify CI green
