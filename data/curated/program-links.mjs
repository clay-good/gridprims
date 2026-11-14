// The program links index (add-program-fact-pages: program links): every
// outside tool, map, dataset, and rule we send people to instead of
// rebuilding, with who maintains it, what it covers, what it costs, why we
// link, and the day we last checked it. The weekly link check reads every URL
// here; an entry unchecked for 12 months shows "needs review". No entry ranks
// or recommends a paid product, and no URL carries a referral or tracking
// parameter (verify/gates/program-links.mjs).
//
// Each URL was opened on its last-checked date. "Blocked" means the site
// refuses automated checks; a person opened it in a browser instead.

/** The questions entries are grouped by, in the order the page shows them. */
export const QUESTIONS = [
  { id: 'connect', title: 'Where can I connect, and what is already queued?' },
  { id: 'design', title: 'How should I size solar, storage, or a backup system?' },
  { id: 'rates', title: 'What does power cost, and what are the rules?' },
  { id: 'data', title: 'Where is the underlying federal data?' },
  { id: 'rules', title: 'Where is the rule text a tool cites?' },
  { id: 'wiring', title: 'What about the wiring inside the building?' },
];

/** @typedef {{id: string, question: string, name: string, maintainer: string, covers: string, cost: 'free' | 'free with an account' | 'paid', costNote?: string, why: string, url: string, lastChecked: string, checkedBy?: 'automated' | 'blocked', notes?: string}} ProgramLink */

