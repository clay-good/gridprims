## Purpose

Computes how far a line sags between two poles and how high its lowest point is, by the parabolic method in USDA RUS Bulletin 1724E-152. It checks the result against the ground clearance for what the span crosses and the separation from power lines above.

## ADDED Requirements

### Requirement: Sag and lowest point
From span length, both attachment heights, the ground height difference, and either sag at the design condition or weight per foot and horizontal tension, the tool SHALL compute sag as `D = wS²/(8H)` and the lowest point's location and height. For unequal supports, the lowest point is `x = S/2 − H·h/(wS)` from the lower pole and `w·x²/(2H)` below it, or the lower support when `x < 0`. Computed lengths SHALL be within 0.01 ft before rounding (design D6).

#### Scenario: Level span
- **WHEN** both attachments are at 25 ft over level ground, the span is 200 ft, weight is 0.500 lb/ft, and tension is 1,000.0 lb
- **THEN** sag is 2 ft 6 in. and the lowest point is 22 ft 6 in. above ground, at midspan

#### Scenario: Unequal supports
- **WHEN** attachments are at 25 ft and 21 ft over level ground, with the same span, weight, and tension
- **THEN** the lowest point is 60 ft from the lower pole and 20 ft 1 in. above ground

#### Scenario: Lowest point at a pole
- **WHEN** attachments are at 25 ft and 21 ft, the span is 100 ft, weight is 0.500 lb/ft, and tension is 1,000.0 lb
- **THEN** the lowest point is at the lower pole, at 21 ft 0 in., and the sentence says so

### Requirement: Inputs fit the simplicity budget
The first screen SHALL hold at most five inputs: rule source, span length, height at each pole, and sag. Weight and tension, ground height difference, the line above, and what the span crosses SHALL sit under "More options". The result SHALL ask what the span crosses before giving a pass or fail. The page SHALL have one chart: a span profile with the ground, the line, the lowest point, and the required clearance, with a text summary and a table view.

#### Scenario: Crossing not yet chosen
- **WHEN** a user has entered the span but not what it crosses
- **THEN** the result gives the lowest point and asks "What does the span cross?" with no pass or fail

### Requirement: Sag at any point along the span
Sag at an offset `x` from midspan SHALL be `Dx = D(1 − (2x/S)²)`, the formula RUS Bulletin 1724E-152 gives for it, and SHALL be used for the gap to the line above and for the chart's profile.

#### Scenario: Offset sag
- **WHEN** a 200 ft span sags 2 ft 6 in. and the sag is asked for 50 ft from midspan
- **THEN** it is 1 ft 10.5 in.

### Requirement: Sag method cited without reprinted material
The sag method SHALL cite RUS Bulletin 1724E-152 by section and SHALL reproduce no IEEE or ASCE material the bulletin reprints with permission.

#### Scenario: Citation only
- **WHEN** the manifest's citations are built
- **THEN** RUS 1724E-152 is cited by section, and no reprinted figure or table appears on the page

### Requirement: Clearance for what the span crosses
The tool SHALL compare the lowest point with the required clearance for the chosen surface (road, driveway, pedestrian area, rail, or a surface the file names) and give the margin or shortfall in feet and inches, with the value's source.

#### Scenario: Passes with margin
- **WHEN** the lowest point is 22 ft 6 in. over a road and the rules require 18 ft for communication lines
- **THEN** the answer is "The lowest point is 22 ft 6 in., 4 ft 6 in. above the 18 ft your rules require over a road."

#### Scenario: Short
- **WHEN** the lowest point is 17 ft 8 in. and the rules require 18 ft
- **THEN** the answer is "The lowest point is 4 in. lower than the 18 ft your rules require over a road."

### Requirement: Separation from the line above
When the user enters the line above (its heights at both poles and its sag), the tool SHALL find the smallest gap between the two lines along the span and compare it with the `sep.midspan.*` rule or, if the rules have none, the pole separation, naming which it used.

#### Scenario: Gap shrinks at midspan
- **WHEN** a neutral is 40 in. above the communication line at both poles, the neutral sags 4 ft 0 in., the communication line sags 2 ft 6 in., and the rules require 30 in. at midspan
- **THEN** the smallest gap is 22 in. at midspan, and the answer says it is 8 in. short of the 30 in. midspan value

### Requirement: Stated limits of the sag method
The tool SHALL use sag at the condition the user states and SHALL NOT convert it from field temperature to design temperature. It SHALL say so beside every result, and SHALL show the catenary sag when it differs from the parabolic sag by more than 1 in.

#### Scenario: Measured sag in the field
- **WHEN** a user enters sag measured on a 60°F day
- **THEN** the result is labeled "at the condition you entered" and says it does not adjust for hotter or icier conditions

### Requirement: Verified against an independent catenary
Because RUS Bulletin 1724E-152 publishes no worked examples, the tool's test vectors SHALL come from an exact catenary evaluated by a separate script for 50 stored cases spanning the span lengths, weights, tensions, and height differences the tool accepts (`reference-output`). Parabolic and catenary sag SHALL agree within 1% where sag is under 5% of the span, and each stored case SHALL record both values.

#### Scenario: Independent cases
- **WHEN** CI runs the 50 stored catenary cases
- **THEN** every parabolic sag is within 1% of the catenary sag, or the case is recorded as outside the shallow-sag range with both values shown

#### Scenario: Deep sag is labeled
- **WHEN** a span's sag exceeds 5% of its length
- **THEN** the result shows the catenary sag beside the parabolic one and says the parabolic method understates deep sag
