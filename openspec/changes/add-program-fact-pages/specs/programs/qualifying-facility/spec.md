## Purpose

Explains, in plain words, whether a small generator needs a federal qualifying-facility certification, what the fee-free self-certification path involves, and where to file, without deciding anything for anyone.

## ADDED Requirements

### Requirement: Descriptive only
The page SHALL describe who the certification applies to, the size thresholds in the regulation, the difference between self-certification and applying for a Commission certification, that self-certification carries no filing fee, what the form asks for in our own words, and where and how it is filed. It SHALL state that the filer and the regulator decide eligibility, and that this is not legal advice.

#### Scenario: No determination
- **WHEN** a visitor reads the page
- **THEN** no sentence states that a described project qualifies, and the page says the filer and the regulator decide

### Requirement: No eligibility computation
The page SHALL NOT compute any operating or efficiency standard, fuel-use test, or size threshold result from user input, and SHALL NOT include a form that returns a qualification answer.

#### Scenario: No calculator
- **WHEN** the page is rendered
- **THEN** it contains no input that produces an eligibility result

### Requirement: Cited to the form and the regulation
Every factual statement SHALL cite the current form, its instructions, or the regulation by section, with a link and the date we last checked it, and the page SHALL show that date.

#### Scenario: Last checked
- **WHEN** a visitor reads a threshold
- **THEN** the citation names the regulation section and the date we checked it

### Requirement: Exemptions stated plainly
The page SHALL state plainly which small facilities are exempt from the filing requirement under the regulation, with the citation, so a reader does not file needlessly.

#### Scenario: Small facility exempt
- **WHEN** a reader's facility falls under the regulation's exemption threshold
- **THEN** the page states the exemption and its citation, and still says the regulator decides
