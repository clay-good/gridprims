## 1. Stages and rows

- [x] 1.1 Add `core/lib/project-stages.mjs` with the status mapping, the 24-month window, and the plant-and-stage rows; verify with unit tests for each status, an unknown status, both window edges, and a plant in two stages
- [x] 1.2 Add `site/entities/projects.mjs` for national, state, county, and balancing-authority totals, including unconfirmed counties, missing balancing authorities and dates, passed dates, and canceled or postponed counts; verify with fixture rows for each case
- [x] 1.3 Commit an independent Python recount of the published generators file under `verify/reference/` and list it in `docs/reference-artifacts.md`; verify that release 2026-10 matches every stage count exactly and every capacity within 0.1 MW
- [x] 1.4 Look for an EIA-published planned-additions table to compare with the stage totals; verify by recording the match, or the reason it cannot be compared, in `docs/reference-artifacts.md`

## 2. Published files and safety

- [x] 2.1 Emit `dist/projects/<st>.json` from the build; verify that Texas holds only Texas rows, that its rows match its page, and that the largest state file is at or below 40 KB compressed
- [x] 2.2 Serve project JSON with open-data headers in `worker/index.mjs`; verify in `verify/tests/site/worker.test.mjs` that `/projects/tx.json` allows any origin
- [x] 2.3 Extend `verify/gates/ceii.mjs` to scan project files and reject coordinate field names; verify that fixtures with `latitude`, `poi_name`, and `substation` each fail and a clean file passes

## 3. Pages

- [x] 3.1 Add the `/projects/` national page and strings; verify its opening sentence, stage totals, and state and balancing-authority tables against the reference figures
- [x] 3.2 Add the `/projects/<st>/` state pages with rows, county totals, plant links, and the separate queue line; verify on Texas, DC, and Virginia's unconfirmed county, and that every plant link resolves
- [x] 3.3 Add the on-page filters in `site/pages/projects.js`; verify in the browser driver the combined filter, the empty state, the announced count, keyboard use, no network request on filtering, and the full list with JavaScript off
- [x] 3.4 Add the Grid page cell, the links between queue and project pages, and the sitemap entry; verify with `verify/tests/site/reachable.test.mjs` and `verify/tests/site/sitemaps.test.mjs`, and that the home page is unchanged
- [x] 3.5 Confirm EIA's coverage wording from its form instructions and write the limits text; verify that the limits sentence is in the served HTML of the national page and a state page
- [x] 3.6 Add a limits-page entry refusing completion odds and finish-date forecasts, and list the new module in `docs/own-implementations.md`; verify with `npm run check`

## 4. Release checks

- [x] 4.1 Add `/projects/`, `/projects/tx/`, and `/projects/dc/` to `verify/browser/pages.mjs`; verify both themes, 320 px width, and accessibility in the Firefox browser run
- [x] 4.2 Run the targeted tests for the new modules and `npm run check`; verify that both pass before the change is marked complete
- [ ] 4.3 Run the print and reference-profile performance checks on these pages in Chrome; verify in the CI browser run, because both need the DevTools Protocol and Chrome was not installed where this change was built
