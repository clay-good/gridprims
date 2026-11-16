// California Rule 21, Section G (add-interconnection-screens 1.2): the screens with a number in them, one
// record each. Each field cites PG&E's and SCE's Rule 21, two utilities' tariffs implementing the same CPUC
// rule, published separately with their own sheet numbers and dates; the stored captures agree on every
// threshold. Screen M compares a project with the utility's published hosting capacity (Integration Capacity
// Analysis) profiles where they exist: in California, hosting capacity is the screen. Files starting with "_"
// are not records themselves.

const PGE = { type: 'tariff', publisher: 'Pacific Gas and Electric Company', url: 'https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_RULES_21.pdf', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/pge-rule-21-g.txt', sha256: '94105c2e7e8629eff3321eaf0d092860e4246b689a802d9fc3414b8df6d3528f', vintage: 'Electric Rule No. 21, Advice Letter 7692-E, sheets effective August 29, 2025' };
const SCE = { type: 'tariff', publisher: 'Southern California Edison Company', url: 'https://www.sce.com/sites/default/files/custom-files/PDF_Files/ELECTRIC_RULES_21.pdf', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/sce-rule-21-g.txt', sha256: '58f8b1bc5e643f056f1182795c1f79f07e7f80b3c0eb517e6e89b876f91d7ea5', vintage: 'Electric Rule 21, sheets 125 to 132 effective February 15, 2023' };

/** Each screen: its letter, process, name, threshold, what it is measured against, who answers, and the sheets. */
export const SCREENS = [
  { id: 'g', capture: 'Screen G', process: 'Initial Review', name: 'Screen G, short-circuit interrupting capability', threshold: 'no distribution protective device or customer equipment above 87.5% of its short-circuit interrupting capability, and no circuit already above it', testBasis: 'the short-circuit interrupting capability of each protective device on the circuit', whoAnswers: 'utility-model', sheets: ['Sheet 145', 'Sheet 125'], numbers: ['87.5'] },
  { id: 'j', capture: 'Screen J', process: 'Initial Review', name: 'Screen J, gross rating of 30 kVA or less', threshold: 'a facility with a gross rating of 30 kVA or less passes and skips Screens K, L, and M', testBasis: 'the facility\'s gross rating', whoAnswers: 'you', sheets: ['Sheet 151', 'Sheet 129'], numbers: ['30 kVA'] },
  { id: 'm-ica', capture: 'Screen M with ICA values', process: 'Initial Review', name: 'Screen M, against the published hosting capacity profiles', threshold: 'the aggregate gross nameplate rating is at most 90% of the lowest value in the ICA-SG 576 profile and at most 90% of the lowest value in the ICA-OF 576 profile', testBasis: 'the utility\'s published Integration Capacity Analysis profiles at the point of interconnection', whoAnswers: 'you', sheets: ['Sheet 153', 'Sheet 130'], numbers: ['90%', 'ICA-SG 576', 'ICA-OF 576'] },
  { id: 'm-peak', capture: 'Screen M without ICA values', process: 'Initial Review', name: 'Screen M, where no hosting capacity values are published', threshold: 'the aggregate generating facility capacity is less than 15% of line section peak load for every line section bounded by automatic sectionalizing devices', testBasis: 'each line section\'s peak load', whoAnswers: 'utility', sheets: ['Sheet 154', 'Sheet 130'], numbers: ['15%'] },
  { id: 'n', capture: 'Screen N', process: 'Supplemental Review', name: 'Screen N, penetration test', threshold: 'with published values, the aggregate gross nameplate rating is at most 100% of the lowest value in the ICA-SG 576 profile', testBasis: 'the utility\'s published ICA-SG 576 profile at the point of interconnection', whoAnswers: 'you', sheets: ['Sheet 155', 'Sheet 132'], numbers: ['100%', 'ICA-SG 576'] },
];

const field = (value, s, disputable = false) => ({ value, disputable, sources: [{ ...PGE, locator: `Rule 21 § G, ${s.capture}, ${s.sheets[0]}` }, { ...SCE, locator: `Rule 21 § G, ${s.capture}, ${s.sheets[1]}` }] });

/** The record for one screen. */
export const record = (id) => {
  const s = SCREENS.find((x) => x.id === id);
  return {
    id: `ca-rule-21-${s.id}`, kind: 'interconnect-screen', jurisdiction: 'CA', lastChecked: '2026-11-16',
    contributor: { name: 'gridprims', conflict: 'none' },
    fields: {
      process: field(s.process, s),
      screen: field(s.name, s),
      threshold: field(s.threshold, s, true),
      testBasis: field(s.testBasis, s),
      whoAnswers: field(s.whoAnswers, s),
    },
  };
};
