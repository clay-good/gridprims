## 1. Shell (no data dependency)

- [x] 1.1 Put a one-line description beside the wordmark in the rail, hidden below 720 px; verify in the browser driver at 1280 px and 360 px that it shows and hides and that nothing scrolls sideways
- [x] 1.2 Replace the footer link list with four cards (All tools, GitHub, Privacy and about, maintainer credit); verify each card is one link target, the catalog opens from it, and the cards reflow one-up, two-up, four-up at 320, 600, and 1280 px
- [x] 1.3 Move the command bar to the centre of the home page under the hero and keep it beneath the rail elsewhere; verify the same keyboard path, listbox behaviour, and prefill on both placements

## 2. Queue data as JSON

- [x] 2.1 Emit `dist/queue/<ST>.json` from the summaries `site/entities/queue.mjs` already computes, carrying state and per-county active MW, count, mix by type, median years, withdrawal share with cohort size, release and as-of; verify against the HTML state page that both render identical figures
- [x] 2.2 Assert in CI that no emitted queue JSON carries a point-of-interconnection or substation field; verify the check fails on a fixture row that contains one
- [x] 2.3 Serve the queue JSON with the data library's open-data headers; verify in the worker test
- [x] 2.4 Decide how a negative published capacity is shown. LBNL's file carries 16 rows with a negative `mw_1`, so a county total can read "-53 MW solar" on the queue page today. Do not alter the publisher's value; either report it as given with a note naming the count, or report the type total and the negative separately. Verify Travis County, TX renders the chosen treatment and that the figure still reconciles with the state page

## 3. The siting read-out

- [x] 3.1 Build the place and size inputs and the on-device join of ZIP shard, large-load prefill, and queue JSON; verify the Travis County scenario end to end in the browser driver and that no request carries the ZIP or the size
- [x] 3.2 Report the size against the utility's Form 714 peak, falling back to the balancing authority's with an explicit label; verify both paths against a utility that files and one that does not
- [x] 3.3 Report county queue figures with the withdrawal guard and the state fallback; verify a county below the cohort minimum omits the share and offers the state figure
- [x] 3.4 Name the applicable federal interconnection process for a generation size and link to the screens tool; verify against the SGIP ladder already encoded in `interconnect.process.route`
- [x] 3.5 State the CEII resolution limit beside the answer and link the serving utility's hosting-capacity map where the directory knows one; verify the sentence is present in the served HTML and that no feeder figure is shipped
- [x] 3.6 Make the read-out work without JavaScript as far as the served HTML allows; verify the headline, inputs, and resolution statement are in the HTML and the form degrades to an explanatory page

## 4. Home page and index

- [x] 4.1 Replace the home page body with the read-out; verify the first-screen scenarios at 1440 x 900 and 360 x 640 and that the workbench is still reachable from the catalog and the search bar
- [ ] 4.2 Add places to the command index and measure the index size against the performance budget; verify a ZIP, a county, a utility, and a balancing authority each match, and record the measured size in the design's open question
- [x] 4.3 Update the home and navigation specs and tests that assert the old home page; verify the full suite and the checks pass
