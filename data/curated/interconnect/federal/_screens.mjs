// The federal Fast Track screens (add-interconnection-screens 1.2), one record per screen, built from this
// list so the ten records cite the same two sources the same way. Each field cites FERC's pro forma SGIP and
// NYISO's FERC-accepted OATT Attachment Z, two independent primary documents whose screen text agrees; both
// captures are stored, and a test finds every threshold's number in both. Files starting with "_" are not
// records themselves.

const FERC = { type: 'regulator', publisher: 'Federal Energy Regulatory Commission', url: 'https://www.ferc.gov/sites/default/files/2020-04/sm-gen-procedures.pdf', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/ferc-sgip-2.2.1.txt', sha256: '8e64d178d495be164398043f1302ad39530aabff87bd617f3759ba647f44fbbe', vintage: 'pro forma SGIP as updated through August 27, 2018 (Orders No. 2006, 2006-A, and 792)' };
const NYISO = { type: 'tariff', publisher: 'New York Independent System Operator', url: 'https://nyisoviewer.etariff.biz/ViewerDocLibrary/MasterTariffs/9TariffSections/427.htm', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/nyiso-oatt-32.2.2.1.txt', sha256: '80c29c530e5e191c7ece8f1c40a96bcf1283ada55c0730ec38da4f0a92fbb0cf', vintage: 'OATT Attachment Z section 32.2, effective December 5, 2014, Docket ER14-2573-001' };

/** Every screen: its section, name, threshold, what the threshold is measured against, and who can answer it. */
export const SCREENS = [
  { n: 1, name: 'The point of interconnection is on the utility\'s tariffed distribution system', threshold: 'yes or no', testBasis: 'where the utility\'s distribution system ends', whoAnswers: 'utility' },
  { n: 2, name: 'Generation on the line section', threshold: 'at most 15% of the line section\'s annual peak load', testBasis: 'the line section\'s annual peak load, as most recently measured at the substation', whoAnswers: 'utility', numbers: ['15%'] },
  { n: 3, name: 'Load side of a spot network protector', threshold: 'inverter-based, and at most 5% of the spot network\'s maximum load or 50 kW, whichever is smaller', testBasis: 'the spot network\'s maximum load', whoAnswers: 'utility', numbers: ['5%', '50 kW'] },
  { n: 4, name: 'Fault current contribution', threshold: 'at most 10% of the circuit\'s maximum fault current', testBasis: 'the distribution circuit\'s maximum fault current at the point on the high-voltage (primary) level nearest the proposed point of interconnection', whoAnswers: 'utility-model', numbers: ['10%'] },
  { n: 5, name: 'Interrupting capability', threshold: 'no protective device or customer equipment above 87.5% of its short-circuit interrupting capability, and no circuit already above it', testBasis: 'the short-circuit interrupting capability of each distribution protective device and the customer\'s equipment', whoAnswers: 'utility-model', numbers: ['87.5%'] },
  { n: 6, name: 'Line configuration and grounding', threshold: 'on a three-phase three-wire line, a three-phase or single-phase phase-to-phase connection; on a three-phase four-wire line, an effectively grounded three-phase or single-phase line-to-neutral connection', testBasis: 'the primary line\'s configuration and the type of interconnection', whoAnswers: 'you' },
  { n: 7, name: 'Shared single-phase secondary', threshold: 'at most 20 kW of generation on the shared secondary', testBasis: 'the aggregate generation capacity on the shared single-phase secondary, including the proposed facility', whoAnswers: 'you', numbers: ['20 kW'] },
  { n: 8, name: 'Imbalance on a 240 V center-tap service', threshold: 'an imbalance of at most 20% of the service transformer\'s nameplate rating', testBasis: 'the nameplate rating of the service transformer', whoAnswers: 'you', numbers: ['20%'] },
  { n: 9, name: 'Transient stability', threshold: 'at most 10 MW on the transmission side of the substation transformer, where transient stability limits are known', testBasis: 'generation interconnected to the transmission side of the substation transformer feeding the circuit', whoAnswers: 'utility-model', numbers: ['10 MW'] },
  { n: 10, name: 'No utility construction', threshold: 'no construction of facilities on the transmission provider\'s own system is needed', testBasis: 'the transmission provider\'s design of the interconnection', whoAnswers: 'utility' },
];

const cite = (n) => [{ ...FERC, locator: `SGIP § 2.2.1.${n}` }, { ...NYISO, locator: `OATT Attachment Z § 32.2.2.1.${n}` }];
const field = (value, n, disputable = false) => ({ value, disputable, sources: cite(n) });

/** The record for one screen. */
export const record = (n) => {
  const s = SCREENS[n - 1];
  return {
    id: `federal-fast-track-2.2.1.${n}`, kind: 'interconnect-screen', jurisdiction: 'federal', lastChecked: '2026-11-16',
    contributor: { name: 'gridprims', conflict: 'none' },
    fields: {
      process: field('Fast Track', n),
      screen: field(`§ 2.2.1.${n} ${s.name}`, n),
      // Thresholds are the disputed values, so they need both independent primary sources.
      threshold: field(s.threshold, n, true),
      testBasis: field(s.testBasis, n),
      whoAnswers: field(s.whoAnswers, n),
    },
  };
};
