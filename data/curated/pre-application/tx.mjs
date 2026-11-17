// Texas has no pre-application report (add-interconnection-screens 5.1, scenario "No such report"): 16 TAC
// § 25.211 provides a pre-interconnection study instead, with no fee for small pre-certified units. Cited to
// the PUCT's compilation, with the Secretary of State's copy recorded unreachable.

const PUCT = { type: 'regulator', publisher: 'Public Utility Commission of Texas', url: 'https://ftp.puc.texas.gov/public/puct-info/agency/rulesnlaws/subrules/electric/25.211/25.211.pdf', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/puct-25.211.txt', sha256: 'c3b6ea41180cad322095bba6ac0d64c2e0ad81c9861b23c1d520a27cc4aed2a4', vintage: 'PUCT compilation of 16 TAC § 25.211, effective January 5, 2017 (Project No. 45078)' };
const SOS = { type: 'statute', publisher: 'Texas Secretary of State', url: 'https://texreg.sos.state.tx.us/public/readtac$ext.TacPage?sl=R&app=9&p_dir=&p_rloc=&p_tloc=&p_ploc=&pg=1&p_tac=&ti=16&pt=2&ch=25&rl=211', unreachable: { checked: '2026-11-16', note: 'the Texas Administrative Code page now answers only "Site Has Moved"' } };

export default {
  id: 'tx-pre-application-report', kind: 'pre-application-report', jurisdiction: 'TX', lastChecked: '2026-11-16',
  contributor: { name: 'gridprims', conflict: 'none' },
  none: true,
  fields: {
    requestPath: { value: 'No pre-application report. The rule provides a pre-interconnection study, and a utility may not charge for one for pre-certified units up to 500 kW that export no more than 15% of a radial feeder\'s load and add no more than 25% of its short-circuit current.', disputable: true, sources: [{ ...PUCT, locator: '16 TAC § 25.211(g)(1)' }, SOS] },
  },
};
