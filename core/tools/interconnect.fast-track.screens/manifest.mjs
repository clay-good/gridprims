const FR = 'https://www.federalregister.gov/documents/2013/12/05/2013-28515/small-generator-interconnection-agreements-and-procedures';
const base = { lineConfig: '4w', connection: '1ph-ln', sharedKw: 15, imbalanceKva: 15, transformerKva: 100 };

export default {
  id: 'interconnect.fast-track.screens',
  version: '0.1.0',
  title: 'The Fast Track screens, one by one',
  purpose: 'Every screen the utility runs on a small generator under the federal Fast Track, what each tests and at what threshold, who can answer it, and a result for the ones you can settle yourself.',
  archetype: 'calculator',
  firstScreen: ['lineConfig', 'connection', 'sharedKw', 'imbalanceKva', 'transformerKva'],
  inputs: [
    { name: 'lineConfig', label: 'The utility line', type: 'enum', example: '4w', options: [{ value: '4w', label: 'Three-phase four-wire' }, { value: '3w', label: 'Three-phase three-wire' }, { value: 'unknown', label: 'Not known' }] },
    { name: 'connection', label: 'Your connection', type: 'enum', example: '1ph-ln', options: [{ value: '1ph-ln', label: 'Single-phase, line to neutral' }, { value: '1ph-ll', label: 'Single-phase, phase to phase' }, { value: '3ph', label: 'Three-phase' }, { value: '3ph-grounded', label: 'Three-phase, effectively grounded' }] },
    { name: 'sharedKw', label: 'Generation on a shared single-phase secondary', type: 'number', unit: 'kW', range: { min: 0, max: 1e5 }, precision: 'exact', example: 15, hint: 'Yours and your neighbors\' on the same secondary; 0 if it is not shared.' },
    { name: 'imbalanceKva', label: 'Imbalance your system adds on a 240 V center-tap service', type: 'number', unit: 'kVA', range: { min: 0, max: 1e5 }, precision: 'exact', example: 15 },
    { name: 'transformerKva', label: 'Service transformer nameplate rating', type: 'number', unit: 'kVA', range: { min: 0, max: 1e5 }, precision: 'exact', example: 100, hint: '0 if this is not a 240 V center-tap service.' },
  ],
  outputs: [
    { name: 'met', label: 'Screens met', unitless: true, rounding: { decimals: 0, fixed: true } },
    { name: 'notMet', label: 'Screens not met', unitless: true, rounding: { decimals: 0, fixed: true } },
    { name: 'open', label: 'Screens still open', unitless: true, rounding: { decimals: 0, fixed: true } },
  ],
  method: 'The ten Initial Review screens of SGIP § 2.2.1, in the rule\'s order, each with its threshold and who can answer it. Three are settled from your entries: line configuration and grounding (§ 2.2.1.6), at most 20 kW on a shared single-phase secondary (§ 2.2.1.7), and an imbalance of at most 20% of the service transformer rating on a 240 V center-tap service (§ 2.2.1.8). The rest need the utility\'s data or circuit model and stay open.',
  assumptions: ['The project follows the federal procedures; state rules number and set their screens differently.'],
  citations: [
    { source: 'FERC Order No. 792, Small Generator Interconnection Agreements and Procedures, 78 FR 73240', edition: 'December 5, 2013; screens carried forward through Order No. 2023', locator: 'pro forma SGIP § 2.2.1 (Initial Review screens 2.2.1.1 to 2.2.1.10) and § 2.4.4 (supplemental review)', url: FR },
  ],
  datasets: [],
  glossary: ['kw'],
  examples: [
    { id: 'mixed', title: 'A home system on a four-wire line', inputs: base, expect: { met: { value: 3, tolerance: { abs: 0 }, display: '3' }, notMet: { value: 0, tolerance: { abs: 0 }, display: '0' }, open: { value: 7, tolerance: { abs: 0 }, display: '7' } }, source: 'SGIP § 2.2.1: line-to-neutral on a four-wire line passes § 2.2.1.6; 15 kW is at most 20 kW (§ 2.2.1.7); 15 kVA is at most 20% × 100 kVA = 20 kVA (§ 2.2.1.8); the other seven stay open' },
    { id: 'not-met', title: 'A phase-to-phase connection on a four-wire line', inputs: { ...base, connection: '1ph-ll', sharedKw: 25, imbalanceKva: 10 }, expect: { met: { value: 1, tolerance: { abs: 0 }, display: '1' }, notMet: { value: 2, tolerance: { abs: 0 }, display: '2' }, open: { value: 7, tolerance: { abs: 0 }, display: '7' } }, source: 'SGIP § 2.2.1.6 to 2.2.1.8: phase-to-phase on a four-wire line is not listed as passing; 25 kW is over 20 kW; 10 kVA is within 20% of 100 kVA' },
  ],
  related: ['interconnect.process.route', 'interconnect.minimum-load.screen'],
  handoffs: [{ label: 'FERC Order No. 792 in the Federal Register', url: FR }],
  stability: 'experimental',
  validation: { level: 1, evidence: [{ kind: 'own-examples', summary: 'Each of the three answerable screens met and not met, and the seven open screens, read from SGIP § 2.2.1.' }] },
  toRaise: 'Screen results compared with a utility\'s published Fast Track determinations would raise it to cross-checked.',
  screeningLabel: 'A self-check, not an application or a study. The utility runs every screen and decides; open screens are not a prediction either way.',
  limitations: [
    'Fault current, interrupting capability, and transient stability need the utility\'s circuit model and are never answered here.',
    'Federal procedures only; states number and set their screens differently.',
  ],
};
