// Screen thresholds people misquote (add-interconnection-screens 1.4, screen
// explainer "Correct the thresholds people misquote"): what is commonly said,
// what the rule actually contains, and the rule text and vintage read for it.
// Each comes from docs/research/12, where the full-text search behind it is
// recorded; a figure we could not confirm is not listed.

export default [
  {
    id: 'ma-67-percent',
    said: 'Massachusetts screens projects at 67% of minimum load.',
    actual: 'No 67% screen appears in the Massachusetts tariff. Its minimum-load test uses 100% of minimum load.',
    cites: [{ rule: 'National Grid, Standards for Interconnection of Distributed Generation, M.D.P.U. No. 1632 (model tariff approved in D.P.U. 25-48)', vintage: 'effective May 1, 2026', url: 'https://www.mass.gov/doc/iirg-materials-19/download' }],
  },
  {
    id: 'hi-120-percent-dml',
    said: 'Hawaii screens projects at 120% of daytime minimum load.',
    actual: 'Hawaiian Electric\'s Rule 14H has no minimum-load screen. The last practice the commission recorded was a 250% of daytime minimum load study trigger, in 2015.',
    cites: [
      { rule: 'Hawaiian Electric Rule 14, Appendix I (screens), per Order No. 40670, Docket 2019-0323', vintage: 'screen sheets effective April 1, 2024', url: 'https://www.hawaiianelectric.com/documents/billing_and_payment/rates/hawaiian_electric_rules/14.pdf' },
      { rule: 'Hawaii PUC Decision and Order No. 33258, Docket 2014-0192, at 94–95', vintage: 'issued October 12, 2015', url: 'https://www.hawaiianelectric.com/documents/billing_and_payment/rates/hawaiian_electric_rules/14.pdf' },
    ],
  },
  {
    id: 'fallback-30-40',
    said: 'California, Colorado, and Minnesota use 30% of summer peak or 40% of winter peak when minimum load is unknown.',
    actual: 'None of the three has that fallback. Each requires the utility to state why it could not calculate, estimate, or determine minimum load.',
    cites: [
      { rule: 'PG&E Electric Rule No. 21, Section G (screens), Advice Letter 7692-E', vintage: 'effective August 29, 2025', url: 'https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_RULES_21.pdf' },
      { rule: 'Colorado 4 CCR 723-3, Rule 3855(d)(VI) (supplemental review)', vintage: 'effective June 14, 2026', url: 'https://www.sos.state.co.us/CCR/' },
      { rule: 'Minnesota Distributed Energy Resources Interconnection Process (MN DIP) v2.4, Docket E-999/CI-16-521', vintage: 'posted by the PUC April 24, 2025', url: 'https://mn.gov/puc/' },
    ],
  },
  {
    id: 'tx-screen-ladder',
    said: 'Texas has Fast Track screens like the federal ones.',
    actual: 'Texas has no screen ladder. Pre-certified units up to 500 kW that export no more than 15% of a radial feeder\'s total load and add no more than 25% of its maximum short-circuit current pay no study fee.',
    cites: [{ rule: '16 TAC § 25.211(g)(1), Public Utility Commission of Texas', vintage: 'PUCT compilation effective January 5, 2017', url: 'https://ftp.puc.texas.gov/public/puct-info/agency/rulesnlaws/subrules/electric/25.211/25.211.pdf' }],
  },
  {
    id: 'federal-voltage-drop',
    said: 'The federal Fast Track includes a starting voltage drop screen and a penetration test.',
    actual: 'Neither is among the ten federal Fast Track screens. They are state screens: California Rule 21 Screens C, M, and N; Massachusetts Screen 7; New York Screens 3, E, and G; and Hawaii Screen 5.',
    cites: [{ rule: 'FERC pro forma Small Generator Interconnection Procedures, § 2.2.1.1 to § 2.2.1.10', vintage: 'as updated through August 27, 2018', url: 'https://www.ferc.gov/sites/default/files/2020-04/sm-gen-procedures.pdf' }],
  },
];
