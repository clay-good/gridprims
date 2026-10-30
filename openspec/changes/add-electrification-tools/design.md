## Context

Research in `docs/research/05` §5–6, `07`, and `08`. The 2026 NEC renumbers 220.87, reported as 120.87 by a secondary source; that number, the 30-day option's bar on sites with solar, wind, or peak shaving, and the averaging details are all unverified and must be checked through NFPA's free read-only access and the state adoption rules before launch. Nothing here is gated on buying a copy of the code. NLR End-Use Load Profiles and EAGLE-I v4 are confirmed CC BY 4.0, so typical shapes and county outage history can ship with credit. The county end-use shapes here and the whole-home residential shapes in `add-household-bill-check` are two derived tables from one End-Use Load Profiles release: each is registered under its own dataset id, so the one-owner gate can check the split mechanically rather than resting on prose.

## Goals / Non-Goals

**Goals:** give electricians and owners checkable numbers from data they already have.

**Non-Goals:** code compliance decisions, conductor sizing, or address-level outage claims.

## Decisions

### D1. Reuse the threshold method for managed charging
Managed charging uses the storage screen's monthly threshold search with each vehicle's dwell window and energy as constraints, so results are consistent across tools. Alternative: a full optimization. Rejected for the same reason REopt handles storage: screening is our job.

### D2. Edition selector
The headroom report lets the user pick the NEC edition adopted locally, since states adopt editions years apart; the method text is paraphrased per edition from our own reading, with section citations. Alternative: latest edition only. Rejected: most jurisdictions enforce an older edition.

### D3. County outage events from EAGLE-I
An event is a continuous run of 15-minute intervals with at least 1% of the county's tracked customers out. Alternative: any customer out. Rejected: a single-customer outage would make nearly every interval an event. Alternative: DOE-417 disturbance reports. Rejected: they cover large events only and their site was unreachable (`docs/research/08`).

## Risks / Trade-offs

- **Misuse as a permit document.** Mitigation: inspector disclaimer on every report, steps shown for checking.
- **Power factor guesses.** Mitigation: use measured kVAR or kVA when present, otherwise require the user to enter PF and show its effect.
