## Purpose

Tells a security researcher exactly where to report a problem and what we will do about it, so a finding reaches us instead of a public thread.

## ADDED Requirements

### Requirement: security.txt
The site SHALL serve `/.well-known/security.txt` over HTTPS as `text/plain; charset=utf-8`, containing `Contact`, `Expires` (RFC 3339, less than one year ahead), `Policy`, `Preferred-Languages`, and `Canonical`, per RFC 9116. The contact address, policy URL, and canonical URL SHALL be generated from one place in the repository's configuration so no page states them separately.

#### Scenario: Fields present
- **WHEN** a researcher fetches `/.well-known/security.txt`
- **THEN** it returns plain text with a contact address, an expiry under a year away, and a link to the disclosure policy

### Requirement: The expiry is generated, never maintained
The `Expires` field SHALL be generated at build time as eleven months after the build date, so it can never lapse while the pipeline runs and no one has to renew it. CI SHALL assert that the generated file's expiry is in the future, as a guard on the generator rather than a reminder to a person.

#### Scenario: Expiry regenerated
- **WHEN** any build runs
- **THEN** the published file's expiry is eleven months after that build's date

#### Scenario: Generator broken
- **WHEN** a change would emit an expiry in the past
- **THEN** CI fails and names the generator

### Requirement: Disclosure policy with safe harbor
A single policy page SHALL state: what is in scope (this site, its static assets, and the problem-report endpoint) and out of scope (third-party services we do not run, and the publishers whose data we copy); that good-faith research following the policy will not be pursued; that testing SHALL NOT use other people's data, degrade service, or attempt denial of service; a target of 5 business days to acknowledge and 90 days to fix or explain; and that it is not legal advice.

#### Scenario: Out-of-scope report
- **WHEN** someone reports a vulnerability in a federal agency's own website
- **THEN** the policy directs them to that agency's disclosure channel and says we cannot act on it

### Requirement: Fixes are disclosed like corrections
A security fix that changed any published number or any user-visible behavior SHALL appear in the public changelog, and the reporter SHALL be credited where they consent. A fix SHALL NOT be described in a way that reveals an unpatched path on another site.

#### Scenario: Reporter credit
- **WHEN** a reporter consents to credit
- **THEN** the changelog entry names them and the date, with no personal contact details
