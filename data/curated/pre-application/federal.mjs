// The federal pre-application report (add-interconnection-screens 5.1), from SGIP § 1.2: what it costs, how
// long the utility has, what the applicant supplies, and what it returns, each cited. FERC's pro forma is the
// one legal issuer of these terms, so they are not disputable; § 1.2 is stored with its checksum.

const SGIP = { type: 'regulator', publisher: 'Federal Energy Regulatory Commission', url: 'https://www.ferc.gov/sites/default/files/2020-04/sm-gen-procedures.pdf', retrieved: '2026-11-16', capture: 'data/curated/captures/interconnect/ferc-sgip-1.2.txt', sha256: 'bd99efd969b599412790ec4a4efa5ab47fa1a94dcfb11e75abe74495becc15e1', vintage: 'pro forma SGIP as updated through August 27, 2018' };
const f = (value, locator) => ({ value, disputable: false, sources: [{ ...SGIP, locator: `SGIP § ${locator}` }] });

export default {
  id: 'federal-pre-application-report', kind: 'pre-application-report', jurisdiction: 'federal', lastChecked: '2026-11-16',
  contributor: { name: 'gridprims', conflict: 'none' },
  fields: {
    fee: f('$300, non-refundable', '1.2.2'),
    days: f('20 business days from the completed request form and the fee', '1.2.2'),
    notAStudy: f('Non-binding; it confers no rights, needs include only existing data, and does not oblige the utility to study the project', '1.2.2 and 1.2.4'),
    supply: f(['Contact information', 'Project location, with nearby cross streets and town', 'Meter number, pole number, or similar for the point of interconnection, if available', 'Generator type', 'Size in AC kW', 'Single- or three-phase configuration', 'Whether it is stand-alone, with no onsite load', 'Whether new service is requested; if not, the account number and the site\'s minimum and maximum loads, if available'], '1.2.2.1 to 1.2.2.8'),
    items: f([
      { n: '1.2.3.1', text: 'Total capacity of the substation, bus, bank, or circuit likely to serve the point of interconnection' },
      { n: '1.2.3.2', text: 'Existing generation on it' },
      { n: '1.2.3.3', text: 'Queued generation on it' },
      { n: '1.2.3.4', text: 'Available capacity: total less existing and queued' },
      { n: '1.2.3.5', text: 'Substation distribution and transmission voltage' },
      { n: '1.2.3.6', text: 'Circuit voltage at the point of interconnection' },
      { n: '1.2.3.7', text: 'Circuit distance from the point of interconnection to the substation' },
      { n: '1.2.3.8', text: 'Line section peak load and minimum load, daytime and absolute, when available' },
      { n: '1.2.3.9', text: 'Protective and voltage-regulating devices between the point and the substation, and whether there is a load tap changer' },
      { n: '1.2.3.10', text: 'Phases available, and the distance to three-phase if single-phase' },
      { n: '1.2.3.11', text: 'Limiting conductor ratings to the substation' },
      { n: '1.2.3.12', text: 'Whether the point is on a spot network, grid network, or radial supply' },
      { n: '1.2.3.13', text: 'Known constraints, such as interrupting capacity, power quality, stability, or capacity' },
    ], '1.2.3.1 to 1.2.3.13'),
  },
};
