const base = { peakKw: 2000, aggregateKw: 500, technology: 'solar-fixed', minLoadKw: 0, minLoadSource: 'report', measured: 'unknown' };

export default {
  id: 'interconnect.minimum-load.screen',
  version: '0.1.0',
  title: 'Load-ratio screens for a generator',
  purpose: 'Whether a solar or other small generator passes the 15%-of-peak screen, and the minimum-load screen across the range of minimum load utilities assume, unless you have the utility\'s own value.',
  archetype: 'calculator',
  firstScreen: ['peakKw', 'aggregateKw', 'technology', 'minLoadKw'],
  inputs: [
    { name: 'peakKw', label: 'Line section annual peak load', type: 'number', unit: 'kW', range: { min: 0, max: 1e6 }, precision: 'exact', example: 2000, hint: 'From a pre-application report or a hosting-capacity map; 0 if you do not have it. gridprims never estimates it.' },
    { name: 'aggregateKw', label: 'Generation on the line section, including yours', type: 'number', unit: 'kW', range: { min: 0, max: 1e6 }, precision: 'exact', example: 500 },
    { name: 'technology', label: 'Your project', type: 'enum', example: 'solar-fixed', options: [{ value: 'solar-fixed', label: 'Solar, fixed panels, no storage' }, { value: 'solar-tracking', label: 'Solar, tracking, no storage' }, { value: 'storage', label: 'Solar with storage, or storage' }, { value: 'other', label: 'Other generation' }] },
    { name: 'minLoadKw', label: 'Minimum load from the utility', type: 'number', unit: 'kW', range: { min: 0, max: 1e6 }, precision: 'exact', example: 0, hint: '0 if you do not have it; the screen is then shown across the range utilities assume.' },
    { name: 'minLoadSource', label: 'Where the minimum load came from', type: 'enum', example: 'report', options: [{ value: 'report', label: 'A pre-application report' }, { value: 'published', label: 'The utility\'s published feeder value' }, { value: 'other', label: 'Another utility document' }] },
    { name: 'measured', label: 'The utility marked it', type: 'enum', example: 'unknown', options: [{ value: 'unknown', label: 'Not marked' }, { value: 'measured', label: 'Measured' }, { value: 'estimated', label: 'Estimated' }] },
  ],
  outputs: [
    { name: 'peakRatio', label: 'Generation as a share of peak', unit: '%', rounding: { decimals: 1, fixed: true } },
    { name: 'minLoadRatio', label: 'Generation as a share of the utility\'s minimum load', unit: '%', rounding: { decimals: 1, fixed: true } },
    { name: 'flipShare', label: 'Minimum load, as a share of peak, at which the answer flips', unit: '%', rounding: { decimals: 1, fixed: true } },
  ],
  method: 'The 15%-of-peak screen divides generation on the line section by its annual peak and is met at 15% or less (SGIP § 2.2.1.2). The minimum-load screen is met only when generation is less than 100% of minimum load (SGIP § 2.4.4.1). Solar with no storage uses daytime minimum load (10 a.m. to 4 p.m. fixed, 8 a.m. to 6 p.m. tracking); everything else uses absolute minimum load (§ 2.4.4.1.1). With no utility value, the daytime screen is computed at 15% and 40% of peak, the range utilities assume, and the share where it flips is generation ÷ peak.',
  assumptions: [
    'The generation you enter includes every generator already on the line section and yours.',
    'The line section is bounded by automatic sectionalizing devices, as the rule says.',
  ],
  citations: [
    { source: 'FERC Order No. 792, Small Generator Interconnection Agreements and Procedures, 78 FR 73240', edition: 'December 5, 2013; screens carried forward through Order No. 2023', locator: 'pro forma SGIP §§ 2.2.1.2 (15% of line section annual peak), 2.4.4.1 and 2.4.4.1.1 (less than 100% of minimum load; daytime or absolute)', url: 'https://www.federalregister.gov/documents/2013/12/05/2013-28515/small-generator-interconnection-agreements-and-procedures' },
  ],
  datasets: [],
  glossary: ['kw'],
  examples: [
    { id: 'over', title: 'Over the 15%-of-peak threshold', inputs: base, expect: { peakRatio: { value: 25, tolerance: { abs: 1e-9 }, display: '25.0' } }, source: 'interconnect/minimum-load-range spec, scenario "Over the threshold": 500 ÷ 2,000 = 25.0%, more than 15%' },
    { id: 'under', title: 'Under the 15%-of-peak threshold', inputs: { ...base, aggregateKw: 250 }, expect: { peakRatio: { value: 12.5, tolerance: { abs: 1e-9 }, display: '12.5' } }, source: 'Hand-computed: 250 ÷ 2,000 = 12.5%, at most 15%' },
    { id: 'flips', title: 'The minimum-load answer flips inside the band', inputs: base, expect: { flipShare: { value: 25, tolerance: { abs: 1e-9 }, display: '25.0' } }, source: 'interconnect/minimum-load-range spec, scenario "Answer flips inside the band": met at 40% (800 kW), not met at 15% (300 kW), flips at 500 ÷ 2,000 = 25%' },
    { id: 'settled', title: 'Settled across the band', inputs: { ...base, aggregateKw: 60 }, expect: { flipShare: { value: 3, tolerance: { abs: 1e-9 }, display: '3.0' } }, source: 'interconnect/minimum-load-range spec, scenario "Settled either way": 60 kW is less than 300 kW and 800 kW, so met at both ends' },
    { id: 'utility', title: 'A utility-provided minimum load', inputs: { ...base, minLoadKw: 600 }, expect: { minLoadRatio: { value: 83.3333, tolerance: { abs: 0.0001 }, display: '83.3' } }, source: 'interconnect/minimum-load-range spec, scenario "Pre-application report in hand": 500 ÷ 600 = 83.3%, less than 100%, met' },
    { id: 'at-threshold', title: 'Exactly at the minimum load', inputs: { ...base, minLoadKw: 500 }, expect: { minLoadRatio: { value: 100, tolerance: { abs: 1e-9 }, display: '100.0' } }, source: 'interconnect/minimum-load-range spec, scenario "Exactly at the threshold": 500 is not less than 100% of 500, so not met' },
  ],
  related: [],
  handoffs: [{ label: 'FERC Order No. 792 in the Federal Register', url: 'https://www.federalregister.gov/documents/2013/12/05/2013-28515/small-generator-interconnection-agreements-and-procedures' }],
  stability: 'experimental',
  validation: { level: 1, evidence: [{ kind: 'own-examples', summary: 'The spec\'s over-threshold, flips-inside-the-band, settled, utility-provided, and exactly-at-the-threshold scenarios and an under-threshold case, each hand-computed.' }] },
  toRaise: 'A worked screen example published by a utility, a state commission, or a national laboratory, reproduced to its printed precision, would raise it to cross-checked.',
  screeningLabel: 'A self-check of two screens, not an interconnection application or a utility study. The utility runs the screens and has the final word.',
  limitations: [
    'Federal procedures only; states set their own numbers, and some use minimum load where the federal rule uses peak.',
    'The other screens, such as fault current, need the utility\'s circuit model and are not answered here.',
    'Peak load and minimum load come only from the utility; gridprims never estimates or holds them.',
  ],
};
