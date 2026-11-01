// What gridprims does not and will not compute (site/limitations, "What we
// cannot do, with reasons"). Each entry gives the reason in one plain sentence
// and its sources; `verified: false` marks an absence we could not fully
// confirm. Removing an entry needs a changelog entry saying why.

export default [
  {
    id: 'circuit-model', added: '2026-10-31',
    title: 'Anything that needs a utility\'s model of the circuit',
    detail: 'Fault current, interrupting capability, voltage and power quality, and transient stability.',
    reason: 'These need the utility\'s own circuit model and device ratings, which are not public and are often protected infrastructure information.',
    sources: ['docs/research/12-der-interconnection-screens.md, screens 2.2.1.4, 2.2.1.5, and 2.2.1.9', '18 CFR 388.113(c)(2)'],
    verified: true,
  },
  {
    id: 'nodal-prices', added: '2026-10-31',
    title: 'Nodal or locational prices',
    reason: 'They need the grid operator\'s own network model, which we will not publish, and most operators forbid redistributing their price data.',
    sources: ['docs/research/15-browser-grid-modeling.md §6', 'docs/research/13-governance-and-deferred-items.md, item 13h'],
    verified: true,
  },
  {
    id: 'adequacy', added: '2026-10-31',
    title: 'Resource-adequacy figures',
    detail: 'Loss-of-load expectation, expected unserved energy, or an adequacy verdict. The reliability indices we compute from your own outage log are a different thing.',
    reason: 'Unit-level forced-outage data is confidential, the only freely locatable class averages we found are a 2010 vintage, and one operator\'s otherwise-free feed forbids redistribution.',
    sources: ['docs/research/15-browser-grid-modeling.md §5 (NERC GADS confidential; ISO-NE class averages, 2010 vintage)', 'docs/research/13-governance-and-deferred-items.md, item 13f'],
    verified: false,
    note: 'Whether NERC publishes a current free class-average download could not be confirmed; its pages did not render outside a browser.',
  },
  {
    id: 'unit-commitment', added: '2026-11-01',
    title: 'Unit commitment, or a dispatch that respects start-ups, minimum run times, and ramps',
    detail: 'The scenario model dispatches the cheapest available units hour by hour and says so on every result.',
    reason: 'A year of commitment needs millions of on-off decisions and unit inputs (minimum run, start costs, ramp rates) that are not public, and a solver we would have to ship as third-party code.',
    sources: ['docs/research/15-browser-grid-modeling.md §1 and §1a', 'openspec/changes/add-grid-scenario-model/design.md D1 and D7'],
    verified: true,
  },
  {
    id: 'interconnection-verdict', added: '2026-10-31',
    title: 'A pass or fail interconnection verdict',
    reason: 'Six of the twelve standard screens, including every screen that needs a model of the circuit, cannot be answered from public data.',
    sources: ['docs/research/12-der-interconnection-screens.md, summary'],
    verified: true,
  },
  {
    id: 'professional-advice', added: '2026-10-31',
    title: 'Utility studies, engineering sign-off, or legal, tax, or investment advice',
    reason: 'gridprims gives screening estimates; a utility study, a licensed engineer, or a professional adviser is the final word.',
    sources: ['PRODUCT.md, Capabilities and Constraints'],
    verified: true,
  },
  {
    id: 'real-time', added: '2026-10-31',
    title: 'Real-time or operational grid data',
    reason: 'Live feeds need servers and most operators restrict redistribution; we publish dated snapshots and link to live sources.',
    sources: ['openspec/changes/plan-launch-and-value-proof/design.md D4'],
    verified: true,
  },
  {
    id: 'forecasts', added: '2026-10-31',
    title: 'Forecasts of prices, loads, or peak days',
    reason: 'Public data can describe what happened but cannot support a forecast we would stand behind.',
    sources: ['PRODUCT.md, Capabilities and Constraints'],
    verified: true,
  },
  {
    id: 'protected-infrastructure', added: '2026-10-31',
    title: 'Anything that needs protected infrastructure information',
    reason: 'We publish only public data and never Critical Energy/Electric Infrastructure Information.',
    sources: ['18 CFR 388.113', 'openspec/changes/establish-platform-foundation/specs/platform/data-snapshots/spec.md, CEII screen'],
    verified: true,
  },
  {
    id: 'feeder-or-address', added: '2026-10-31',
    title: 'Feeder-level or address-level results that we publish',
    detail: 'What you compute from your own data on your own device is yours; we do not publish such results.',
    reason: 'Feeder and address detail can identify customers and infrastructure, and the data behind it is not public in most places.',
    sources: ['docs/research/12-der-interconnection-screens.md, minimum-load data'],
    verified: true,
  },
];
