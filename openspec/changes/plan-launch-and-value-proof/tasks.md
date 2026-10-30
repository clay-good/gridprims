## 1. Value log and gates

- [ ] 1.1 Generate `docs/value-log.md` from the D3 measures on a monthly schedule in CI, reading only sources the pipeline already has (CI results, snapshot ledger, published counts); verify the first generated entry appears within 35 days of launch with no person's step
- [ ] 1.2 Evaluate the phase 0 exit criteria from D1 automatically at each release and append the result and date to the generated value log; verify a release records pass or the unmet criteria by name
- [ ] 1.3 Evaluate D2's launch-ready checklist per hero tool from the tool manifests and CI evidence at each release; verify each tool's items read as met or link the open issue, computed rather than reviewed
- [ ] 1.4 Recheck every rule-status item in `docs/research/06` on a schedule in CI against its archived source, appending a dated note to the research file and flagging items whose source moved; verify the scheduled run writes the note
- [ ] 1.5 At 6 months after launch, have the scheduled value-log run publish the phase 2 decision inputs, including those for the Spanish decision (D8); verify the generated entry carries each measure and its source, so the owner's decision needs no separate gathering step
