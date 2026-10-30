## Why

**Value up front:** anyone relying on a gridprims number can see how to report a security problem, how a wrong number gets corrected in public, who may change a curated fact and on what evidence, and what happens to the data if the maintainer stops. A free site asking people to cite it in rate cases and news stories has to answer those four questions before it is worth citing.

The risk here is not an attacker; it is disappearance and drift. HIFLD Open, a federal map layer our own research depended on, was discontinued in late 2025 and public users lost access overnight; what survived was a volunteer-archived copy (`docs/research/13`). One maintainer with no deposit plan is the same failure mode. Meanwhile a site built on curated facts (tariff terms, data-download guides, glossary entries) decays silently unless provenance and review are rules rather than habits.

We hand the durable copies to institutions built for permanence rather than reinventing them: a public research archive mints the persistent identifiers and holds every dataset version, a second public archive holds an annual deposit, and a public code archive holds the source. We deliberately do better than the common practice of a project's own backups, which die with the account that pays for them, and than the vulnerability-reward platforms a one-maintainer project cannot staff.

Everything here is a static file or a rule, not a committee: `security.txt`, a disclosure policy, a corrections log, provenance rules for curated facts, an archive deposit, and a published succession plan.

## What Changes

- **Security disclosure:** an RFC 9116 `/.well-known/security.txt` with a monitored expiry, and a one-page coordinated-disclosure policy with safe harbor, acknowledgement and fix targets, and a scope limited to the site and its one Worker.
- **Data continuity:** every dataset version mirrored to a public archive with a persistent identifier, an annual deposit to a second archive, source code archived, published running costs, and a succession plan with named successors and a dead-man rule.
- **Curated contributions:** the provenance, review, and conflict-of-interest rules every hand-maintained fact must pass, a public comment window before any change to a published number, and quarantine for bulk contributions.
- **Corrections** are strengthened in `add-site-experience`'s trust pages (tiers, the old value kept visible, and never editing a published snapshot in place) rather than specified twice.

## Capabilities

### New Capabilities

- `trust/security-disclosure`: How to report a security problem and what we promise in return.
- `trust/data-continuity`: Archive deposits, persistent identifiers, published costs, and succession.
- `trust/curated-contributions`: Provenance, review, and conflict rules for hand-maintained facts.

### Modified Capabilities

None. (`site/trust-pages` gains its corrections detail inside `add-site-experience`, which is not yet applied.)

## Non-goals

- A bug bounty, paid rewards, or a vulnerability-reward platform.
- A governance committee, voting, or formal membership.
- Legal advice, or any promise we cannot keep with one maintainer.
- Accepting personal data, meter files, or account details from contributors.
- Publishing a VPAT; `docs/research/13` finds it is a procurement artifact whose value comes from vendor liability. The accessibility statement in `site/trust-pages` covers conformance, and a VPAT is offered on request.

## Impact

- Phase 0 for `security.txt`, the disclosure policy, and the contribution rules (they gate the first curated data); phase 1 for the archive deposit, costs page, and succession plan.
- Adds `/.well-known/security.txt`, a `/continuity/` page, and a pull-request template with the provenance and conflict questions.
- Adds a deposit step to the release process and an expiry check to CI.
