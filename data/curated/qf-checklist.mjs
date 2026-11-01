// The qualifying-facility checklist (add-program-fact-pages: qualifying
// facility): what the federal rules say about certifying a small generator as
// a qualifying facility, in plain words, every statement cited to the
// regulation by section with the date we last checked it. It decides nothing:
// the filer and the regulator decide eligibility.

const ECFR = (_part, section) => `https://www.ecfr.gov/current/title-18/section-${section}`;
const ECFR_131 = ECFR(131, '131.80');
const ECFR_381 = ECFR(381, '381.505');
const CHECKED = '2026-11-01'; // eCFR text as of its 2026-10-29 issue

export default {
  checked: CHECKED,
  groups: [
    {
      heading: 'Who it applies to',
      items: [
        { text: 'A small power production facility can be a qualifying facility if it meets the size limit, the fuel-use criteria, and, unless it is exempt, has filed a self-certification or been granted a Commission certification.', cite: { section: '18 CFR 292.203(a)', url: ECFR(292, '292.203') } },
        { text: 'A cogeneration facility can be a qualifying facility if it meets the operating and efficiency standards that apply to it and, unless it is exempt, has filed a self-certification or been granted a Commission certification.', cite: { section: '18 CFR 292.203(b)', url: ECFR(292, '292.203') } },
      ],
    },
    {
      heading: 'Who does not need to file',
      items: [
        { text: 'A facility with a net power production capacity of 1 MW or less is exempt from the filing requirement. It does not need to file a self-certification.', cite: { section: '18 CFR 292.203(d)(1)', url: ECFR(292, '292.203') }, exemption: true },
        { text: 'The Commission may waive the filing requirement for good cause, on a petition for a declaratory order that explains why.', cite: { section: '18 CFR 292.203(d)(2)', url: ECFR(292, '292.203') } },
      ],
    },
    {
      heading: 'The size limit for small power production',
      items: [
        { text: 'A small power production facility\'s capacity, together with other small power production qualifying facilities that use the same energy resource, are owned by the same person or affiliates, and are at the same site, may not exceed 80 MW.', cite: { section: '18 CFR 292.204(a)(1)', url: ECFR(292, '292.204') } },
        { text: 'Affiliated facilities using the same resource within one mile are treated as at the same site. For filings on or after December 31, 2020, those 10 miles or more apart are treated as at separate sites, and those between 1 and 10 miles are presumed separate unless shown otherwise.', cite: { section: '18 CFR 292.204(a)(2)(i)', url: ECFR(292, '292.204') } },
        { text: 'The primary energy source must be biomass, waste, renewable resources, geothermal resources, or a combination, and at least 75% of the total energy input must come from them.', cite: { section: '18 CFR 292.204(b)(1)(i)', url: ECFR(292, '292.204') } },
      ],
    },
    {
      heading: 'Two ways to obtain status',
      items: [
        { text: 'Self-certification: the owner, operator, or a representative completes FERC Form No. 556 and files it. It is effective when filed.', cite: { section: '18 CFR 292.207(a)(1), (a)(3)', url: ECFR(292, '292.207') } },
        { text: 'Commission certification: an application, also on Form No. 556, asking the Commission itself to certify the facility. The Commission acts within 90 days of the latest filing, or the application is deemed granted.', cite: { section: '18 CFR 292.207(b)(1), (b)(3)', url: ECFR(292, '292.207') } },
        { text: 'The regulation attaches a filing fee only to an application for Commission certification: $39,810 for small power production and $40,940 for cogeneration. Self-certification carries no fee in the regulation.', cite: { section: '18 CFR 292.207(b)(1); 18 CFR 381.505(a)', url: ECFR_381 } },
      ],
    },
    {
      heading: 'Filing and notice',
      items: [
        { text: 'Form No. 556 is filed electronically through the Commission\'s eFiling website, on the version of the form then in effect.', cite: { section: '18 CFR 131.80(a), (c)', url: ECFR_131 } },
        { text: 'The filer must serve a copy on each electric utility it expects to interconnect with, sell to, or buy backup or other power from, and on the state regulator of each state where the facility and those utilities are.', cite: { section: '18 CFR 292.207(e)(1)', url: ECFR(292, '292.207') } },
        { text: 'A utility need not buy from a facility of 500 kW or more until 90 days after the facility notifies it that it is a qualifying facility.', cite: { section: '18 CFR 292.207(e)(2)', url: ECFR(292, '292.207') } },
        { text: 'Anyone may protest a self-certification within 30 days of its filing; the Commission acts on a protest within 90 days, with extensions the rule sets out.', cite: { section: '18 CFR 292.207(a)(3), (c)(1)', url: ECFR(292, '292.207') } },
      ],
    },
  ],
  form: { name: 'FERC Form No. 556', url: 'https://www.ferc.gov/docs-filing/forms/form-556/form-556.pdf' },
};
