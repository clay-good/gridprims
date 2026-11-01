const base = { kw: 1000, kv: 12.47, technology: 'inverter-certified', mainline: 'yes', jurisdiction: 'federal' };
const FR = 'https://www.federalregister.gov/documents/2013/12/05/2013-28515/small-generator-interconnection-agreements-and-procedures';

export default {
  id: 'interconnect.process.route',
  version: '0.1.0',
  title: 'Which interconnection process applies',
  purpose: 'Which federal process a generator or storage project goes through to connect to the grid, why, and the deadlines and pre-application report the procedures set.',
  archetype: 'calculator',
  firstScreen: ['kw', 'kv', 'technology', 'mainline', 'jurisdiction'],
  inputs: [
    { name: 'kw', label: 'Nameplate capacity', type: 'number', unit: 'kW', range: { min: 0.1, max: 1e6 }, precision: 'exact', example: 1000 },
    { name: 'kv', label: 'Line voltage at the point of interconnection', type: 'number', unit: 'kV', range: { min: 0.1, max: 800 }, precision: 'exact', example: 12.47 },
    { name: 'technology', label: 'Technology', type: 'enum', example: 'inverter-certified', options: [{ value: 'inverter-certified', label: 'Certified inverter-based (solar, storage, most wind)' }, { value: 'inverter-other', label: 'Inverter-based, not certified' }, { value: 'rotating', label: 'Synchronous or induction machine' }] },
    { name: 'mainline', label: 'On a mainline within 2.5 circuit miles of the substation', type: 'enum', example: 'yes', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unknown', label: 'Not known' }] },
    { name: 'jurisdiction', label: 'Rules', type: 'text', example: 'federal', hint: 'federal for an interconnection under FERC\'s procedures, or your two-letter state code.' },
  ],
  outputs: [
    { name: 'ceilingKw', label: 'Fast Track ceiling for this project', unit: 'kW', rounding: { decimals: 0, fixed: true } },
    { name: 'preAppFee', label: 'Pre-application report fee', unit: '$', rounding: { decimals: 0, fixed: true } },
  ],
  method: 'Above 20 MW: the large generator procedures. A listed inverter-based system of 10 kW or less: the 10 kW Inverter Process (§ 1.1.1). Above 69 kV: not eligible for Fast Track. A synchronous or induction machine: Fast Track up to 2 MW. A listed inverter-based system: Fast Track up to the § 2.1 ceiling for its voltage, higher on a mainline within 2.5 electrical circuit miles of the substation. Anything else goes to the § 3 study process.',
  assumptions: ['The project connects under procedures that follow FERC\'s pro forma; many utilities use a state version instead.'],
  citations: [
    { source: 'FERC Order No. 792, Small Generator Interconnection Agreements and Procedures, 78 FR 73240', edition: 'December 5, 2013; carried forward through Order No. 2023', locator: 'pro forma SGIP §§ 1.1.1, 1.2 (pre-application report), 2.1 (Fast Track eligibility table), 2.2 and 2.4 (review deadlines)', url: FR },
  ],
  datasets: [],
  glossary: ['kw', 'interconnection-queue'],
  examples: [
    { id: 'fast-track', title: 'A 1 MW solar project at 12.47 kV on a mainline', inputs: base, expect: { ceilingKw: { value: 3000, tolerance: { abs: 0 }, display: '3,000' } }, source: 'interconnect/process-router spec, scenario "Fast-track eligible": 5 kV to under 15 kV on a mainline, up to 3 MW (§ 2.1)' },
    { id: 'above', title: 'A 4 MW project at 12.47 kV', inputs: { ...base, kw: 4000 }, expect: { ceilingKw: { value: 3000, tolerance: { abs: 0 }, display: '3,000' } }, source: 'interconnect/process-router spec, scenario "Above the fast-track ceiling": 4 MW is above the 3 MW mainline ceiling, so the study process' },
    { id: 'rotating', title: 'A 1.5 MW engine generator', inputs: { ...base, kw: 1500, technology: 'rotating' }, expect: { ceilingKw: { value: 2000, tolerance: { abs: 0 }, display: '2,000' } }, source: 'SGIP § 2.1: synchronous and induction machines up to 2 MW' },
  ],
  related: ['interconnect.minimum-load.screen'],
  handoffs: [{ label: 'FERC Order No. 792 in the Federal Register', url: FR }],
  stability: 'experimental',
  validation: { level: 1, evidence: [{ kind: 'own-examples', summary: 'The spec\'s fast-track-eligible and above-the-ceiling scenarios, a rotating machine, and the 10 kW, 69 kV, and 20 MW boundaries, each read from the § 2.1 table.' }] },
  toRaise: 'Routing checked against a utility\'s published decisions for real projects would raise it to cross-checked.',
  screeningLabel: 'Not an application: you file with the utility, which decides the process. Utilities and states may use their own procedures.',
  limitations: [
    'Federal procedures only; most retail interconnections follow a state version with its own limits.',
    'Eligibility is not a pass: the utility still runs the screens.',
    'Fees other than the pre-application report vary by utility and are not shown.',
  ],
};
