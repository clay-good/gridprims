## Purpose

Puts a US energy grid professional in front of a working instrument on the first screen, with one thing to do, and keeps every page reachable at a stable address. A household on a phone is served by the same front door, not by a second one.

## ADDED Requirements

### Requirement: The home page is the instrument, not a menu of them
The home page SHALL open on the load and bill workbench itself, already working on the shipped sample meter file, so the first screen shows a measured result rather than a promise or a list of links: a headline naming what this is for a grid professional, one primary action (drop or choose an interval file), and the sample's peak demand, the day's stepped load curve, and its basis. The home page SHALL NOT carry the command bar: one headline and one action are the whole offer, and a search field beside them competes with both. Every other page SHALL keep it. Dropping a file SHALL replace the sample in place, without navigating to another page.

The home page SHALL NOT present lanes, grids, or rows of tool cells. Every other tool SHALL be reachable from one "All tools" link and from the footer, never from the home page's first screen.

#### Scenario: A professional arrives cold

- **WHEN** the home page loads at 1440 × 900 px
- **THEN** a measured value computed from the sample file is visible without scrolling, beside its curve and its basis, exactly one primary action asks for an interval file, and no command bar competes with it

#### Scenario: Phone first screen

- **WHEN** the home page loads at 360 × 640 px
- **THEN** the headline, the primary action, and a measured value are visible without scrolling, and nothing scrolls sideways

#### Scenario: Dropping a file does not navigate

- **WHEN** a visitor drops an interval file on the home page
- **THEN** the sample's figures are replaced by that file's, on the same page, and nothing is uploaded

#### Scenario: Works without JavaScript
- **WHEN** the home page loads with JavaScript disabled
- **THEN** the sample's figures, curve and basis are still shown, the primary action is a link to the workbench, and the "All tools" link works

### Requirement: One rail, no sections
The top rail SHALL carry the wordmark, one "All tools" link, and the theme control, and nothing else. Section tabs SHALL NOT appear in the rail: a visitor who wants breadth goes through "All tools", and a visitor who wants depth is already in the instrument.

#### Scenario: The rail holds three things

- **WHEN** any page loads
- **THEN** the rail shows the wordmark, "All tools", and the theme control, and no section tabs

### Requirement: Simplicity budget
The visitor-facing surface SHALL stay inside fixed limits, checked in the build: no section tabs in the top rail; no tool cells on the home page; at most 5 inputs and at most one chart visible on a tool page's first screen; and no modal, overlay, tour, banner, or interstitial on arrival, including cookie and consent notices, which are unnecessary because nothing is stored or tracked.

#### Scenario: Budget exceeded
- **WHEN** a change would put a seventh section in the top rail or a sixth cell in a lane
- **THEN** the build fails and names what must be removed or merged first

#### Scenario: Nothing interrupts arrival
- **WHEN** a first-time visitor opens any page
- **THEN** the page's content is the first thing they see, with no overlay, tour, banner, or consent prompt

### Requirement: Each tool declares its first-screen inputs
Every tool manifest SHALL name the inputs that appear on its first screen, and the build SHALL check that set against the limit of 5 however many inputs the tool has in total. Every other input SHALL sit behind one "More options" control.

#### Scenario: Input-heavy tool
- **WHEN** the line-rating tool declares 13 inputs and names 5 of them as its first-screen set
- **THEN** the build passes and renders the other 8 behind "More options"; had it named 6, the build would fail

### Requirement: Growth replaces, it does not accumulate
A new tool SHALL reach a home-page lane only by replacing a cell already there, decided by the value measures in `plan-launch-and-value-proof`, and the catalog SHALL remain the one place where every tool is listed. The home page SHALL NOT grow a new row to fit a new tool.

#### Scenario: New tool promoted
- **WHEN** a new tool earns a place on the home page
- **THEN** the change names the cell it replaces, and the replaced tool remains in the catalog and its section page

### Requirement: Tool cells say what you need
Every tool cell on the home page, section pages, and catalog SHALL show the DESIGN.md furniture: name, the question it answers, what you need (nothing, a ZIP code, bill totals, or a meter file), and the data as-of date. Cells SHALL make no accuracy, popularity, or endorsement claim the build does not prove.

#### Scenario: Cell for the bill check
- **WHEN** the "Check my bill" cell renders
- **THEN** it reads "You need: bill totals or a meter file" and shows the URDB snapshot date

### Requirement: Section navigation
Every page SHALL carry the top rail with the sections Home, Bills, Data, Carbon, Grid, and Learn, mark the current section with `aria-current`, and collapse to a menu button below 768 px. Each section SHALL have a landing page listing its stable and experimental tools as tool cells. Tools that are not yet built SHALL NOT appear anywhere, including as "coming soon".

#### Scenario: Phase 2 tool hidden
- **WHEN** the line-rating calculator has no stable or experimental manifest
- **THEN** no page, menu, sitemap, or command-bar result mentions it

### Requirement: Tool catalog
A catalog page SHALL list every published tool with filters for section, what you need (nothing, ZIP, bill totals, meter file), and stability. Experimental tools SHALL carry the work-zone "Preview" label. The catalog SHALL be generated from manifests.

#### Scenario: Filter by input
- **WHEN** a user filters to "What you need: bill totals"
- **THEN** only tools whose manifest accepts monthly totals are listed

### Requirement: Stable URLs keyed by ids
Pages SHALL use the URL scheme in design D2, keyed by EIA utility id, EIA plant code, balancing authority code, state postal code, eGRID subregion code, dataset id, or tool id. When a slug changes or entities merge, the build SHALL add a permanent (301) redirect from every URL ever published to its successor, and a CI check SHALL fail if a previously published URL neither resolves nor redirects.

#### Scenario: Utility renamed
- **WHEN** EIA-861 renames utility 14328 and its slug changes
- **THEN** the old URL returns a 301 to the new one, and the sitemap lists only the new one

### Requirement: Redirect rules stay inside the host's cap
Because the host caps the number of redirect rules, the build SHALL keep the rule count at or below 1,500, which leaves headroom under the host's static-rule cap, collapse rules to prefix patterns where it can, and fail with the count and the largest groups named when the budget is reached.

#### Scenario: Redirect budget reached
- **WHEN** accumulated renames would push the rule count past 1,500
- **THEN** the build fails, names the count and the largest groups, and the entity ids in the URL scheme mean most renames need no rule at all

#### Scenario: Removed page
- **WHEN** a plant falls below the content minimum after a data release
- **THEN** its old URL redirects to its state page with a note in the data library changelog, rather than returning 404

### Requirement: Helpful 404
The 404 page SHALL suggest up to five close matches from the command index computed on the device from the requested path, and without JavaScript SHALL list the sections and the catalog. It SHALL NOT send the requested path anywhere.

#### Scenario: Mistyped utility URL
- **WHEN** a visitor opens `/utility/oncor/`
- **THEN** the 404 page offers Oncor Electric Delivery's page as the first suggestion
