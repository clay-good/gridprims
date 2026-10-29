## Purpose

Lets a user tell us a result looks wrong, with exactly the context they choose to send, so we can fix tools fast without collecting anything by default or relying on a third-party CAPTCHA.

## ADDED Requirements

### Requirement: Opt-in report with full preview
Every tool and entity page SHALL have a "Report a problem" control. The report SHALL include only the tool id and version, dataset versions, the page URL without fragment, and text the user writes. Inputs and results SHALL be attached only if the user ticks a box, and file contents SHALL never be attached. The user SHALL see the exact payload before sending.

#### Scenario: Default payload
- **WHEN** a user opens the report dialog on the load workbench with a file loaded
- **THEN** the preview shows the tool id, versions, and an empty message box, and no file data

### Requirement: Abuse protection without third parties
The report endpoint SHALL resist spam using only the host platform and our own code: a per-client limit of 10 reports per 10 minutes enforced at each edge location, a hidden honeypot field, a small proof-of-work computed in the browser before sending, and payload size and schema limits. It SHALL NOT load any third-party script.

#### Scenario: Flood
- **WHEN** one client sends 20 reports through one edge location in a 10-minute window
- **THEN** every report after the 10th is refused with a plain message saying when to try again

#### Scenario: Honeypot filled
- **WHEN** a submission fills the hidden field
- **THEN** it is accepted with a normal-looking response but not stored

### Requirement: Report endpoint stores and computes nothing
The report endpoint SHALL store valid reports and return an id. It SHALL NOT compute results, call other services with report content, or set cookies.

#### Scenario: Submitted report
- **WHEN** a user sends a report
- **THEN** the dialog shows the report id and a link to the public changelog where fixes are listed

### Requirement: Retention
Stored reports SHALL be deleted 180 days after they are closed, and at most 365 days after receipt. Rate-limit counters SHALL NOT be stored with reports. The privacy page SHALL state what a report contains, how long it is kept, and how to ask for deletion by report id.

#### Scenario: Old report
- **WHEN** a report was closed 181 days ago
- **THEN** the nightly cleanup has deleted it

### Requirement: Reports from agents go through a human
The local MCP server SHALL NOT send reports. It SHALL prepare the same payload as text and a report link whose prefilled content is carried only in the URL fragment, which the website reads on the device into the preview dialog, so nothing reaches a server until the human sends it.

#### Scenario: Agent finds a wrong result
- **WHEN** an agent calls the MCP report tool
- **THEN** it receives the payload and a link to open in a browser, and no network request is made
