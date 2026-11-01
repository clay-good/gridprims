## Purpose

Makes the first screen one question with one answer, and moves every other capability behind a search bar and a footer card, so a visitor knows what this site is for in the time it takes to read a line.

## ADDED Requirements

### Requirement: The home page is the siting read-out
The home page SHALL open on the siting read-out and nothing else above the search bar: a headline naming the question it answers, the place and size inputs, and, once answered, the read-out itself. It SHALL NOT carry tool cells, lanes, section tabs, a meter-file dropzone, or a worked sample of another tool. The meter-file workbench SHALL remain reachable from the search bar, the tool catalog, and its own stable address.

#### Scenario: A siting professional arrives cold
- **WHEN** the home page loads at 1440 x 900 px
- **THEN** the headline, the place input, and the size input are visible without scrolling, exactly one primary action submits them, and no other tool competes for the first screen

#### Scenario: Phone first screen
- **WHEN** the home page loads at 360 x 640 px
- **THEN** the headline and both inputs are visible without scrolling and nothing scrolls sideways

#### Scenario: Without JavaScript
- **WHEN** the home page loads with scripting disabled
- **THEN** the headline, the inputs, and the resolution statement are present in the served HTML, and the form submits to a page that explains what the read-out needs

### Requirement: One centred search bar under the read-out
The home page SHALL carry the command bar centred beneath the read-out, with its examples listed under it, as the single route to every other capability. Every other page SHALL keep the command bar directly beneath the rail. The command index SHALL include places as well as tools and glossary terms, so a state, county, utility, balancing authority, or bare ZIP code matches.

#### Scenario: Asking for a tool by name
- **WHEN** a visitor types a tool's name or a unit conversion into the home page's search bar
- **THEN** the matching tool is offered and opens with its inputs prefilled, exactly as the rail's command bar does elsewhere

#### Scenario: Asking for a place
- **WHEN** a visitor types a county, a utility name, or a 5-digit ZIP code
- **THEN** the matching place is offered and opens its page or its read-out

### Requirement: The rail says what the site answers
The top rail SHALL carry the wordmark, one line of description naming the question the site answers, and the theme toggle pinned right. It SHALL NOT carry section tabs. Below 720 px the description SHALL be hidden and the wordmark SHALL stand alone.

#### Scenario: A visitor reads the rail
- **WHEN** any page loads at 1280 px
- **THEN** the rail shows the wordmark, the description line, and the theme control, and no section navigation

### Requirement: The footer is four cards
The footer SHALL present four cards, each a single link target: All tools, the source repository, privacy and about, and the maintainer's credit linking to the maintainer's own site. The licence and privacy statements SHALL remain as plain text beneath them. The footer SHALL NOT present a list of trust-page links in place of the cards; those pages remain reachable from the privacy and about card.

#### Scenario: A visitor reaches the catalog
- **WHEN** a visitor opens the All tools card from any page
- **THEN** the full tool catalog opens, and every tool the site publishes is listed there

#### Scenario: Credit and source
- **WHEN** the footer renders
- **THEN** one card links to the public source repository and one names the maintainer and links to their site
