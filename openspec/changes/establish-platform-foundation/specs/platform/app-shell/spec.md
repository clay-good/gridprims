## Purpose

The shared frame around every page: the command bar, the four page archetypes in DESIGN.md, themes, offline use, and the speed budgets that make gridprims feel instant.

## ADDED Requirements

### Requirement: Command bar on every page
Every page SHALL show a command bar that accepts plain words with numbers and units (for example "12 MWh to MMBtu" or "500 kW 2,000 kWh battery") and SHALL open the best-matching tool with the parsed values filled in. It SHALL rank tools, entity pages (utilities, plants, regions), datasets, and Learn entries (glossary terms, guides, get-your-data guides) in one list, run entirely on the device, and open with `⌘K`, `Ctrl+K`, or `/`.

#### Scenario: Numbers carried into the tool
- **WHEN** a user types "12 MWh to MMBtu" and presses Enter
- **THEN** the unit converter opens with 12 MWh entered and shows the result in MMBtu

#### Scenario: Entity search
- **WHEN** a user types the name of a utility
- **THEN** that utility's page appears in the results above tools whose names merely contain a matching word

### Requirement: Page archetypes conform to DESIGN.md
Every page SHALL be one of the archetypes in DESIGN.md's Components and state tables (calculator, file workbench, entity page, explorer) and SHALL use only the tokens and components defined there.

#### Scenario: Unknown color rejected
- **WHEN** a component rule uses a literal color instead of a token
- **THEN** the style lint fails the build

### Requirement: Live recompute without submit
Calculator and workbench inputs SHALL recompute results on change, with no submit button. If a recompute takes longer than 100 ms, the previous result SHALL stay visible marked as updating.

#### Scenario: Screen readers are not flooded
- **WHEN** a user drags a slider and the answer changes 10 times a second
- **THEN** the visible answer updates live, and the `aria-live` announcement happens once, 500 ms after the input settles

#### Scenario: Slider drag
- **WHEN** a user drags the battery power slider on a one-year 15-minute file
- **THEN** the threshold line and savings update at least 10 times per second on the reference profile

### Requirement: Themes
The site SHALL offer the light and night (dark) themes defined in DESIGN.md, SHALL follow the operating system's `prefers-color-scheme` setting, SHALL use light when the system states no preference, and SHALL apply a saved user choice before first paint so no frame flashes the wrong theme.

#### Scenario: Saved light theme on a dark system
- **WHEN** a user who chose light reloads any page on a device set to dark mode
- **THEN** the first painted frame is light

#### Scenario: No preference anywhere
- **WHEN** a new visitor's system states no color-scheme preference
- **THEN** the page renders in the light theme

### Requirement: Offline after first visit
The site SHALL be installable and SHALL run every calculator and file workbench offline after the first visit. Entity pages and datasets SHALL work offline if previously opened.

#### Scenario: Airplane mode
- **WHEN** a user who visited the load workbench before opens it offline and drops a file
- **THEN** the file parses and all results compute

### Requirement: Performance budgets
On the reference profile (Chrome with 4× CPU slowdown and 150 ms round-trip, 1.6 Mbps down, 750 kbps up, the mobile profile Lighthouse uses), the first answer on any tool page (the answer sign's largest contentful paint) SHALL render within 1.5 s, the initial JavaScript for a tool page SHALL be at most 150 KB compressed, and entity pages SHALL render their facts with JavaScript disabled.

#### Scenario: Budget regression
- **WHEN** a change pushes a tool page over its JavaScript budget
- **THEN** CI fails and names the page and the overage

### Requirement: Popovers that respect the pointer and keyboard
Glossary and help popovers SHALL open on hover, focus, or tap, stay open while the pointer is over the trigger or the popover, close with Escape without moving focus, and stay until dismissed (WCAG 2.2 success criterion 1.4.13).

#### Scenario: Escape closes
- **WHEN** a keyboard user opens a glossary popover and presses Escape
- **THEN** the popover closes and focus stays on the term

### Requirement: Accessibility and mobile gates
Every page SHALL meet WCAG 2.2 AA, SHALL be fully usable by keyboard (including sliders and dropzones), SHALL have no horizontal page scroll at 320 px, and every chart SHALL have a text summary and a table view.

#### Scenario: Keyboard-only file load
- **WHEN** a keyboard user focuses the dropzone and presses Enter
- **THEN** the file picker opens

### Requirement: Grid pulse shows dated real data
The top-rail grid pulse SHALL show a sparkline of the lower-48 total, or of a balancing authority the user picks (stored only as a saved preference), using the 14 most recent daily peak demand values (MW) from our EIA-930 snapshot, stamped "as of <date>" with the source. It SHALL NOT animate simulated values or describe itself as live. It ships with phase 1 data; before a snapshot exists it SHALL be hidden.

#### Scenario: Weekly snapshot
- **WHEN** the latest snapshot ends six days ago
- **THEN** the pulse shows the last 14 daily values with "as of" and that date

#### Scenario: No snapshot
- **WHEN** the region has no data in the snapshot
- **THEN** the pulse is hidden
