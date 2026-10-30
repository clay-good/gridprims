## Purpose

Gets every visitor, a household on a phone or a professional at a desk, from the front door to the tool or page that answers their question in one screen, and keeps every page reachable at a stable address.

## ADDED Requirements

### Requirement: Command-first home with two doors
The home page SHALL show, in its first viewport at 360 × 640 px and wider, the command bar and two labeled lanes of tool cells: "For your home" (check my bill, is my use high, cheapest plan on my data, find my utility, cleanest hours to use power) and "For your work" (load and bill workbench, utility and plant data, hourly emissions, data library, agent server for developers).

#### Scenario: Phone first viewport
- **WHEN** the home page loads at 360 × 640 px
- **THEN** the command bar and the first cell of each lane are visible without scrolling, and nothing scrolls sideways

#### Scenario: Works without JavaScript
- **WHEN** the home page loads with JavaScript disabled
- **THEN** every cell is a working link, and the command bar is replaced by a link to the tool catalog

### Requirement: Simplicity budget
The visitor-facing surface SHALL stay inside fixed limits, checked in the build: at most 6 sections in the top rail; at most 5 tool cells per home-page lane; at most 5 inputs visible on a tool page's first screen, with any others behind one "More options" control; at most one chart on a tool page's first screen; and no modal, overlay, tour, banner, or interstitial on arrival, including cookie and consent notices, which are unnecessary because nothing is stored or tracked.

#### Scenario: Budget exceeded
- **WHEN** a change would put a seventh section in the top rail or a sixth cell in a lane
- **THEN** the build fails and names what must be removed or merged first

#### Scenario: Nothing interrupts arrival
- **WHEN** a first-time visitor opens any page
- **THEN** the page's content is the first thing they see, with no overlay, tour, banner, or consent prompt

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

#### Scenario: Removed page
- **WHEN** a plant falls below the content minimum after a data release
- **THEN** its old URL redirects to its state page with a note in the data library changelog, rather than returning 404

### Requirement: Helpful 404
The 404 page SHALL suggest up to five close matches from the command index computed on the device from the requested path, and without JavaScript SHALL list the sections and the catalog. It SHALL NOT send the requested path anywhere.

#### Scenario: Mistyped utility URL
- **WHEN** a visitor opens `/utility/oncor/`
- **THEN** the 404 page offers Oncor Electric Delivery's page as the first suggestion
