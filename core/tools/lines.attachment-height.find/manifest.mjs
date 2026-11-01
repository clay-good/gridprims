const RULES = 'rule_id,applies_to,value,unit,source_document,source_locator,note\nsep.neutral.comm,,40,in,Our joint use standard,§4.2,\nsep.comm.comm,,12,in,Our joint use standard,§4.3,\nground.pole.comm,,18,ft,Our joint use standard,§4.1,';
const RULES_24 = RULES.replace('ground.pole.comm,,18,ft', 'ground.pole.comm,,24,ft');
const RULES_POLE = 'sep.neutral.comm,,40,in,Our joint use standard,§4.2,\nsep.comm.comm,,12,in,Our joint use standard,§4.3,\nground.pole.comm,,22,ft,Our joint use standard,§4.1,\npole.length-step,,5,ft,Our pole standard,§2,\npole.setting-depth.fraction,,10%,,Our pole standard,§3,\npole.setting-depth.add,,2,ft,Our pole standard,§3,';
const base = { newKind: 'fiber', poleLength: 'unknown', preference: 'rules' };

export default {
  id: 'lines.attachment-height.find',
  version: '0.1.0',
  title: 'Where a new line attaches on a pole',
  purpose: 'Where one new communication line can attach on a pole, which lines must move to make room, or how much taller a new pole must be, checked against the rules you enter.',
  archetype: 'calculator',
  firstScreen: ['rules', 'attachments', 'newKind'],
  inputs: [
    { name: 'rules', label: 'Your rules', type: 'text', multiline: true, example: RULES, hint: 'Rows of the gridprims standards template (download it from the links below): rule_id, applies_to, value, unit, source_document, source_locator, note. For example sep.neutral.comm,,40,in,Our standard,§4.2. gridprims ships no NESC values: enter them from your own copy.' },
    { name: 'attachments', label: 'What is on the pole now', type: 'text', multiline: true, example: 'neutral, Utility, 30 ft 2 in\ncatv, Cable Co, 24 ft 0 in\ntelephone, Phone Co, 23 ft 0 in', hint: 'One line each: kind, owner, height above the ground line to the bolt. Kinds: primary 12.47kV, neutral, secondary, streetlight, transformer, catv, telephone, fiber, communication-other. Add a line "no power" for a pole with no supply.' },
    { name: 'newKind', label: 'The new line', type: 'enum', example: 'fiber', options: [{ value: 'fiber', label: 'Fiber' }, { value: 'catv', label: 'Cable TV' }, { value: 'telephone', label: 'Telephone' }, { value: 'communication-other', label: 'Other communication line' }] },
    { name: 'poleLength', label: 'Pole length', type: 'text', example: 'unknown', hint: 'Its full length, such as 40 ft, or unknown.' },
    { name: 'preference', label: 'Placement preference', type: 'enum', example: 'rules', options: [{ value: 'rules', label: 'As your rules say (highest if they say nothing)' }, { value: 'highest', label: 'Highest' }, { value: 'lowest', label: 'Lowest' }, { value: 'nearest-existing', label: 'Nearest the existing lines' }] },
  ],
  outputs: [
    { name: 'height', label: 'Attach at', unit: 'ft', rounding: { decimals: 2, fixed: true } },
    { name: 'moves', label: 'Other lines to move', unitless: true, rounding: { decimals: 0, fixed: true } },
    { name: 'extra', label: 'Extra height needed above ground', unit: 'in', rounding: { decimals: 0, fixed: true } },
    { name: 'replacement', label: 'Shortest replacement pole', unit: 'ft', rounding: { decimals: 0, fixed: true } },
  ],
  method: 'The communication space runs from the lowest supply attachment less the separation your rules require below it (by kind, and by voltage for a primary) down to your lowest allowed height. Every whole-inch height in it that keeps your separation from each communication line is a fit; one is picked by placement preference, highest by default. With none, plans of one move, then two, of existing communication lines are tried, each moved line keeping every separation; plans rank by fewest moves, least total distance, the new line\'s height by preference, then moving up. With no plan, the extra height above ground is the least raise of the space that fits the new line, and a replacement pole is the shortest length on your length step whose height above ground, length less your setting depth, gains that much.',
  assumptions: [
    'Heights are measured above the ground line to the attachment point.',
    'Supply attachments never move; moving them is the owner\'s design work.',
    'A replacement pole raises the supply attachments by the same added height.',
  ],
  citations: [
    { source: 'IEEE C2, National Electrical Safety Code', edition: 'the edition your rules adopt', locator: 'Rule 235 and Table 235-5 (cited by number; the values come from your copy)', paywalled: true },
    { source: '47 CFR 1.1402 and 1.1411 (FCC pole attachment rules)', edition: 'current eCFR', locator: '§1.1402(p) and (q): make-ready is complex or simple by outage and damage risk, not by how many lines move', url: 'https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-1/subpart-J/section-1.1402' },
  ],
  datasets: [],
  glossary: ['communication-space', 'neutral', 'make-ready', 'nesc'],
  examples: [
    { id: 'fits', title: 'Room above the existing lines', inputs: { ...base, rules: RULES, attachments: 'neutral, Utility, 30 ft 2 in\ncatv, Cable Co, 24 ft 0 in\ntelephone, Phone Co, 23 ft 0 in' }, expect: { height: { value: 26.8333, tolerance: { abs: 0.0001 }, display: '26.83' }, moves: { value: 0, tolerance: { abs: 0 }, display: '0' } }, source: 'lines/attachment-height spec, scenario "It fits as is": 30 ft 2 in − 40 in = 26 ft 10 in, 34 in above the cable TV' },
    { id: 'one-move', title: 'One move makes room', inputs: { ...base, rules: RULES_24, attachments: 'neutral, Utility, 30 ft 2 in\ncatv, Cable Co, 26 ft 4 in\ntelephone, Phone Co, 24 ft 9 in' }, expect: { height: { value: 24, tolerance: { abs: 1e-9 }, display: '24.00' }, moves: { value: 1, tolerance: { abs: 0 }, display: '1' } }, source: 'lines/attachment-height spec, scenario "One move makes room": the telephone up 3 in. to 25 ft 0 in, then 24 ft 0 in clears it by 12 in' },
    { id: 'too-short', title: 'A 35 ft pole too short for the new line', inputs: { ...base, rules: RULES_POLE, attachments: 'neutral, Utility, 25 ft 2 in', poleLength: '35 ft' }, expect: { extra: { value: 2, tolerance: { abs: 0 }, display: '2' }, replacement: { value: 40, tolerance: { abs: 0 }, display: '40' } }, source: 'lines/attachment-height spec, scenario "Pole too short": 25 ft 2 in − 40 in = 21 ft 10 in, 2 in under 22 ft; a 40 ft pole stands 40 − 6 = 34 ft, 4 ft 6 in more than 35 − 5.5 = 29 ft 6 in' },
  ],
  related: ['lines.midspan-clearance.check'],
  handoffs: [
    { label: 'The standards template to fill with your own rules (CSV)', url: 'https://gridprims.com/lines/standards-template.csv' },
    { label: 'FCC pole attachment make-ready rules, 47 CFR 1.1411', url: 'https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-1/subpart-J/section-1.1411' },
    { label: 'California General Order 95 (overhead line rules)', url: 'https://ia.cpuc.ca.gov/gos/go95/go_95_startup_page.html' },
  ],
  stability: 'experimental',
  validation: { level: 1, evidence: [{ kind: 'own-examples', summary: 'The spec\'s fits-as-is, one-move, ranked-plan, pole-too-short, length-unknown, existing-shortfall, and voltage-range scenarios, each hand-computed.' }] },
  toRaise: 'At least 10 worked placements from published utility joint-use standards (Clark Public Utilities Section 1910, Tacoma Power C-OH-1060, Chelan County PUD), reproduced, would raise it to cross-checked.',
  screeningLabel: 'Preview. Screening check against the rules you entered. The pole owner and a qualified engineer have the final word, and pole loading is not checked.',
  limitations: [
    'One new line per pole; crossarms, framing, and linked spans are not modeled.',
    'Moves are limited to two, our own limit for readable plans, not a regulatory test.',
    'The answer is only as good as the measured heights and the rules you enter.',
  ],
};
