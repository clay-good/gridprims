## Purpose

Gives every term of art on gridprims one plain, cited definition, shown where the term first appears, so households, reporters, and students can follow every result.

## ADDED Requirements

### Requirement: Glossary entries
Each entry SHALL have: term, aliases, a one-line definition of at most 25 words, a longer explanation, the unit where one applies, a worked example with numbers and units, related terms, the tools that use it, and a citation (for example the EIA glossary, a tariff, or a standard cited by section). Entries adapted from EIA's public-domain glossary SHALL say so.

#### Scenario: Demand charge entry
- **WHEN** a visitor opens "demand charge"
- **THEN** the entry shows the definition, the unit $/kW, an example ("412 kW × $18.50/kW = $7,622"), the bill tools that use it, and its citation

### Requirement: Readable definitions
Every one-line definition SHALL score at reading grade 8 or below on the site's own Flesch-Kincaid check, whose implementation SHALL reproduce hand-computed scores for at least five stored sentences spanning the syllable and sentence-length edge cases, exactly to 0.1 grade, and the build SHALL fail on any definition above grade 8.

#### Scenario: Too complex
- **WHEN** a definition reads "The maximum averaged real power demand registered during the billing determinant window"
- **THEN** the readability check fails and names the term and its grade

### Requirement: Definition on first use
Each tool manifest and guide SHALL list the glossary terms it uses. The first use of each listed term on a page SHALL render as a glossary term (DESIGN.md) whose popover shows the one-line definition and a link to the entry. A manifest that lists a term with no entry SHALL fail the build.

#### Scenario: First use only
- **WHEN** "load factor" appears three times on the workbench
- **THEN** only the first appearance is a glossary term

### Requirement: Launch coverage
At launch the glossary SHALL cover every term listed by every phase 1 tool manifest and guide.

#### Scenario: Core terms present
- **WHEN** the launch glossary is built
- **THEN** it includes at least: kW, kWh, demand, demand charge, billing demand, demand window, ratchet, load factor, power factor, time-of-use, tier, fixed charge, rider, interval data, Green Button, 8760, coincident peak, 4CP, 5CP, peak load contribution, capacity tag, balancing authority, eGRID subregion, emission rate, consumption-based intensity, hourly matching, carbon-free energy share, capacity factor, nameplate capacity, SAIDI, SAIFI, interconnection queue, rate case, and URDB

#### Scenario: Coverage gate
- **WHEN** CI lists terms from all phase 1 manifests and guides
- **THEN** every term has an entry, or the build fails naming the missing terms

### Requirement: Same definitions for agents
The glossary SHALL be registered as a dataset and returned by the MCP server's search and query tools with the same text the site shows.

#### Scenario: Agent asks for a definition
- **WHEN** an agent searches "what is 4CP"
- **THEN** the first result is the 4CP glossary entry with its citation
