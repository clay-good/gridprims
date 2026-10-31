# Reliability indices and major event days

Used by `reliability.outage-log.indices` and `core/lib/reliability.mjs`.

**What it gives you:** the reliability indices you have to report, from your own outage log, with every exclusion and assumption on screen.

IEEE 1366's own text is paywalled. We do not quote it and do not need it: every index we ship is restated, with its formula, in a source anyone can read for free. Each index cites the source that defines it, and never one that does not.

## The free source for each index

| What we compute | Formula | Source |
|---|---|---|
| Interruptions per customer served | customers interrupted ÷ customers served | Form EIA-861 instructions, Schedule 3 Part B, `eia.gov/survey/form/eia_861/instructions.pdf` (U.S. Government work, public domain) |
| Minutes per customer served | customer minutes ÷ customers served | Same |
| Minutes per interrupted customer | customer minutes ÷ customers interrupted | New Mexico 17.9.589 NMAC; IEEE PES Boston chapter tutorial, John Teixeira, National Grid, February 19, 2019, slides 75–90 |
| Service availability, percent | 1 − minutes per customer ÷ minutes in the period | Same. Checked against the tutorial's own table: 0.99 availability ↔ 5,256 minutes a year |
| Momentary interruptions per customer served | customers interrupted briefly ÷ customers served | Same tutorial |
| Major-event-day threshold | e^(mean + 2.5 × standard deviation) of the logarithms of daily minutes per customer | Same tutorial, slides 75–90; design intent from CEA's *Major Event Day Determination Reference Guide*, 2015 |

The federal form collects only the first two, in three bases, and **does not** define the threshold method or collect the others. It accepts IEEE 1366-2003 or 1366-2012, and defines a sustained interruption as one of **more than 5 minutes**.

## The rules we apply

| Step | Rule | Where it comes from |
|---|---|---|
| Sustained against momentary | Longer than 5 minutes is sustained; 5 minutes or less is momentary, so every event is exactly one of the two. The threshold is stated, and can be changed for a state rule | EIA-861 instructions |
| Which day an interruption counts toward | The day it began, by default. A split-at-midnight option is offered | New Mexico 17.9.589 NMAC. CEA notes that events running past midnight distort daily figures, and proposes a two-day rolling figure |
| Quiet days | Days with no interruptions are left out before the logarithm | The tutorial states it, and the logarithm of zero is undefined |
| Standard deviation | Both the sample and the population figure are shown. The sample one is used | **Ours.** No free source says which; we disclose the choice |
| Days needed | At least 30 days with interruptions, or no threshold is computed | **Ours.** No free source states a minimum. APPA's variant requires at least 36 outage events; below that the threshold is unstable |
| Years of history | Five years are assumed; fewer are labeled | The tutorial ("typically use 5 years") |
| A day equal to the threshold | Not a major event day; the threshold must be exceeded | The tutorial |

## What we refuse to do

- **Indices that count what happened to each customer** (how many customers were interrupted more than *n* times, or went without power longer than a set duration) need a record of each interruption against each service point. An event log does not contain that, so we report them as unavailable with what they would require, and never estimate them from per-event counts.
- **Partial restorations** are summed as customer minutes and counted as one interruption, only when the person confirms the rows belong to one event. Nothing is merged or dropped silently.
- **Local variants.** Some utilities publish index names that are not in 1366 at all. We do not map an unknown label onto one of these indices.

## Checked against

The published vector in `verify/tests/core/reliability.test.mjs`: a mean of −2.86 and a sample standard deviation of 1.31 in log space give **1.51** minutes per customer in a day, matching the published figure at the two decimal places it prints. Daily values that reproduce that mean and standard deviation exactly are built in the test, so no published table is copied.

CEA prints two further threshold vectors that do not reproduce: recomputing from their own stated mean and standard deviation differs in the second decimal place, which is consistent with the printed inputs being rounded. They are recorded here as unusable rather than asserted, as the spec requires.

## Known limits of the method, which the tool shows rather than hides

- CEA: "If the data is not log-normal, the IEEE 2.5β method is not advisable," and a small utility's data generally will not pass a normality test. One of CEA's own example utilities recorded zero major event days in a year where 2.3 were expected.
- One catastrophic day raises the threshold for the following five years, which can show up as a step change in reported reliability.
- The method was tuned so that a day exceeds the threshold with probability 0.000621, about 2.3 days a year (CEA, 2015).