/** @type {ProgramLink[]} */
export default [
  {
    id: 'interconnection-fyi', question: 'connect', name: 'Interconnection.fyi', maintainer: 'Interconnection.fyi',
    covers: 'Current status of interconnection queue requests across US grid operators and utilities',
    cost: 'free', costNote: 'Browsing is free; it also sells paid plans.',
    why: 'Live queue status changes daily. We publish LBNL\'s annual snapshot and hand off for today\'s status.',
    url: 'https://www.interconnection.fyi/', lastChecked: '2026-11-14',
  },
  {
    id: 'hosting-capacity-atlas', question: 'connect', name: 'Atlas of Electric Distribution System Hosting Capacity Maps', maintainer: 'U.S. Department of Energy',
    covers: 'Links to the hosting capacity maps utilities and state agencies publish, by state',
    cost: 'free',
    why: 'Feeder headroom is the utility\'s to publish, and some of it is critical infrastructure information. We never estimate it; the atlas lists who publishes a map.',
    url: 'https://www.energy.gov/cmei/vehicles/us-atlas-electric-distribution-system-hosting-capacity-maps', lastChecked: '2026-11-14',
    notes: 'Its summary counts 58 utilities and state agencies with maps in 26 states as of May 2024, and its table shows updates as late as July 2025. Some maps need an account, or an email to the utility.',
  },
  {
    id: 'gridstatus', question: 'connect', name: 'GridStatus', maintainer: 'Grid Status, Inc.',
    covers: 'Live and historical prices, load, and fuel mix from US grid operators',
    cost: 'free', costNote: 'The site is free to browse; its data API has free and paid plans.',
    why: 'Market data in real time needs a live service. We keep a dated copy of EIA\'s hourly data instead.',
    url: 'https://www.gridstatus.io/', lastChecked: '2026-11-14', checkedBy: 'blocked',
  },
  {
    id: 'reopt', question: 'design', name: 'REopt', maintainer: 'National Laboratory of the Rockies (NLR, formerly NREL)',
    covers: 'Cost-optimal sizing and dispatch of solar, storage, and other generation for a site, including resilience',
    cost: 'free',
    why: 'Full optimization is a research-grade model. We give a fast first look on your own file and hand off for the full answer.',
    url: 'https://reopt.nlr.gov/tool', lastChecked: '2026-11-14',
  },
  {
    id: 'nlr-atb', question: 'design', name: 'Annual Technology Baseline', maintainer: 'National Laboratory of the Rockies (NLR)',
    covers: 'Cost and performance projections for generation and storage technologies',
    cost: 'free',
    why: 'The projections are the laboratory\'s, updated each year. Our cost calculators take them as inputs and cite the edition.',
    url: 'https://atb.nlr.gov/', lastChecked: '2026-11-14',
  },
  {
    id: 'urdb', question: 'rates', name: 'Utility Rate Database (OpenEI)', maintainer: 'National Laboratory of the Rockies (NLR)',
    covers: 'Structured electric rates for US utilities, residential through industrial',
    cost: 'free', costNote: 'Its API needs a free key.',
    why: 'Tens of thousands of rates are curated there. We read a dated copy to price bills and link back for each rate\'s record.',
    url: 'https://apps.openei.org/USURDB/', lastChecked: '2026-11-14',
  },
  {
    id: 'dsire', question: 'rates', name: 'DSIRE', maintainer: 'NC Clean Energy Technology Center, North Carolina State University',
    covers: 'State policies and incentives for renewable energy and efficiency, including net metering rules',
    cost: 'free',
    why: 'Rule text changes by state and year. We publish EIA\'s net metering figures and link the rules rather than restate them.',
    url: 'https://programs.dsireusa.org/', lastChecked: '2026-11-14',
  },
  {
    id: 'afdc-fuel-prices', question: 'rates', name: 'Alternative Fuel Price Report', maintainer: 'U.S. Department of Energy, Clean Cities and Communities',
    covers: 'Average retail prices of gasoline, diesel, electricity for vehicles, and alternative fuels, by region',
    cost: 'free',
    why: 'The survey is the department\'s. Our fleet tools cite it as an input and link it for the current edition.',
    url: 'https://afdc.energy.gov/fuels/prices', lastChecked: '2026-11-14',
  },
  {
    id: 'state-commissions', question: 'rates', name: 'State utility commission tariff and docket search', maintainer: 'Each state\'s utility commission',
    covers: 'Approved tariffs, rate cases, and dockets, one search per state',
    cost: 'free',
    why: 'Each commission is the record. Every state page links its commission\'s docket search, and the weekly link check tests each one.',
    url: 'https://gridprims.com/states/', lastChecked: '2026-11-14',
    notes: 'One record per state, in data/curated/regulators.mjs.',
  },
  {
    id: 'eia-gridmonitor', question: 'data', name: 'Hourly Electric Grid Monitor (EIA-930)', maintainer: 'U.S. Energy Information Administration',
    covers: 'Hourly demand, generation by fuel, and interchange for every US balancing authority',
    cost: 'free',
    why: 'The hourly feed is EIA\'s. We keep a dated, cited copy for emissions and rollups, and link the live monitor.',
    url: 'https://www.eia.gov/electricity/gridmonitor/', lastChecked: '2026-11-14',
  },
  {
    id: 'eia-861-files', question: 'data', name: 'Form EIA-861 data files', maintainer: 'U.S. Energy Information Administration',
    covers: 'Annual sales, revenue, customers, net metering, and reliability by utility and state',
    cost: 'free',
    why: 'We publish derived pages and a checksummed copy; the original files stay the record.',
    url: 'https://www.eia.gov/electricity/data/eia861/', lastChecked: '2026-11-14',
  },
  {
    id: 'pudl', question: 'data', name: 'Public Utility Data Liberation (PUDL)', maintainer: 'Catalyst Cooperative',
    covers: 'Cleaned, linked FERC and EIA data, including Form 1 finances and Form 714 peaks',
    cost: 'free',
    why: 'Catalyst does the hard cleaning of FERC\'s filings. We read a pinned release and credit it.',
    url: 'https://catalyst.coop/pudl/', lastChecked: '2026-11-14',
  },
  {
    id: 'epa-power-profiler', question: 'data', name: 'Power Profiler', maintainer: 'U.S. Environmental Protection Agency',
    covers: 'Annual emission rates and fuel mix for the eGRID subregion serving a ZIP code',
    cost: 'free',
    why: 'EPA\'s own eGRID lookup. Our emissions tools use the same rates and link it for comparison.',
    url: 'https://www.epa.gov/egrid/power-profiler', lastChecked: '2026-11-14',
  },
  {
    id: 'eia-conversion-calculators', question: 'data', name: 'Energy conversion calculators', maintainer: 'U.S. Energy Information Administration',
    covers: 'Unit conversions for fuels and electricity at EIA\'s published heat contents',
    cost: 'free',
    why: 'EIA\'s own conversions, which our converter reproduces and cites.',
    url: 'https://www.eia.gov/energyexplained/units-and-calculators/energy-conversion-calculators.php', lastChecked: '2026-11-14',
  },
  {
    id: 'linerate', question: 'data', name: 'linerate', maintainer: 'Statnett (open source, MIT)',
    covers: 'Open implementations of the IEEE 738 and CIGRE conductor rating methods, in Python',
    cost: 'free',
    why: 'For users who want the method in code. Our line rating matches it within 1% on 50 cases.',
    url: 'https://github.com/statnett/linerate', lastChecked: '2026-11-14',
  },
  {
    id: 'eia-861-instructions', question: 'rules', name: 'Form EIA-861 instructions', maintainer: 'U.S. Energy Information Administration',
    covers: 'How utilities must report reliability, sales, and customers, including SAIDI and SAIFI definitions',
    cost: 'free',
    why: 'The reporting rules are EIA\'s. Our reliability tool follows and cites them.',
    url: 'https://www.eia.gov/survey/form/eia_861/instructions.pdf', lastChecked: '2026-11-14',
  },
  {
    id: 'ferc-order-792', question: 'rules', name: 'FERC Order No. 792, small generator interconnection procedures', maintainer: 'Federal Energy Regulatory Commission, in the Federal Register',
    covers: 'The federal Fast Track and supplemental review screens for generators up to 20 MW',
    cost: 'free',
    why: 'The screens are FERC\'s rule. Our interconnection tools cite each section and never stand in for the utility\'s study.',
    url: 'https://www.federalregister.gov/documents/2013/12/05/2013-28515/small-generator-interconnection-agreements-and-procedures', lastChecked: '2026-11-14', checkedBy: 'blocked',
  },
  {
    id: 'ecfr-1-1411', question: 'rules', name: '47 CFR 1.1411, pole attachment make-ready', maintainer: 'Federal Communications Commission, in the eCFR',
    covers: 'Timelines and rules for make-ready work when attaching to utility poles',
    cost: 'free',
    why: 'The rule text is the FCC\'s. Our clearance check links it rather than restating it.',
    url: 'https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-1/subpart-J/section-1.1411', lastChecked: '2026-11-14', checkedBy: 'blocked',
  },
  {
    id: 'cpuc-go95', question: 'rules', name: 'General Order 95, overhead line rules', maintainer: 'California Public Utilities Commission',
    covers: 'California\'s clearances and construction rules for overhead lines',
    cost: 'free',
    why: 'The tables are the CPUC\'s. We keep dated captures of the ones our checks use and watch them weekly.',
    url: 'https://ia.cpuc.ca.gov/gos/go95/go_95_startup_page.html', lastChecked: '2026-11-14',
  },
  {
    id: 'roughlogic', question: 'wiring', name: 'RoughLogic', maintainer: 'gridprims\' sister site',
    covers: 'Building wiring and electrical code calculations: conductor sizing, load calculations, voltage drop',
    cost: 'free',
    why: 'Wiring inside the building is a different trade. We stop at the service and hand off.',
    url: 'https://roughlogic.com/', lastChecked: '2026-11-14',
  },
];
