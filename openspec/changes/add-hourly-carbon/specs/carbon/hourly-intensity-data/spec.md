## Purpose

Keeps a citable, downloadable copy of EIA's hourly grid emissions by region, with its method and limits stated, for people, the carbon tools, and the local MCP server.

## ADDED Requirements

### Requirement: Dataset contents and provenance
The dataset SHALL contain, for each balancing authority and UTC hour from 2018-07-01 onward: demand, net generation by fuel, total CO₂ emissions, and consumption-based CO₂ intensity, as published by EIA's Hourly Electric Grid Monitor (EIA-930), with an as-of date equal to the source files' Last-Modified date (EIA rebuilds these files daily) and our retrieval date kept separately. It SHALL be registered as public domain with EIA's requested credit.

#### Scenario: Registry entry
- **WHEN** a visitor opens the dataset in the data library
- **THEN** it shows EIA as publisher, public domain, the data period, and the method caveat

### Requirement: Revisions tracked
EIA revises recent hours. Each snapshot SHALL record which hours changed since the previous snapshot, and tool results SHALL name the snapshot used.

#### Scenario: Revised hours
- **WHEN** the weekly refreshes during a month change 500 hourly values
- **THEN** that month's permanent version changelog reports 500 revised hours with the date range

### Requirement: Full comparison at each permanent version
Because EIA rebuilds every year's file daily, each monthly permanent version SHALL compare all years against the previous version, not only the last 60 days, and record revised hours by year.

#### Scenario: Old-year revision
- **WHEN** EIA revises 2021 hours between two monthly versions
- **THEN** the new version's changelog lists the 2021 hours revised

### Requirement: Compact shards
Hourly data SHALL ship as one packed binary file per balancing authority per year, each under 1 MB compressed, so a tool loads only the region and years it needs.

#### Scenario: Load one region-year
- **WHEN** a user analyzes one year of data in one region
- **THEN** the browser fetches only that region's shards for the years covered
