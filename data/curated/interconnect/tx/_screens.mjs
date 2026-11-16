// Texas (add-interconnection-screens 1.2): 16 TAC § 25.211 has no screen ladder; these are the tests the rule
// does set, one record each. Each field cites the PUCT's compilation of the rule. The Texas Secretary of
// State's Administrative Code page, the second primary source, now answers only "Site Has Moved", so it is
// recorded unreachable and the thresholds publish labeled single-source. Files starting with "_" are not
// records themselves.

const PUCT = { type: 'regulator', publisher: 'Public Utility Commission of Texas', url: 'https://ftp.puc.texas.gov/public/puct-info/agency/rulesnlaws/subrules/electric/25.211/25.211.pdf', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/puct-25.211.txt', sha256: 'c3b6ea41180cad322095bba6ac0d64c2e0ad81c9861b23c1d520a27cc4aed2a4', vintage: 'PUCT compilation of 16 TAC § 25.211, effective January 5, 2017 (Project No. 45078)' };
const SOS = { type: 'statute', publisher: 'Texas Secretary of State', url: 'https://texreg.sos.state.tx.us/public/readtac$ext.TacPage?sl=R&app=9&p_dir=&p_rloc=&p_tloc=&p_ploc=&pg=1&p_tac=&ti=16&pt=2&ch=25&rl=211', unreachable: { checked: '2026-11-16', note: 'the Texas Administrative Code page now answers only "Site Has Moved"' } };

/** Each test the rule sets: its subsection, process, name, threshold, what it is measured against, and who answers. */
export const SCREENS = [
  { id: 'g-1', locator: '§ 25.211(g)(1)', process: 'Pre-interconnection study (radial)', name: 'No study fee for small pre-certified units', threshold: 'pre-certified units up to 500 kW that export not more than 15% of the total load on a single radial feeder and contribute not more than 25% of its maximum potential short-circuit current', testBasis: 'the total load on the radial feeder and its maximum potential short-circuit current', whoAnswers: 'utility', numbers: ['500 kW', '15%', '25%'] },
  { id: 'h-1', locator: '§ 25.211(h)(1)', process: 'Network interconnection', name: 'Inverter-based generation on a secondary network', threshold: 'the utility shall approve it unless total distributed generation on the affected feeders, including the new facility, is more than 25% of the total load of the secondary network', testBasis: 'the total load of the secondary network', whoAnswers: 'utility', numbers: ['25%'] },
  { id: 'i', locator: '§ 25.211(i)', process: 'Network interconnection', name: 'No study fee for small inverter systems on a network', threshold: 'no pre-interconnection study fee for a facility with inverter systems under 20 kW', testBasis: 'the facility\'s inverter capacity', whoAnswers: 'you', numbers: ['20 kW'] },
];

const field = (value, s, disputable = false) => ({ value, disputable, sources: [{ ...PUCT, locator: s.locator }, SOS] });

/** The record for one test. */
export const record = (id) => {
  const s = SCREENS.find((x) => x.id === id);
  return {
    id: `tx-25.211-${s.id}`, kind: 'interconnect-screen', jurisdiction: 'TX', lastChecked: '2026-11-16',
    contributor: { name: 'gridprims', conflict: 'none' },
    fields: {
      process: field(s.process, s),
      screen: field(`${s.locator} ${s.name}`, s),
      threshold: field(s.threshold, s, true),
      testBasis: field(s.testBasis, s),
      whoAnswers: field(s.whoAnswers, s),
    },
  };
};
